import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EventCard, { Event as CardEvent } from "../event-card";
import { BeeMascot, DesktopSidebar } from "../../src/components/buzzup-ui";
import { useAuthUser } from "../../src/hooks/useAuthUser";
import { getEventsByIds } from "../../src/services/eventsService";
import { getUserFavoritedEvents, toggleFavorite } from "../../src/services/interactionsService";
import { buzzup } from "../../src/theme/buzzup-theme";

export default function SavedScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const { user } = useAuthUser();
  const [events, setEvents] = useState<CardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user?.uid) { setEvents([]); setLoading(false); return; }
    setLoading(true);
    const ids = await getUserFavoritedEvents(user.uid);
    const loaded = await getEventsByIds(ids);
    setEvents(loaded.map((event) => ({ ...event, time: new Date(event.dateISO).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), category: "Club Event", isUserAttending: false })));
    setLoading(false);
  }, [user?.uid]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const unsave = async (id: string) => { if (!user?.uid) return; setEvents((current) => current.filter((event) => event.id !== id)); await toggleFavorite(user.uid, id); };
  const content = <ScrollView contentContainerStyle={{ padding: desktop ? 32 : 18, paddingBottom: 120, gap: 20, maxWidth: 1050, width: "100%", alignSelf: "center" }}><View><Text style={{ ...buzzup.type.display, color: buzzup.colors.cocoa }}>Saved events</Text><Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft }}>Your shortlist of campus happenings</Text></View>{loading ? <ActivityIndicator color={buzzup.colors.primaryPressed} /> : events.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>{events.map((event) => <View key={event.id} style={{ width: desktop ? "48.8%" : "100%" }}><EventCard event={event} onPress={(item) => router.push({ pathname: "/event-details-screen", params: { id: item.id } })} onFavorite={unsave} favorited /></View>)}</View> : <View style={{ paddingVertical: 70, alignItems: "center", gap: 12 }}><BeeMascot size={105} /><Text style={{ ...buzzup.type.title, color: buzzup.colors.cocoa }}>Nothing saved yet</Text><Text style={{ color: buzzup.colors.cocoaSoft, textAlign: "center" }}>Tap the bookmark on an event to keep it here.</Text></View>}</ScrollView>;
  if (desktop) return <View style={{ flex: 1, flexDirection: "row", backgroundColor: buzzup.colors.background }}><DesktopSidebar /><View style={{ flex: 1 }}>{content}</View></View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: buzzup.colors.background }} edges={["top"]}>{content}</SafeAreaView>;
}
