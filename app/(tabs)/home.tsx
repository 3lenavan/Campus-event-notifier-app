import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EventCard, { Event as CardEvent } from "../event-card";
import { BeeMascot, BuzzUpLogo, DesktopSidebar, FilterPills, NotificationButton, SearchBar } from "../../src/components/buzzup-ui";
import { useAuthUser } from "../../src/hooks/useAuthUser";
import { listApprovedEvents } from "../../src/services/eventsService";
import { listClubs } from "../../src/services/clubsService";
import { getEventsInteractions, toggleFavorite, toggleLike, toggleRSVP } from "../../src/services/interactionsService";
import { buzzup } from "../../src/theme/buzzup-theme";
import { DemoEvent, getDemoEvents } from "../../src/data/demo-events";

type FeedEvent = CardEvent & { liked: boolean; favorited: boolean; likes: number; clubName: string };

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const { user, profile } = useAuthUser();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      const [approved, clubs] = await Promise.all([listApprovedEvents(true), listClubs()]);
      const sourceEvents = approved.length ? approved : getDemoEvents();
      const liveEventIds = sourceEvents.filter((event) => !event.id.startsWith("demo-")).map((event) => event.id);
      const interactions = user?.uid && liveEventIds.length
        ? await getEventsInteractions(user.uid, liveEventIds)
        : { likedEvents: new Set<string>(), favoritedEvents: new Set<string>(), rsvpedEvents: new Set<string>(), likeCounts: {} as Record<string, number> };
      const clubMap = new Map(clubs.map((club) => [club.id, club.name]));
      setEvents(sourceEvents
        .filter((event) => new Date(event.dateISO).getTime() >= Date.now())
        .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime())
        .map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          dateISO: event.dateISO,
          time: new Date(event.dateISO).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          location: event.location,
          category: event.id.startsWith("demo-") ? (event as DemoEvent).category : "Club Event",
          attendees: event.attendees || 0,
          imageUrl: event.imageUrl,
          imageSource: event.id.startsWith("demo-") ? (event as DemoEvent).imageSource : undefined,
          isUserAttending: interactions.rsvpedEvents.has(event.id),
          liked: interactions.likedEvents.has(event.id),
          favorited: interactions.favoritedEvents.has(event.id),
          likes: interactions.likeCounts[event.id] || 0,
          clubName: clubMap.get(event.clubId) || (event.id.startsWith("demo-") ? "BuzzUp Campus" : "Campus organization"),
        })));
    } catch (cause) {
      console.error(cause);
      setError("We couldn’t load campus events. Pull to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  const visibleEvents = useMemo(() => {
    const today = new Date();
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      const haystack = `${event.title} ${event.description} ${event.location} ${event.clubName}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      const date = new Date(event.dateISO || event.date || 0);
      if (filter === "Today") return date.toDateString() === today.toDateString();
      if (filter === "This Week") return date >= today && date <= weekEnd;
      if (filter === "Sports") return /sport|athletic|game|fitness/i.test(haystack);
      if (filter === "Arts") return /art|music|film|theater|dance/i.test(haystack);
      return true;
    });
  }, [events, filter, query]);

  const requireUser = () => {
    if (user?.uid) return user.uid;
    router.replace("/");
    return null;
  };
  const patchEvent = (id: string, values: Partial<FeedEvent>) => setEvents((current) => current.map((event) => event.id === id ? { ...event, ...values } : event));
  const onLike = async (id: string) => { const current = events.find((e) => e.id === id); if (!current) return; patchEvent(id, { liked: !current.liked, likes: Math.max(0, current.likes + (current.liked ? -1 : 1)) }); if (id.startsWith("demo-")) return; const uid = requireUser(); if (!uid) return; try { await toggleLike(uid, id); } catch { patchEvent(id, { liked: current.liked, likes: current.likes }); } };
  const onFavorite = async (id: string) => { const current = events.find((e) => e.id === id); if (!current) return; patchEvent(id, { favorited: !current.favorited }); if (id.startsWith("demo-")) return; const uid = requireUser(); if (!uid) return; try { await toggleFavorite(uid, id); } catch { patchEvent(id, { favorited: current.favorited }); } };
  const onRSVP = async (id: string) => { const current = events.find((e) => e.id === id); if (!current) return; patchEvent(id, { isUserAttending: !current.isUserAttending, attendees: Math.max(0, (current.attendees || 0) + (current.isUserAttending ? -1 : 1)) }); if (id.startsWith("demo-")) return; const uid = requireUser(); if (!uid) return; try { await toggleRSVP(uid, id); } catch { patchEvent(id, { isUserAttending: current.isUserAttending, attendees: current.attendees }); } };
  const openEvent = (event: CardEvent) => router.push({ pathname: "/event-details-screen", params: { id: event.id } });
  const firstName = (profile?.name || user?.displayName || "Maya").split(" ")[0];

  const controls = (
    <View style={{ gap: 16 }}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search campus events" />
      <FilterPills options={desktop ? ["All", "Today", "This Week", "Clubs", "Sports", "Arts"] : ["All", "Today", "Clubs", "Sports"]} selected={filter} onSelect={setFilter} />
    </View>
  );

  const eventGrid = loading ? (
    <View style={{ paddingVertical: 70, alignItems: "center", gap: 12 }}><ActivityIndicator color={buzzup.colors.primaryPressed} /><Text style={{ color: buzzup.colors.cocoaSoft }}>Finding the latest buzz…</Text></View>
  ) : error ? (
    <Pressable onPress={loadEvents} style={{ padding: 28, alignItems: "center", gap: 10 }}><Ionicons name="cloud-offline-outline" size={38} color={buzzup.colors.cocoaSoft} /><Text style={{ color: buzzup.colors.cocoa, fontWeight: "700", textAlign: "center" }}>{error}</Text></Pressable>
  ) : visibleEvents.length ? (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: desktop ? 20 : 16 }}>
      {visibleEvents.map((event) => <View key={event.id} style={{ width: desktop ? "48.5%" : "100%" }}><EventCard event={event} onPress={openEvent} onLike={onLike} onFavorite={onFavorite} onRSVP={onRSVP} liked={event.liked} favorited={event.favorited} likesCount={event.likes} /></View>)}
    </View>
  ) : (
    <View style={{ paddingVertical: 60, alignItems: "center", gap: 10 }}><BeeMascot size={92} /><Text style={{ ...buzzup.type.title, color: buzzup.colors.cocoa }}>No events match that search</Text><Text style={{ color: buzzup.colors.cocoaSoft }}>Try another filter or check back soon.</Text></View>
  );

  if (desktop) {
    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: buzzup.colors.background }}>
        <DesktopSidebar />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 32, gap: 24 }}>
          <View style={{ flexDirection: "row", gap: 28, maxWidth: 1320, width: "100%", alignSelf: "center" }}>
            <View style={{ flex: 1, minWidth: 0, gap: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}><BeeMascot size={104} /><View><Text style={{ ...buzzup.type.display, color: buzzup.colors.cocoa }}>Good morning, {firstName}!</Text><Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft }}>Here’s what’s buzzing on campus</Text></View></View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><NotificationButton /><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: buzzup.colors.coral, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "white", fontWeight: "900" }}>{firstName[0]?.toUpperCase()}</Text></View></View>
              </View>
              {controls}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ ...buzzup.type.h1, color: buzzup.colors.cocoa }}>Happening soon</Text><Text style={{ color: buzzup.colors.green, fontWeight: "700" }}>{visibleEvents.length} events</Text></View>
              {eventGrid}
            </View>
            <View style={{ width: 330, gap: 16 }}>
              <View style={{ minHeight: 220, borderRadius: 22, padding: 20, overflow: "hidden", backgroundColor: buzzup.colors.primary }}><Text style={{ ...buzzup.type.h1, color: buzzup.colors.cocoa, maxWidth: 165 }}>Never miss the buzz!</Text><Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoa, maxWidth: 160, marginTop: 8 }}>Follow clubs and RSVP to stay updated on events you love.</Text><BeeMascot size={150} style={{ position: "absolute", right: -8, bottom: -8 }} /></View>
              <View style={{ padding: 18, gap: 14, borderRadius: 20, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa }}>Your week</Text><Text style={{ color: buzzup.colors.green, fontWeight: "700", fontSize: 12 }}>View calendar</Text></View>{events.slice(0, 2).map((event) => <Pressable key={event.id} onPress={() => openEvent(event)} style={{ padding: 12, borderRadius: 14, backgroundColor: buzzup.colors.background }}><Text numberOfLines={1} style={{ color: buzzup.colors.cocoa, fontWeight: "800" }}>{event.title}</Text><Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}>{event.time} · {event.location}</Text></Pressable>)}</View>
              <View style={{ padding: 18, gap: 12, borderRadius: 20, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border }}><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa }}>Trending clubs</Text>{["Robotics Club", "Student Arts Collective", "Outdoor Adventure Club"].map((name, index) => <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Text style={{ fontSize: 25 }}>{["🤖", "🎨", "🏕️"][index]}</Text><View style={{ flex: 1 }}><Text style={{ color: buzzup.colors.cocoa, fontWeight: "800" }}>{name}</Text><Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}>{128 + index * 37} members</Text></View></View>)}</View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: buzzup.colors.background }} edges={["top"]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} tintColor={buzzup.colors.primaryPressed} />} contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><BuzzUpLogo /><NotificationButton /></View>
        <View style={{ minHeight: 126, flexDirection: "row", alignItems: "center", borderRadius: 22, padding: 14, overflow: "hidden", backgroundColor: buzzup.colors.surfaceMuted }}><BeeMascot size={112} /><View style={{ flex: 1 }}><Text style={{ color: buzzup.colors.cocoa, fontSize: 17, fontWeight: "700" }}>Good morning,</Text><Text style={{ ...buzzup.type.h1, color: buzzup.colors.cocoa }}>{firstName}!</Text></View></View>
        {controls}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa }}>Happening soon</Text><Text style={{ color: buzzup.colors.green, fontWeight: "700" }}>View all</Text></View>
        {eventGrid}
      </ScrollView>
    </SafeAreaView>
  );
}
