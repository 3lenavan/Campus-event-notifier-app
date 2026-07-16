import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEMO_USERS } from "../../data/demoData";
import { isDemoMode, supabase } from "../../data/supabaseClient";

const keyForUser = (userId?: string | null) => `buzzup:following:${userId || "guest"}`;

export interface FoundUser {
  uid: string;
  name: string;
}

export async function getFollowing(userId?: string | null): Promise<Set<string>> {
  if (!userId) return new Set<string>();

  if (!isDemoMode) {
    const { data, error } = await supabase.from("user_follows").select("followee_uid").eq("follower_uid", userId);
    if (error) throw error;
    return new Set((data || []).map((row: { followee_uid: string }) => row.followee_uid));
  }

  try {
    const raw = await AsyncStorage.getItem(keyForUser(userId));
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

// Demo mode only ever has one real logged-in user on-device — there's no way to
// simulate other demo users following them back.
export async function getFollowers(userId: string): Promise<string[]> {
  if (isDemoMode) return [];

  const { data, error } = await supabase.from("user_follows").select("follower_uid").eq("followee_uid", userId);
  if (error) throw error;
  return (data || []).map((row: { follower_uid: string }) => row.follower_uid);
}

export async function isFollowing(userId: string | null | undefined, targetUid: string): Promise<boolean> {
  const following = await getFollowing(userId);
  return following.has(targetUid);
}

export async function followUser(userId: string | null | undefined, targetUid: string): Promise<Set<string>> {
  if (!userId) throw new Error("AUTH_REQUIRED");
  if (userId === targetUid) throw new Error("CANNOT_FOLLOW_SELF");

  const following = await getFollowing(userId);

  if (!isDemoMode) {
    const { error } = await supabase
      .from("user_follows")
      .upsert({ follower_uid: userId, followee_uid: targetUid }, { onConflict: "follower_uid,followee_uid" });
    if (error) throw error;
  }

  following.add(targetUid);
  if (isDemoMode) {
    await AsyncStorage.setItem(keyForUser(userId), JSON.stringify([...following]));
  }
  return following;
}

export async function unfollowUser(userId: string | null | undefined, targetUid: string): Promise<Set<string>> {
  if (!userId) throw new Error("AUTH_REQUIRED");

  const following = await getFollowing(userId);

  if (!isDemoMode) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_uid", userId)
      .eq("followee_uid", targetUid);
    if (error) throw error;
  }

  following.delete(targetUid);
  if (isDemoMode) {
    await AsyncStorage.setItem(keyForUser(userId), JSON.stringify([...following]));
  }
  return following;
}

/**
 * Search for other students by name. Deliberately selects only uid/name — never
 * email or any other profile field — regardless of what row-level access the
 * anon key has on user_profiles.
 */
export async function searchUsers(query: string, excludeUid?: string | null): Promise<FoundUser[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  if (isDemoMode) {
    return DEMO_USERS.filter(
      (user) => user.uid !== excludeUid && user.name.toLowerCase().includes(normalized)
    );
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("uid, name")
    .ilike("name", `%${query.trim()}%`)
    .limit(20);

  if (error) {
    console.error("Error searching users:", error);
    return [];
  }

  return (data || [])
    .filter((row: FoundUser) => row.uid !== excludeUid)
    .map((row: FoundUser) => ({ uid: row.uid, name: row.name }));
}
