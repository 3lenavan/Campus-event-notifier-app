import AsyncStorage from "@react-native-async-storage/async-storage";
import { isDemoMode, supabase } from "../../data/supabaseClient";

const keyForUser = (userId?: string | null) => `buzzup:followed-clubs:${userId || "guest"}`;

export async function getFollowedClubIds(userId?: string | null): Promise<Set<string>> {
  if (!userId) return new Set<string>();
  if (!isDemoMode) {
    const { data, error } = await supabase.from("club_follows").select("club_id").eq("user_uid", userId);
    if (error) throw error;
    return new Set((data || []).map((row: { club_id: string | number }) => String(row.club_id)));
  }
  try {
    const raw = await AsyncStorage.getItem(keyForUser(userId));
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

export async function toggleClubFollow(userId: string | null | undefined, clubId: string) {
  if (!userId) throw new Error("AUTH_REQUIRED");
  const followed = await getFollowedClubIds(userId);
  const isFollowing = followed.has(clubId);

  if (!isDemoMode) {
    const query = isFollowing
      ? supabase.from("club_follows").delete().eq("user_uid", userId).eq("club_id", clubId)
      : supabase.from("club_follows").upsert({ user_uid: userId, club_id: Number(clubId) }, { onConflict: "user_uid,club_id" });
    const { error } = await query;
    if (error) throw error;
  } else {
    if (isFollowing) followed.delete(clubId);
    else followed.add(clubId);
    await AsyncStorage.setItem(keyForUser(userId), JSON.stringify([...followed]));
  }

  if (!isDemoMode) {
    if (isFollowing) followed.delete(clubId);
    else followed.add(clubId);
  }
  return followed;
}
