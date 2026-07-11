import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthUser } from "../../src/hooks/useAuthUser";
import { listApprovedEvents } from "../../src/services/eventsService";
import { listClubs } from "../../src/services/clubsService";
import {
  getEventsInteractions,
  toggleFavorite as toggleFavoriteService,
  toggleLike as toggleLikeService,
} from "../../src/services/interactionsService";
import EventCard, { Event as BaseEvent } from "../event-card";
import { useAppTheme, LightThemeColors } from "../../src/ThemeContext";
import { HoneycombBackground } from "../../src/components";

type FeedEvent = BaseEvent & {
  likes: number;
  liked: boolean;
  favorited: boolean;
  club: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
};

export default function HomeScreen() {
  const { user, profile } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  useEffect(() => {
    const unsub = getAuth().onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/");
      }
    });
    return () => unsub();
  }, []);

  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadApproved = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        console.log("🔄 Loading approved events...", { forceRefresh });
        const approved = await listApprovedEvents(forceRefresh);
        console.log("📋 Loaded events:", approved.length, approved);
        const clubs = await listClubs();

        // Get current date/time to filter out past events
        const now = new Date();
        console.log("⏰ Current time:", now.toISOString());

        // Debug: Log all approved events before filtering
        console.log(
          "📅 Approved events before date filter:",
          approved.map((e) => ({
            id: e.id,
            title: e.title,
            dateISO: e.dateISO,
            status: e.status,
          }))
        );
        console.log("⏰ Current time for filtering:", now.toISOString());

        const eventsMapped: FeedEvent[] = approved
          .filter((event) => {
            const eventDate = new Date(event.dateISO);
            const isFuture = eventDate > now;

            if (!isFuture) {
              console.log(
                "⏭️ Filtered out past event:",
                event.title,
                eventDate.toISOString(),
                "vs",
                now.toISOString()
              );
            } else {
              console.log("✅ Keeping future event:", event.title, eventDate.toISOString());
            }
            return isFuture;
          })
          .map((event) => {
            const eventDate = new Date(event.dateISO);

            return {
              id: event.id,
              title: event.title,
              description: event.description,

              // ✅ KEEP the original ISO (don’t force UTC with toISOString())
              // This prevents the “Dec 15 vs Dec 14” mismatch.
              date: event.dateISO,

              // ✅ Time formatted from the same ISO source
              time: eventDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),

              location: event.location,
              category: "Club Event",
              attendees: event.attendees || 0,
              maxAttendees: undefined,
              imageUrl: event.imageUrl,
              isUserAttending: false,

              likes: 0,
              liked: false,
              favorited: false,

              club: {
                id: event.clubId,
                name: clubs.find((c: any) => c.id === event.clubId)?.name || "Unknown Club",
              },
            };
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Load likes and favorites if user is logged in
        if (user?.uid) {
          const eventIds = eventsMapped.map((e) => e.id);
          const interactions = await getEventsInteractions(user.uid, eventIds);

          eventsMapped.forEach((event) => {
            event.liked = interactions.likedEvents.has(event.id);
            event.favorited = interactions.favoritedEvents.has(event.id);
            event.likes = interactions.likeCounts[event.id] || 0;
          });
        }

        console.log("✅ Setting events:", eventsMapped.length);
        setEvents(eventsMapped);
      } catch (e) {
        console.error("❌ Error loading approved events:", e);
      }
    },
    [user]
  );

  useEffect(() => {
    loadApproved(true);
  }, [loadApproved]);

  const onPressEvent = useCallback((event: BaseEvent) => {
    router.push({ pathname: "/event-details-screen", params: { id: event.id } });
  }, []);

  const toggleLike = useCallback(
    async (eventId: string) => {
      if (!user?.uid) {
        alert("Please log in to like events.");
        return;
      }

      try {
        // Optimistically update UI
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id === eventId) {
              const newLiked = !e.liked;
              return {
                ...e,
                liked: newLiked,
                likes: e.likes + (newLiked ? 1 : -1),
              };
            }
            return e;
          })
        );

        await toggleLikeService(user.uid, eventId);

        // Reload to get accurate like count
        const interactions = await getEventsInteractions(user.uid, [eventId]);
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  liked: interactions.likedEvents.has(eventId),
                  likes: interactions.likeCounts[eventId] || 0,
                }
              : e
          )
        );
      } catch (error) {
        console.error("Error toggling like:", error);

        // Revert optimistic update on error
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, liked: !e.liked, likes: e.likes + (e.liked ? 1 : -1) }
              : e
          )
        );

        alert("Failed to update like. Please try again.");
      }
    },
    [user]
  );

  const toggleFavorite = useCallback(
    async (eventId: string) => {
      if (!user?.uid) {
        alert("Please log in to favorite events.");
        return;
      }

      try {
        // Optimistically update UI
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, favorited: !e.favorited } : e))
        );

        await toggleFavoriteService(user.uid, eventId);

        // Reload to ensure consistency
        const interactions = await getEventsInteractions(user.uid, [eventId]);
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, favorited: interactions.favoritedEvents.has(eventId) }
              : e
          )
        );
      } catch (error) {
        console.error("Error toggling favorite:", error);

        // Revert optimistic update on error
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, favorited: !e.favorited } : e))
        );

        alert("Failed to update favorite. Please try again.");
      }
    },
    [user]
  );

  const toggleRSVP = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              isUserAttending: !e.isUserAttending,
              attendees: (e.attendees ?? 0) + (e.isUserAttending ? -1 : 1),
            }
          : e
      )
    );
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadApproved(true).finally(() => setRefreshing(false));
  }, [loadApproved]);

  // Force refresh when screen is focused (important for newly created events)
  useFocusEffect(
    useCallback(() => {
      console.log("👁️ Home screen focused, refreshing events...");
      const timer = setTimeout(() => {
        console.log("🔄 Executing delayed refresh...");
        loadApproved(true);
      }, 600);

      return () => {
        console.log("🧹 Cleaning up focus effect timer");
        clearTimeout(timer);
      };
    }, [loadApproved])
  );

  const getUserGreeting = () => {
    if (!profile?.name && !user?.displayName) {
      return "Hello";
    }
    const name = profile?.name || user?.displayName || "";
    const firstName = name.split(" ")[0];
    return `Hello, ${firstName}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <HoneycombBackground />
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: isDark ? colors.card : colors.nectar, borderColor: colors.border }]}>
            <View>
              <View style={styles.kickerRow}>
                <Ionicons name="radio-outline" size={16} color={colors.primary} />
                <Text style={[styles.kicker, { color: colors.primary }]}>Hive Feed</Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{getUserGreeting()}</Text>
              <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>Fresh campus buzz, sorted by what is coming up next.</Text>
            </View>
            {user && (
              <View style={[styles.avatar, { backgroundColor: colors.accent, borderColor: colors.secondary }]}>
                <Text style={styles.avatarText}>
                  {(profile?.name || user?.displayName || user?.email || "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={onPressEvent}
            onRSVP={toggleRSVP}
            onLike={toggleLike}
            onFavorite={toggleFavorite}
            liked={item.liked}
            favorited={item.favorited}
            likesCount={item.likes}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.text }]}>No events available</Text>
            <Text style={[styles.emptySubtext, { color: colors.subtitle }]}>Check back later for new events</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 120, alignItems: "stretch" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: 250,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FBBF24",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
