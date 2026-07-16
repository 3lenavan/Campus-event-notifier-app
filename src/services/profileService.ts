import { User } from "firebase/auth";
import {
  DEMO_CLUBS,
  getDemoProfile,
  saveDemoProfile,
} from "../../data/demoData";
import { isDemoMode, supabase } from "../../data/supabaseClient";
import { ADMIN_EMAILS } from "../lib/constants";
import { sha256 } from "../lib/hash";
import { Club, UserProfile } from "../types";

/**
 * Load user profile from Supabase
 */
export const getProfile = async (uid: string): Promise<UserProfile | null> => {
  if (isDemoMode) {
    return getDemoProfile(uid);
  }

  try {
    // Load basic profile
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();

    if (profileError) {
      console.error("Error loading profile:", profileError);
      return null;
    }

    if (!profileData) return null;

    // Load memberships from join: clubs_users → clubs
    const { data: membershipsData, error: membershipError } = await supabase
      .from("clubs_users")
      .select("clubs(slug)")
      .eq("user_id", uid);

    if (membershipError) {
      console.error("Error loading memberships:", membershipError);
      return null;
    }

    const memberships =
      membershipsData?.map((row: any) => row.clubs?.slug).filter(Boolean) || [];

    // Final user profile object
    return {
  uid: profileData.uid,
  name: profileData.name,
  email: profileData.email,
  role: profileData.role || "student",
  isAdmin: profileData.is_admin || false,
  memberships, // <-- actual memberships loaded from clubs_users
  activityVisible: profileData.activity_visible || false,
};

  } catch (err) {
    console.error("getProfile unexpected error:", err);
    return null;
  }
};

/**
 * Create/update profile when user logs in
 */
export const upsertProfileFromAuth = async (
  user: User
): Promise<UserProfile> => {
  const emailNormalized = (user.email || "").trim().toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(emailNormalized);

  const profile = {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Unknown User",
    email: emailNormalized,
    role: "student",
    is_admin: isAdmin,
    updated_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    const existing = await getDemoProfile(user.uid);
    return saveDemoProfile({
      uid: user.uid,
      name: profile.name,
      email: profile.email,
      role: existing?.role || "student",
      isAdmin,
      memberships: existing?.memberships || [],
      activityVisible: existing?.activityVisible || false,
    });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile, { onConflict: "uid" })
    .select()
    .single();

  if (error) {
    console.error("Error upserting profile:", error);
    throw error;
  }

  // Return minimal profile (memberships will be refreshed via getProfile)
  return {
    uid: data.uid,
    name: data.name,
    email: data.email,
    role: data.role || "student",
    isAdmin: data.is_admin || false,
    memberships: [], // <-- temporarily empty; getProfile() fills it
    activityVisible: data.activity_visible || false,
  };
};

/**
 * Toggle whether this user's RSVPs/likes are visible to followers in the activity feed.
 * Opt-in, defaults to false — see the activity_visible migration for rationale.
 */
export const updateActivityVisibility = async (uid: string, visible: boolean): Promise<void> => {
  if (isDemoMode) {
    const existing = await getDemoProfile(uid);
    if (existing) {
      await saveDemoProfile({ ...existing, activityVisible: visible });
    }
    return;
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ activity_visible: visible })
    .eq("uid", uid);

  if (error) {
    console.error("Error updating activity visibility:", error);
    throw error;
  }
};

/**
 * Verify club membership using slug + hashed code
 */
export const verifyClubMembership = async (
  uid: string,
  clubSlug: string,
  codePlaintext: string
): Promise<{ success: boolean; message: string; club?: Club }> => {
  try {
    if (isDemoMode) {
      const normalizedSlug = clubSlug.trim().toLowerCase();
      const normalizedCode = codePlaintext.trim().toUpperCase();
      const demoClub = DEMO_CLUBS.find(
        (club) =>
          club.slug === normalizedSlug &&
          club.verificationCode.toUpperCase() === normalizedCode
      );

      if (!demoClub) {
        return { success: false, message: "Invalid club or code." };
      }

      const existing = await getDemoProfile(uid);
      if (!existing) {
        return { success: false, message: "Please sign in again and retry." };
      }

      const memberships = new Set(existing.memberships);
      memberships.add(demoClub.slug);
      await saveDemoProfile({
        ...existing,
        role: "member",
        memberships: [...memberships],
      });

      return {
        success: true,
        message: `Successfully joined ${demoClub.name}.`,
        club: {
          id: String(demoClub.id),
          slug: demoClub.slug,
          name: demoClub.name,
          category: demoClub.category,
          verification_code: demoClub.verificationCode,
          code_hash: demoClub.codeHash,
          image_url: demoClub.imageUrl,
          created_at: demoClub.createdAt,
        },
      };
    }

    console.log("📌 VERIFY INPUT:");
    console.log("clubSlug =", clubSlug);
    console.log("codePlaintext =", codePlaintext);

    // Normalize slug
    const normalizedSlug = clubSlug.trim().toLowerCase();

    // Hash verification code
    const hashedCode = await sha256(codePlaintext);

    // Find matching club
    const { data: clubs, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("slug", normalizedSlug)
      .eq("code_hash", hashedCode)
      .limit(1);

    console.log("📦 DB RESULT clubs =", clubs);

    if (error) {
      console.error("verifyClubMembership error:", error);
      return { success: false, message: "Verification failed." };
    }

    if (!clubs || clubs.length === 0) {
      console.log("❌ No matching club for slug + hash");
      return { success: false, message: "Invalid club or code." };
    }

    const club = clubs[0];

    // Check if the user is already a member
    const { data: existing } = await supabase
      .from("clubs_users")
      .select("id")
      .eq("user_id", uid)
      .eq("club_id", club.id)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        message: "Already a member of this club.",
        club,
      };
    }

    // Insert membership
    const { error: insertError } = await supabase
      .from("clubs_users")
      .insert([{ user_id: uid, club_id: club.id }]);

    if (insertError) {
      return { success: false, message: "Could not save membership." };
    }

    return {
      success: true,
      message: `Successfully joined ${club.name}.`,
      club,
    };
  } catch (err) {
    console.error("verifyClubMembership unexpected error:", err);
    return { success: false, message: "Unexpected error occurred." };
  }
};

/**
 * Check club membership via clubs_users
 */
export const isClubMember = async (
  uid: string,
  clubId: number
): Promise<boolean> => {
  if (isDemoMode) {
    const profile = await getDemoProfile(uid);
    const club = DEMO_CLUBS.find((item) => item.id === clubId);
    return Boolean(profile && club && profile.memberships.includes(club.slug));
  }

  try {
    const { data } = await supabase
      .from("clubs_users")
      .select("id")
      .eq("user_id", uid)
      .eq("club_id", clubId)
      .maybeSingle();

    return !!data;
  } catch (err) {
    console.error("isClubMember error:", err);
    return false;
  }
};
