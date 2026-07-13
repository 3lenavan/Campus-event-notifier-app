import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ImageSourcePropType, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Club, getClubs } from "../../data/dataLoader";
import { DesktopSidebar, FilterPills, NotificationButton, SearchBar } from "../../src/components/buzzup-ui";
import { useAuthUser } from "../../src/hooks/useAuthUser";
import { getFollowedClubIds, toggleClubFollow } from "../../src/services/club-follow-service";
import { buzzup } from "../../src/theme/buzzup-theme";

type DisplayClub = Club & { imageSource?: ImageSourcePropType };

const featuredDefaults: DisplayClub[] = [
  { id: -1, name: "Robotics Club", description: "Build, code, and compete with creative campus makers.", category: "Academic", events: [], imageSource: require("../../assets/clubs/robotics-club.jpg") },
  { id: -2, name: "Student Arts Collective", description: "A welcoming home for artists in every medium.", category: "Arts", events: [], imageSource: require("../../assets/clubs/student-arts-collective.jpg") },
  { id: -3, name: "Outdoor Adventure Club", description: "Hikes, trips, and fresh-air friendships.", category: "Sports", events: [], imageSource: require("../../assets/clubs/outdoor-adventure-club.jpg") },
];

export default function DiscoverScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const { user } = useAuthUser();
  const [clubs, setClubs] = useState<DisplayClub[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getClubs(), getFollowedClubIds(user?.uid)]).then(([loaded, saved]) => {
      const featuredNames = new Set(featuredDefaults.map((club) => club.name.toLowerCase()));
      setClubs([...featuredDefaults, ...loaded.filter((club) => !featuredNames.has(club.name.toLowerCase()))]);
      setFollowed(saved);
    }).finally(() => setLoading(false));
  }, [user?.uid]);

  const visible = useMemo(() => clubs.filter((club) => {
    const haystack = `${club.name} ${club.description || ""} ${club.category || ""}`.toLowerCase();
    const matchesSearch = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const matchesFilter = filter === "All" || filter === "Clubs" || (club.category || "Other").toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  }), [clubs, filter, query]);

  const onFollow = async (club: DisplayClub) => {
    const id = String(club.id);
    setFollowed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    try { setFollowed(await toggleClubFollow(user?.uid, id)); } catch { setFollowed(await getFollowedClubIds(user?.uid)); }
  };

  const content = (
    <ScrollView contentContainerStyle={{ padding: desktop ? 32 : 18, paddingBottom: 120, gap: 22, maxWidth: desktop ? 1120 : undefined, width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View><Text style={{ ...buzzup.type.display, color: buzzup.colors.cocoa }}>Discover</Text><Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft }}>Find your campus community</Text></View><NotificationButton /></View>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search clubs and events" />
      <FilterPills options={["All", "Clubs", "Academic", "Sports", "Arts"]} selected={filter} onSelect={setFilter} />
      <Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa }}>Featured clubs</Text>
      {loading ? <ActivityIndicator color={buzzup.colors.primaryPressed} /> : visible.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {visible.map((club, index) => {
            const isFollowed = followed.has(String(club.id));
            return (
              <Pressable key={club.id} onPress={() => club.id > 0 && router.push({ pathname: "/clubs/[id]", params: { id: String(club.id) } })} style={({ pressed }) => ({ width: desktop ? "48.8%" : "100%", minHeight: desktop ? 170 : 146, flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: buzzup.radius.lg, backgroundColor: pressed ? buzzup.colors.surfaceMuted : buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border, boxShadow: `0 5px 16px ${buzzup.colors.shadow}` })}>
                <View style={{ width: 92, height: 104, borderRadius: 18, overflow: "hidden", backgroundColor: ["#DDEBFF", "#FFE2D8", "#E0F1D5"][index % 3], alignItems: "center", justifyContent: "center" }}>
                  {club.imageSource || club.imageUrl ? <Image source={club.imageSource || { uri: club.imageUrl! }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityLabel={`${club.name} artwork`} /> : <Text style={{ fontSize: 46 }}>{["🤖", "🎨", "🏕️", "📚", "⚽"][index % 5]}</Text>}
                </View>
                <View style={{ flex: 1, gap: 7 }}>
                  <Text numberOfLines={2} style={{ ...buzzup.type.title, color: buzzup.colors.cocoa }}>{club.name}</Text>
                  <View style={{ alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: club.category === "Arts" ? "#FFE0D7" : club.category === "Sports" ? "#E3F2D8" : "#DDEBFF" }}><Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoa }}>{club.category || "Club"}</Text></View>
                  <Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}>{128 + index * 29} members</Text>
                </View>
                <Pressable accessibilityLabel={`${isFollowed ? "Unfollow" : "Follow"} ${club.name}`} onPress={(event) => { event.stopPropagation(); onFollow(club); }} style={({ pressed }) => ({ minWidth: 80, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: isFollowed ? buzzup.colors.surfaceMuted : pressed ? "#4C8125" : buzzup.colors.green, borderWidth: isFollowed ? 1 : 0, borderColor: buzzup.colors.border })}>
                  <Text style={{ color: isFollowed ? buzzup.colors.cocoa : buzzup.colors.white, fontWeight: "800" }}>{isFollowed ? "Following" : "Follow"}</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ) : <View style={{ paddingVertical: 70, alignItems: "center", gap: 10 }}><Ionicons name="search" size={42} color={buzzup.colors.cocoaSoft} /><Text style={{ ...buzzup.type.title, color: buzzup.colors.cocoa }}>No clubs found</Text><Text style={{ color: buzzup.colors.cocoaSoft }}>Try a different search or category.</Text></View>}
    </ScrollView>
  );

  if (desktop) return <View style={{ flex: 1, flexDirection: "row", backgroundColor: buzzup.colors.background }}><DesktopSidebar /><View style={{ flex: 1 }}>{content}</View></View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: buzzup.colors.background }} edges={["top"]}>{content}</SafeAreaView>;
}
