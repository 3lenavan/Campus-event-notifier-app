import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getClubs, Club } from "../../data/dataLoader";
import { getClubEventCount } from "../../src/services/eventsService";
import { useAppTheme, LightThemeColors } from "../../src/ThemeContext";
import { BuzzUpMascot, HoneycombBackground } from "../../src/components";

export default function Discover() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  // Load club data from Supabase when screen mounts
  useEffect(() => {
    async function loadClubs() {
      try {
        const data = await getClubs(); // fetch from Supabase
        setClubs(data || []);
        
        // Fetch real-time event counts for each club
        const counts: Record<string, number> = {};
        if (data && data.length > 0) {
          await Promise.all(
            data.map(async (club) => {
              const count = await getClubEventCount(club.id);
              counts[String(club.id)] = count;
            })
          );
        }
        setEventCounts(counts);
      } catch (error) {
        console.error("Error loading clubs:", error);
      } finally {
        setLoading(false);
      }
    }
    loadClubs();
  }, []);

  // Filter clubs by search text
  const filteredClubs = clubs.filter((club) => {
    const name = club.name?.toLowerCase() ?? "";
    const category = club.category?.toLowerCase() ?? "";
    const description = club.description?.toLowerCase() ?? "";
    return (
      name.includes(searchQuery.toLowerCase()) ||
      category.includes(searchQuery.toLowerCase()) ||
      description.includes(searchQuery.toLowerCase())
    );
  });

  const getEventCount = (club: Club) => {
    // Use real-time count from state, fallback to club.events if available
    const realTimeCount = eventCounts[String(club.id)];
    if (realTimeCount !== undefined) {
      return realTimeCount;
    }
    return Array.isArray(club.events) ? club.events.length : 0;
  };


  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Academic: "#D97706",
      Social: "#8B5CF6",
      Sports: "#22C55E",
      Arts: "#EC4899",
      Career: "#0EA5E9",
      Other: "#6B4E16",
    };
    return colors[category] || colors["Other"];
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.subtitle }}>Loading clubs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HoneycombBackground />
      {/* Header */}
      <View style={[styles.header, isDesktop && styles.desktopHeader, { backgroundColor: isDark ? colors.card : colors.nectar, borderColor: colors.border }]}>
        <View style={styles.headerCopy}>
          <View style={styles.kickerRow}>
            <Ionicons name="search-outline" size={16} color={colors.primary} />
            <Text style={[styles.kicker, { color: colors.primary }]}>Explore Cells</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Discover</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>Find clubs, groups, and the next event cluster.</Text>
        </View>
        <BuzzUpMascot size={isDesktop ? 124 : 88} style={styles.headerMascot} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.subtitle}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search the hive..."
          placeholderTextColor={colors.placeholderText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={colors.subtitle} />
          </TouchableOpacity>
        )}
      </View>

      {/* Club List */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredClubs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.subtitle} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No clubs found</Text>
            <Text style={[styles.emptySubText, { color: colors.subtitle }]}>Try a different search term</Text>
          </View>
        ) : (
          filteredClubs.map((club) => (
            <TouchableOpacity
              key={club.id}
              activeOpacity={0.9}
              style={[styles.clubCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() =>
                router.push({
                  pathname: "/clubs/[id]" as any,
                  params: { id: club.id },
                })
              }
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri:
                      club.imageUrl && club.imageUrl.startsWith("http")
                        ? club.imageUrl
                        : "https://via.placeholder.com/400x200.png?text=Club+Image",
                  }}
                  style={styles.clubImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
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

              <View style={styles.clubInfo}>
                <Text style={[styles.clubName, { color: colors.text }]} numberOfLines={2}>
                  {club.name}
                </Text>
                <Text style={[styles.clubDescription, { color: colors.subtitle }]} numberOfLines={2}>
                  {club.description || "No description available"}
                </Text>

                <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                  <View style={styles.eventInfo}>
                    <Ionicons name="calendar-outline" size={16} color={colors.subtitle} />
                    <Text style={[styles.eventCount, { color: colors.subtitle }]}>
                      {getEventCount(club)} event{getEventCount(club) !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.subtitle} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 16,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  desktopHeader: { width: "100%", maxWidth: 1140, alignSelf: "center" },
  headerCopy: { flex: 1 },
  headerMascot: { marginVertical: -22, marginRight: -6 },
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
  },
  headerSubtitle: { 
    fontSize: 14,
    marginTop: 2,
    maxWidth: 280,
    fontWeight: "500",
  },
  legacyHeader: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#4A2D00",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingLeft: 8,
    paddingVertical: 0,
  },
  searchIcon: { marginRight: 8 },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 120,
    alignItems: 'stretch',
  },
  emptyState: { 
    alignItems: "center", 
    marginTop: 80,
    paddingVertical: 40,
  },
  emptyText: { 
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  },
  emptySubText: { 
    fontSize: 14,
    marginTop: 8,
  },
  clubCard: {
    borderRadius: 8,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#4A2D00",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 0.5,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 200,
  },
  clubImage: { 
    width: "100%", 
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  clubInfo: { 
    padding: 16,
  },
  clubName: { 
    fontWeight: "700", 
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  clubDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  eventInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryText: { 
    color: "#FFFFFF", 
    fontSize: 12, 
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  eventCount: { 
    fontSize: 13,
    fontWeight: "500",
  },
});
