import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isDemoMode, supabase } from "../data/supabaseClient";
import { useAuthUser } from "../src/hooks/useAuthUser";
import { canManageCheckin, CheckinStats, getCheckinStats } from "../src/services/checkinService";
import { listClubs } from "../src/services/clubsService";
import { getEventById } from "../src/services/eventsService";
import { getEventAttendeeCount } from "../src/services/interactionsService";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";
import type { Event } from "../src/types";

export default function EventAnalytics() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const { profile } = useAuthUser();

  const [event, setEvent] = useState<Event | null>(null);
  const [userClubIds, setUserClubIds] = useState<string[]>([]);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const loadedEvent = await getEventById(id);
      setEvent(loadedEvent);

      if (isDemoMode) {
        const availableClubs = await listClubs();
        setUserClubIds(
          availableClubs
            .filter((c) => profile?.memberships.includes(c.slug))
            .map((c) => c.id)
        );
      } else if (profile) {
        const { data } = await supabase.from("clubs_users").select("club_id").eq("user_id", profile.uid);
        setUserClubIds((data || []).map((row: any) => String(row.club_id)));
      }

      if (loadedEvent) {
        const rsvpCount = await getEventAttendeeCount(loadedEvent.id);
        setStats(await getCheckinStats(loadedEvent.id, rsvpCount));
      }

      setLoading(false);
    };

    load();
  }, [id, profile]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const canView = event ? canManageCheckin({ clubId: event.clubId }, profile, userClubIds) : false;

  if (!event || !canView) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.subtitle} />
        <Text style={[styles.notFoundText, { color: colors.text }]}>
          {event ? "You don't have access to this event's analytics." : "Event not found."}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const noShows = Math.max(0, (stats?.rsvpCount || 0) - (stats?.checkedInCount || 0));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.tileGrid}>
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tileValue, { color: colors.text }]}>{stats?.rsvpCount ?? 0}</Text>
            <Text style={[styles.tileLabel, { color: colors.subtitle }]}>RSVPs</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tileValue, { color: colors.text }]}>{stats?.checkedInCount ?? 0}</Text>
            <Text style={[styles.tileLabel, { color: colors.subtitle }]}>Checked in</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tileValue, { color: colors.text }]}>{Math.round((stats?.rate ?? 0) * 100)}%</Text>
            <Text style={[styles.tileLabel, { color: colors.subtitle }]}>Check-in rate</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tileValue, { color: colors.text }]}>{noShows}</Text>
            <Text style={[styles.tileLabel, { color: colors.subtitle }]}>No-shows</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBackButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: { padding: 20, paddingBottom: 60 },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  tile: {
    width: "47%",
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  tileValue: { fontSize: 30, fontWeight: "800" },
  tileLabel: { fontSize: 13, fontWeight: "600" },
  notFoundText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
