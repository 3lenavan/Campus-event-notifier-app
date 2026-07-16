import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuthUser } from "../src/hooks/useAuthUser";
import { followUser, FoundUser, getFollowing, searchUsers, unfollowUser } from "../src/services/friendsService";
import { SearchBar } from "../src/components/buzzup-ui";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";

export default function FriendsSearch() {
  const { user } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    getFollowing(user?.uid).then(setFollowing);
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    searchUsers(query, user?.uid).then((found) => {
      if (active) setResults(found);
    });
    return () => {
      active = false;
    };
  }, [query, user?.uid]);

  const toggleFollow = async (targetUid: string) => {
    const isFollowing = following.has(targetUid);
    setFollowing((current) => {
      const next = new Set(current);
      if (isFollowing) next.delete(targetUid);
      else next.add(targetUid);
      return next;
    });

    try {
      const updated = isFollowing ? await unfollowUser(user?.uid, targetUid) : await followUser(user?.uid, targetUid);
      setFollowing(updated);
    } catch (error) {
      console.error("Error toggling follow:", error);
      setFollowing(await getFollowing(user?.uid));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchWrapper}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search students by name" />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          query.trim() ? (
            <Text style={[styles.emptyText, { color: colors.subtitle }]}>No students found.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isFollowing = following.has(item.uid);
          return (
            <Pressable
              onPress={() => router.push({ pathname: "/user-profile/[uid]", params: { uid: item.uid } })}
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  toggleFollow(item.uid);
                }}
                style={[
                  styles.followButton,
                  { backgroundColor: isFollowing ? colors.card : colors.primary, borderColor: colors.border, borderWidth: isFollowing ? 1 : 0 },
                ]}
              >
                <Text style={[styles.followButtonText, { color: isFollowing ? colors.text : "#FFFFFF" }]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  name: { fontSize: 16, fontWeight: "600" },
  followButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  followButtonText: { fontSize: 14, fontWeight: "700" },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
