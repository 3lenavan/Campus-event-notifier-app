import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuthUser } from "../../src/hooks/useAuthUser";
import { getProfile } from "../../src/services/profileService";
import { followUser, isFollowing as checkIsFollowing, unfollowUser } from "../../src/services/friendsService";
import { getUserRSVPdEvents } from "../../src/services/interactionsService";
import { getEventsByIds } from "../../src/services/eventsService";
import { useAppTheme, LightThemeColors } from "../../src/ThemeContext";
import type { Event, UserProfile } from "../../src/types";

export default function UserProfileScreen() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const loadedProfile = await getProfile(uid);
      setProfile(loadedProfile);
      setFollowing(await checkIsFollowing(user?.uid, uid));

      if (loadedProfile?.activityVisible) {
        const rsvpIds = await getUserRSVPdEvents(uid);
        setEvents(await getEventsByIds(rsvpIds));
      } else {
        setEvents([]);
      }

      setLoading(false);
    };

    load();
  }, [uid, user?.uid]);

  const toggleFollow = async () => {
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    try {
      if (wasFollowing) await unfollowUser(user?.uid, uid);
      else await followUser(user?.uid, uid);
    } catch (error) {
      console.error("Error toggling follow:", error);
      setFollowing(wasFollowing);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Student not found.</Text>
      </View>
    );
  }

  const isSelf = user?.uid === uid;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{profile.name}</Text>

        {profile.memberships.length > 0 && (
          <View style={styles.membershipRow}>
            {profile.memberships.map((slug) => (
              <View key={slug} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.subtitle }]}>{slug}</Text>
              </View>
            ))}
          </View>
        )}

        {!isSelf && (
          <Pressable
            onPress={toggleFollow}
            style={[
              styles.followButton,
              { backgroundColor: following ? colors.card : colors.primary, borderColor: colors.border, borderWidth: following ? 1 : 0 },
            ]}
          >
            <Text style={[styles.followButtonText, { color: following ? colors.text : "#FFFFFF" }]}>
              {following ? "Following" : "Follow"}
            </Text>
          </Pressable>
        )}
      </View>

      {profile.activityVisible ? (
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<Text style={[styles.sectionTitle, { color: colors.text }]}>Going to</Text>}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.subtitle }]}>No upcoming RSVPs.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/event-details-screen", params: { id: item.id } })}
              style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text numberOfLines={1} style={[styles.eventTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.eventLocation, { color: colors.subtitle }]}>{item.location}</Text>
            </Pressable>
          )}
        />
      ) : (
        <Text style={[styles.emptyText, { color: colors.subtitle }]}>This student's activity is private.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  backButton: { width: 36, height: 36, justifyContent: "center" },
  profileHeader: { alignItems: "center", padding: 20, gap: 10 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800" },
  membershipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  followButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, marginTop: 6 },
  followButtonText: { fontSize: 15, fontWeight: "700" },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  eventRow: { padding: 14, borderRadius: 8, borderWidth: 1, gap: 4 },
  eventTitle: { fontSize: 15, fontWeight: "700" },
  eventLocation: { fontSize: 13 },
  emptyText: { textAlign: "center", marginTop: 30, fontSize: 14 },
});
