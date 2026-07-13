import AsyncStorage from "@react-native-async-storage/async-storage";

const keyForUser = (userId?: string | null) => `buzzup:followed-clubs:${userId || "guest"}`;

export async function getFollowedClubIds(userId?: string | null): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(keyForUser(userId));
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

export async function toggleClubFollow(userId: string | null | undefined, clubId: string) {
  const followed = await getFollowedClubIds(userId);
  if (followed.has(clubId)) followed.delete(clubId);
  else followed.add(clubId);
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify([...followed]));
  return followed;
}
