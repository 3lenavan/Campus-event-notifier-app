import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Club, getClubByIdSupabase } from "../data/dataLoader";
import { useAuthUser } from "../src/hooks/useAuthUser";
import { listClubEvents } from "../src/services/eventsService";
import { getEventsInteractions } from "../src/services/interactionsService";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";
import { HoneycombBackground } from "../src/components";

export default function ClubDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const numericId = Number(id);
    const c = await getClubByIdSupabase(numericId);
    setClub(c);
    
    // Load events using the events service
    const clubEvents = await listClubEvents(id);

    // 🔍 DEBUG #1 — Raw events coming directly from Supabase
    console.log("🔍 ClubDetails → RAW clubEvents from listClubEvents():", clubEvents);

    // Transform events for display
    const transformedEvents = clubEvents
      .map((event) => {
        const date = new Date(event.dateISO);

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          dateISO: event.dateISO,
          date: date,
          formattedDate: date.toLocaleDateString("en-US", { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
          time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
          location: event.location,
          category: club?.category || "Club Event",
          imageUrl: event.imageUrl,
        };
      })
      .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

    // 🔍 DEBUG #2 — After transform (formattedDate, etc.)
    console.log("🔍 ClubDetails → TRANSFORMED events:", transformedEvents);

    // Load interactions if user is logged in
    if (user?.uid && transformedEvents.length > 0) {
      const eventIds = transformedEvents.map(e => e.id);
      const interactions = await getEventsInteractions(user.uid, eventIds);
      
      transformedEvents.forEach(event => {
        (event as any).liked = interactions.likedEvents.has(event.id);
        (event as any).favorited = interactions.favoritedEvents.has(event.id);
        (event as any).likes = interactions.likeCounts[event.id] || 0;
      });
    }

    setEvents(transformedEvents);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getCategoryColor = (category: string) => {
  const normalized = (category ?? "").trim();

  const colors: Record<string, string> = {
    Academic: "#3B82F6",
    Social: "#8B5CF6",
    Sports: "#22C55E",
    Arts: "#EC4899",
    Career: "#F97316",
    Special: "#FACC15",
    Other: "#6B7280",
  };

  return colors[normalized] || colors.Other;
};

  const handleEventPress = (event: any) => {
    router.push({ pathname: "/event-details-screen", params: { id: event.id } });
  };

  // Separate events into upcoming and past
  const now = new Date();
  now.setMilliseconds(0);
  
  const upcomingEvents = events.filter(event => {
    if (!event.dateISO) return false;
    try {
      const eventDate = new Date(event.dateISO);
      if (isNaN(eventDate.getTime())) return false;
      return eventDate.getTime() >= now.getTime();
    } catch (e) {
      console.error('Error parsing event date:', event.dateISO, e);
      return false;
    }
  });
  
  const pastEvents = events.filter(event => {
    if (!event.dateISO) return false;
    try {
      const eventDate = new Date(event.dateISO);
      if (isNaN(eventDate.getTime())) return false;
      return eventDate.getTime() < now.getTime();
    } catch (e) {
      console.error('Error parsing event date:', event.dateISO, e);
      return false;
    }
  }).reverse();
  
  // Debug: Log event counts
  console.log('=== Event Filtering Debug ===');
  console.log('Total events:', events.length);
  console.log('Upcoming events:', upcomingEvents.length);
  console.log('Past events:', pastEvents.length);
  console.log('Current time:', now.toISOString());
  if (events.length > 0) {
    console.log('Sample event dateISO:', events[0].dateISO);
    console.log('Sample event parsed date:', new Date(events[0].dateISO).toISOString());
  }
  
  const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading club...</Text>
      </View>
    );
  }

  if (!club) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.subtitle} />
        <Text style={[styles.notFound, { color: colors.text }]}>Club not found.</Text>
        <TouchableOpacity 
          style={[styles.backButtonText, { backgroundColor: colors.primary }]} 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/discover');
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonTextLabel}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: club.name, headerShown: false }} />

      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <HoneycombBackground />
        <ScrollView 
          style={[styles.container, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image
              source={{
                uri:
                  club.imageUrl && club.imageUrl.startsWith("http")
                    ? club.imageUrl
                    : "https://via.placeholder.com/800x400.png?text=Club+Image",
              }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            
            <View style={styles.heroHeader}>
              <TouchableOpacity 
                style={styles.backButtonOverlay} 
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)/discover');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroOverlay}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(club.category || "Other") },
                ]}
              >
                <Text style={styles.categoryText}>{club.category}</Text>
              </View>
            </View>
          </View>

          {/* Club Info */}
          <View style={[styles.contentSection, { backgroundColor: isDark ? colors.background : "transparent" }]}>
            <View style={[styles.detailPill, { backgroundColor: isDark ? colors.card : colors.nectar, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={15} color={colors.primary} />
              <Text style={[styles.detailPillText, { color: colors.primary }]}>Hive Cell</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{club.name}</Text>
            
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={[styles.locationText, { color: colors.subtitle }]}>Campus Organization</Text>
            </View>

            <View style={styles.ratingRow}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.ratingText, { color: colors.primary }]}>{upcomingEvents.length}</Text>
              <Text style={[styles.reviewsText, { color: colors.subtitle }]}>
                upcoming event{upcomingEvents.length !== 1 ? "s" : ""}
              </Text>
            </View>

            <Text style={[styles.description, { color: colors.subtitle }]}>{club.description || "No description available."}</Text>
          </View>

          {/* Events Section */}
          <View style={styles.eventsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Events</Text>
            </View>

            {/* Event Tabs */}
            <View style={[styles.tabsContainer, { backgroundColor: isDark ? colors.border : colors.nectar }]}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'upcoming' && [styles.tabActive, { backgroundColor: colors.card }]]}
                onPress={() => setActiveTab('upcoming')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: colors.subtitle }, activeTab === 'upcoming' && [styles.tabTextActive, { color: colors.primary }]]}>
                  Upcoming ({upcomingEvents.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'past' && [styles.tabActive, { backgroundColor: colors.card }]]}
                onPress={() => setActiveTab('past')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: colors.subtitle }, activeTab === 'past' && [styles.tabTextActive, { color: colors.primary }]]}>
                  Past ({pastEvents.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Event Cards */}
            {displayedEvents.length > 0 ? (
              <View style={styles.eventsList}>
                {displayedEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleEventPress(event)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventCardContent}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                      
                      <View style={styles.eventDetails}>
                        <View style={styles.eventDetailRow}>
                          <Text style={[styles.eventDetailLabel, { color: colors.subtitle }]}>Date:</Text>
                          <Text style={[styles.eventDetailValue, { color: colors.text }]}>{event.formattedDate}</Text>
                        </View>
                        
                        <View style={styles.eventDetailRow}>
                          <Text style={[styles.eventDetailLabel, { color: colors.subtitle }]}>Location:</Text>
                          <Text style={[styles.eventDetailValue, { color: colors.text }]}>{event.location}</Text>
                        </View>
                        
                        {event.description && (
                          <Text style={[styles.eventDescription, { color: colors.subtitle }]} numberOfLines={2}>
                            {event.description}
                          </Text>
                        )}
                      </View>

                      {activeTab === 'upcoming' ? (
                        <TouchableOpacity
                          style={[styles.rsvpButton, { backgroundColor: colors.primary }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleEventPress(event);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.rsvpButtonText}>RSVP</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.pastEventBadge, { backgroundColor: colors.border }]}>
                          <Text style={[styles.pastEventBadgeText, { color: colors.subtitle }]}>Past Event</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyEvents}>
                <Ionicons name="calendar-outline" size={48} color={colors.subtitle} />
                <Text style={[styles.emptyEventsText, { color: colors.text }]}>
                  {activeTab === 'upcoming' ? 'No upcoming events' : 'No past events'}
                </Text>
                <Text style={[styles.emptyEventsSubtext, { color: colors.subtitle }]}>
                  {activeTab === 'upcoming'
                    ? 'Check back later for new events'
                    : 'No past events to display'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  notFound: { 
    fontSize: 18, 
    fontWeight: "500",
    marginTop: 16,
  },
  heroContainer: {
    position: "relative",
    width: "100%",
    height: 320,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButtonOverlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroOverlay: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingTop: 60,
  },
  categoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  contentSection: {
    padding: 20,
  },
  detailPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  detailPillText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: { 
    fontSize: 32, 
    fontWeight: "800", 
    marginBottom: 12,
    letterSpacing: 0,
    lineHeight: 38,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "600",
  },
  reviewsText: {
    fontSize: 15,
  },
  description: { 
    fontSize: 16, 
    lineHeight: 24,
    marginBottom: 8,
  },
  eventsSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  tabsContainer: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    minHeight: 50,
    width: "100%",
    zIndex: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  tabActive: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  tabTextActive: {
  },
  eventsList: {
    gap: 16,
  },
  eventCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  eventCardContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventDetailRow: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  eventDetailLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  eventDetailValue: {
    fontSize: 14,
    flex: 1,
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  rsvpButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rsvpButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pastEventBadge: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pastEventBadgeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyEvents: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyEventsText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  },
  emptyEventsSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  backButtonText: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  backButtonTextLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
