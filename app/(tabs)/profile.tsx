import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthUser } from "../../src/hooks/useAuthUser";
import { auth } from "../../src/lib/firebase";
import { listClubs } from "../../src/services/clubsService";
import { Club, Event } from "../../src/types";
import { getUserLikedEvents, getUserFavoritedEvents, getUserRSVPdEvents } from "../../src/services/interactionsService";
import { getEventsByIds } from "../../src/services/eventsService";
import {
  cancelAllReminders,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  syncRemindersForUser,
} from "../../src/services/notificationsService";
import EventCard from "../event-card";
import { useFocusEffect } from "expo-router";
import { useAppTheme, LightThemeColors } from "../../src/ThemeContext";
import { showAlert } from "../../src/lib/alert";

type ProfileEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  attendees: number;
  maxAttendees?: number;
  imageUrl?: string;
  isUserAttending?: boolean;
};

const Profile = () => {
  const { user, profile, loading } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;
  const [clubs, setClubs] = useState<Club[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [likedEvents, setLikedEvents] = useState<ProfileEvent[]>([]);
  const [favoritedEvents, setFavoritedEvents] = useState<ProfileEvent[]>([]);
  const [rsvpedEvents, setRsvpedEvents] = useState<ProfileEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeTab, setActiveTab] = useState<'liked' | 'favorited' | 'rsvped'>('liked');

  useEffect(() => {
    const loadClubs = async () => {
      try {
        const clubsData = await listClubs();
        setClubs(clubsData);
      } catch (error) {
        console.error('Error loading clubs:', error);
      }
    };

    loadClubs();
  }, []);

  useEffect(() => {
    getNotificationPermissionStatus().then((status) => setNotificationsEnabled(status === 'granted'));
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const status = await requestNotificationPermission();
      setNotificationsEnabled(status === 'granted');
      if (status === 'granted' && user?.uid) {
        await syncRemindersForUser(user.uid);
      } else if (status !== 'granted') {
        showAlert(
          'Notifications disabled',
          'Enable notifications for this app in your device settings to get event reminders.'
        );
      }
    } else {
      setNotificationsEnabled(false);
      await cancelAllReminders();
    }
  };

  const loadUserEvents = useCallback(async () => {
    if (!user?.uid) {
      setLoadingEvents(false);
      return;
    }

    try {
      setLoadingEvents(true);
      
      // Fetch liked, favorited, and RSVP'd event IDs
      const [likedEventIds, favoritedEventIds, rsvpedEventIds] = await Promise.all([
        getUserLikedEvents(user.uid),
        getUserFavoritedEvents(user.uid),
        getUserRSVPdEvents(user.uid),
      ]);

      // Fetch actual event data
      const [likedEventsData, favoritedEventsData, rsvpedEventsData] = await Promise.all([
        getEventsByIds(likedEventIds),
        getEventsByIds(favoritedEventIds),
        getEventsByIds(rsvpedEventIds),
      ]);

      // Convert to ProfileEvent format
      const clubsData = await listClubs();
      const now = new Date();
      
      const convertToProfileEvent = (event: Event): ProfileEvent => {
        const date = new Date(event.dateISO);
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          date: date.toISOString(),
          time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          location: event.location,
          category: "Club Event",
          attendees: event.attendees || 0,
          maxAttendees: undefined,
          imageUrl: event.imageUrl,
          isUserAttending: false,
        };
      };

      // Filter out past events for RSVP'd events only
      const filteredRSVPedEvents = rsvpedEventsData
        .filter((event) => {
          const eventDate = new Date(event.dateISO);
          return eventDate >= now;
        })
        .map(convertToProfileEvent);

      setLikedEvents(likedEventsData.map(convertToProfileEvent));
      setFavoritedEvents(favoritedEventsData.map(convertToProfileEvent));
      setRsvpedEvents(filteredRSVPedEvents);
    } catch (error) {
      console.error('Error loading user events:', error);
    } finally {
      setLoadingEvents(false);
    }
  }, [user?.uid]);

  // Load events when component mounts and when user changes
  useEffect(() => {
    loadUserEvents();
  }, [loadUserEvents]);

  // Reload events when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadUserEvents();
    }, [loadUserEvents])
  );

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      showAlert('Success', 'Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      showAlert('Error', 'Failed to sign out');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={[styles.header, { color: colors.text }]}>Profile</Text>
        <Text style={[styles.subheader, { color: colors.subtitle }]}>Manage your account and preferences</Text>
      </View>

      {/* Profile Card */}
      <View style={[styles.profileBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {profile?.name ? profile.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{profile?.name || user?.displayName || "Unknown User"}</Text>
          <Text style={[styles.email, { color: colors.subtitle }]}>{profile?.email || user?.email}</Text>
          {profile && (
            <View style={styles.roleContainer}>
              <View style={[
                styles.roleBadge,
                { backgroundColor: profile.isAdmin ? '#2563EB' : (profile.role === 'member' ? '#10B981' : '#6B7280') }
              ]}>
                <Text style={styles.roleText}>
                  {profile.isAdmin ? 'Admin' : (profile.role === 'member' ? 'Club Member' : 'Student')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* My Events Section */}
      {user && (
        <View style={[styles.eventsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Events</Text>
          
          {/* Tab Selector */}
          <View style={[styles.tabContainer, { backgroundColor: isDark ? colors.border : "#F3F4F6" }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'liked' && [styles.activeTab, { backgroundColor: colors.card }]]}
              onPress={() => setActiveTab('liked')}
            >
              <Ionicons 
                name={activeTab === 'liked' ? "heart" : "heart-outline"} 
                size={18} 
                color={activeTab === 'liked' ? "#EF4444" : colors.subtitle} 
              />
              <Text style={[styles.tabText, { color: colors.subtitle }, activeTab === 'liked' && [styles.activeTabText, { color: colors.text }]]} numberOfLines={1}>
                Liked ({likedEvents.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'favorited' && [styles.activeTab, { backgroundColor: colors.card }]]}
              onPress={() => setActiveTab('favorited')}
            >
              <Ionicons 
                name={activeTab === 'favorited' ? "bookmark" : "bookmark-outline"} 
                size={18} 
                color={activeTab === 'favorited' ? "#3B82F6" : colors.subtitle} 
              />
              <Text style={[styles.tabText, { color: colors.subtitle }, activeTab === 'favorited' && [styles.activeTabText, { color: colors.text }]]} numberOfLines={1}>
                Saved ({favoritedEvents.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'rsvped' && [styles.activeTab, { backgroundColor: colors.card }]]}
              onPress={() => setActiveTab('rsvped')}
            >
              <Ionicons 
                name={activeTab === 'rsvped' ? "calendar" : "calendar-outline"} 
                size={18} 
                color={activeTab === 'rsvped' ? "#10B981" : colors.subtitle} 
              />
              <Text style={[styles.tabText, { color: colors.subtitle }, activeTab === 'rsvped' && [styles.activeTabText, { color: colors.text }]]} numberOfLines={1}>
                RSVP&apos;d ({rsvpedEvents.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Events List */}
          {loadingEvents ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.text }]}>Loading events...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'liked' ? (
                likedEvents.length > 0 ? (
                  <View style={styles.eventsList}>
                    {likedEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onPress={() => router.push({ pathname: "/event-details-screen", params: { id: event.id } })}
                        compact={true}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="heart-outline" size={48} color={colors.subtitle} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>No liked events yet</Text>
                    <Text style={[styles.emptySubtext, { color: colors.subtitle }]}>Start liking events to see them here</Text>
                  </View>
                )
              ) : activeTab === 'favorited' ? (
                favoritedEvents.length > 0 ? (
                  <View style={styles.eventsList}>
                    {favoritedEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onPress={() => router.push({ pathname: "/event-details-screen", params: { id: event.id } })}
                        compact={true}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="bookmark-outline" size={48} color={colors.subtitle} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>No favorited events yet</Text>
                    <Text style={[styles.emptySubtext, { color: colors.subtitle }]}>Start favoriting events to see them here</Text>
                  </View>
                )
              ) : (
                rsvpedEvents.length > 0 ? (
                  <View style={styles.eventsList}>
                    {rsvpedEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onPress={() => router.push({ pathname: "/event-details-screen", params: { id: event.id } })}
                        compact={true}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={48} color={colors.subtitle} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>No RSVP&apos;d events yet</Text>
                    <Text style={[styles.emptySubtext, { color: colors.subtitle }]}>RSVP to events to see them here</Text>
                  </View>
                )
              )}
            </>
          )}
        </View>
      )}

      {/* Settings Section */}
      <View style={[styles.settingsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Notifications toggle */}
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Push Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
          />
        </View>

        {/* Verify Club Membership */}
        <TouchableOpacity 
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/verify-club')}
        >
          <View style={styles.rowContent}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Verify Club Membership</Text>
              <Text style={[styles.rowSubtitle, { color: colors.subtitle }]}>Join clubs with verification codes</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* My Club Memberships */}
        {profile?.memberships && profile.memberships.length > 0 && (
          <View style={[styles.membershipsSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Club Memberships</Text>
            <View style={styles.clubTagsContainer}>
              {profile.memberships.map((clubSlug) => {
                const club = clubs.find(c => c.slug === clubSlug);
                return club ? (
                  <View key={clubSlug} style={[styles.clubTag, { borderColor: "#10B981" }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={[styles.clubTagText, { color: isDark ? "#10B981" : "#065F46" }]}>{club.name}</Text>
                  </View>
                ) : null;
              })}
            </View>
          </View>
        )}

        {/* Settings */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push("/settings")}
        >
          <Text style={[styles.rowTitle, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.rowSubtitle, { color: colors.subtitle }]}>App preferences</Text>
        </TouchableOpacity>
      </View>

      {/* Log Out button */}
      <TouchableOpacity onPress={handleSignOut} style={styles.button}>
        <Ionicons name="log-out-outline" size={20} color="white" />
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 120 },
  headerSection: { marginBottom: 24 },
  header: { 
    fontSize: 32, 
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subheader: { 
    fontSize: 16, 
  },
  profileBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 0.5,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarText: { 
    fontSize: 28, 
    fontWeight: "700", 
    color: "#FFFFFF",
  },
  info: { flexDirection: "column", flex: 1 },
  name: { 
    fontSize: 22, 
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  email: { 
    fontSize: 15, 
    color: "#6B7280",
    marginBottom: 12,
  },
  eventsSection: {
    borderRadius: 20,
    borderWidth: 0.5,
    marginBottom: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
  },
  activeTabText: {
    fontWeight: "600",
  },
  eventsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  settingsBox: {
    borderRadius: 20,
    borderWidth: 0.5,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  row: {
    padding: 20,
    borderBottomWidth: 1,
  },
  rowTitle: { 
    fontSize: 16, 
    fontWeight: "600",
    marginBottom: 4,
  },
  rowSubtitle: { 
    fontSize: 14, 
  },
  button: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: { 
    color: "#FFFFFF", 
    fontSize: 16, 
    fontWeight: "600", 
    marginLeft: 8,
  },
  roleContainer: {
    marginTop: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  roleText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowText: {
    marginLeft: 12,
    flex: 1,
  },
  membershipsSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  clubTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  clubTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clubTagText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
});

export default Profile;
