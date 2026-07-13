import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getClubByIdSupabase, Club } from "../data/dataLoader";
import { AvatarGroup, BeeMascot, DesktopSidebar } from "../src/components/buzzup-ui";
import { useAuthUser } from "../src/hooks/useAuthUser";
import { getEventById } from "../src/services/eventsService";
import { getEventsInteractions, toggleFavorite, toggleLike, toggleRSVP } from "../src/services/interactionsService";
import { buzzup } from "../src/theme/buzzup-theme";
import type { Event } from "../src/types";
import { DemoEvent, getDemoEventById } from "../src/data/demo-events";

const fallbackImage = require("../assets/design/buzzup-mascot.png");

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const { user } = useAuthUser();
  const [event, setEvent] = useState<Event | DemoEvent | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [going, setGoing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      const loaded = getDemoEventById(id) || await getEventById(id);
      if (!active) return;
      setEvent(loaded);
      if (loaded?.clubId && !loaded.id.startsWith("demo-")) setClub(await getClubByIdSupabase(Number(loaded.clubId)));
      if (loaded && user?.uid && !loaded.id.startsWith("demo-")) {
        const state = await getEventsInteractions(user.uid, [loaded.id]);
        if (active) { setLiked(state.likedEvents.has(loaded.id)); setSaved(state.favoritedEvents.has(loaded.id)); setGoing(state.rsvpedEvents.has(loaded.id)); }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [id, user?.uid]);

  const withUser = () => { if (user?.uid) return user.uid; router.replace("/"); return null; };
  const perform = async (action: "like" | "save" | "rsvp") => {
    if (!event || busy) return;
    const isDemo = event.id.startsWith("demo-");
    const uid = isDemo ? "demo-user" : withUser(); if (!uid) return;
    setBusy(true);
    const previous = { liked, saved, going };
    if (action === "like") setLiked(!liked); if (action === "save") setSaved(!saved); if (action === "rsvp") setGoing(!going);
    try {
      if (!isDemo && action === "like") await toggleLike(uid, event.id);
      if (!isDemo && action === "save") await toggleFavorite(uid, event.id);
      if (!isDemo && action === "rsvp") await toggleRSVP(uid, event.id);
    } catch {
      setLiked(previous.liked); setSaved(previous.saved); setGoing(previous.going);
      Alert.alert("Something went wrong", "Please try that action again.");
    } finally { setBusy(false); }
  };
  const share = async () => { if (!event) return; await Share.share({ title: event.title, message: `${event.title}\n${formatDate(event.dateISO)} at ${event.location}\nShared from BuzzUp` }); };

  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: buzzup.colors.background }}><ActivityIndicator color={buzzup.colors.primaryPressed} /></View>;
  if (!event) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: buzzup.colors.background }}><BeeMascot size={110} /><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa }}>Event not found</Text><Pressable onPress={() => router.replace("/(tabs)/home")}><Text style={{ color: buzzup.colors.green, fontWeight: "800" }}>Back to events</Text></Pressable></View>;

  const eventTime = new Date(event.dateISO).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const content = (
    <ScrollView contentContainerStyle={{ paddingBottom: desktop ? 40 : 120, backgroundColor: buzzup.colors.background }}>
      <View style={{ height: desktop ? 430 : 340, maxWidth: desktop ? 1050 : undefined, width: "100%", alignSelf: "center", overflow: "hidden", borderBottomLeftRadius: desktop ? 28 : 0, borderBottomRightRadius: desktop ? 28 : 0 }}>
        <Image source={("imageSource" in event && event.imageSource) || (event.imageUrl ? { uri: event.imageUrl } : fallbackImage)} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityLabel={`${event.title} hero image`} />
        <View style={{ position: "absolute", top: desktop ? 22 : 52, left: 18, right: 18, flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/home")} style={iconButton}><Ionicons name="chevron-back" size={24} color={buzzup.colors.cocoa} /></Pressable>
          <View style={{ flexDirection: "row", gap: 10 }}><Pressable accessibilityLabel="Share event" onPress={share} style={iconButton}><Ionicons name="share-outline" size={22} color={buzzup.colors.cocoa} /></Pressable><Pressable accessibilityLabel={saved ? "Unsave event" : "Save event"} onPress={() => perform("save")} style={iconButton}><Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={22} color={saved ? buzzup.colors.blue : buzzup.colors.cocoa} /></Pressable></View>
        </View>
      </View>
      <View style={{ maxWidth: 900, width: "100%", alignSelf: "center", marginTop: desktop ? 24 : -22, padding: desktop ? 28 : 20, gap: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: buzzup.colors.background }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: buzzup.colors.blue }}><Text style={{ color: "white", fontWeight: "800", fontSize: 11 }}>{("category" in event ? event.category : "Club Event").toUpperCase()}</Text></View><Pressable accessibilityLabel={liked ? "Unlike event" : "Like event"} onPress={() => perform("like")} style={iconButton}><Ionicons name={liked ? "heart" : "heart-outline"} size={23} color={liked ? buzzup.colors.red : buzzup.colors.cocoa} /></Pressable></View>
        <Text selectable style={{ ...buzzup.type.display, color: buzzup.colors.cocoa }}>{event.title}</Text>
        <View style={{ gap: 13 }}>
          <Detail icon="calendar-outline" text={`${formatDate(event.dateISO)} · ${eventTime}`} />
          <Detail icon="location-outline" text={event.location} />
          <Detail icon="business-outline" text={club?.name || "Campus organization"} />
        </View>
        <AvatarGroup count={event.attendees || 0} />
        <Text selectable style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft }}>{event.description}</Text>
        <View style={{ minHeight: 135, padding: 18, borderRadius: 20, backgroundColor: buzzup.colors.surfaceMuted, flexDirection: "row", alignItems: "center" }}><View style={{ flex: 1 }}><Text style={{ ...buzzup.type.title, color: buzzup.colors.cocoa }}>Ready to join the buzz?</Text><Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft, marginTop: 6 }}>Save your spot and we’ll keep this event handy.</Text></View><BeeMascot size={110} /></View>
        <Pressable disabled={busy || event.status !== "approved"} accessibilityLabel={going ? "Cancel RSVP" : "RSVP to event"} onPress={() => perform("rsvp")} style={({ pressed }) => ({ minHeight: 58, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: event.status !== "approved" ? buzzup.colors.border : pressed ? buzzup.colors.primaryPressed : buzzup.colors.primary, opacity: busy ? 0.7 : 1 })}><Text style={{ color: buzzup.colors.cocoa, fontSize: 17, fontWeight: "900" }}>{event.status !== "approved" ? "Event unavailable" : going ? "Cancel RSVP" : "RSVP — Free"}</Text></Pressable>
      </View>
    </ScrollView>
  );

  if (desktop) return <View style={{ flex: 1, flexDirection: "row", backgroundColor: buzzup.colors.background }}><DesktopSidebar /><View style={{ flex: 1 }}>{content}</View></View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: buzzup.colors.background }} edges={["bottom"]}>{content}<View style={{ position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 74, paddingHorizontal: 22, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: buzzup.colors.surface, borderTopWidth: 1, borderTopColor: buzzup.colors.border }}>{[["home", "Home", "/(tabs)/home"], ["compass", "Discover", "/(tabs)/discover"], ["add-circle-outline", "Create", "/(tabs)/create-event"], ["bookmark-outline", "Saved", "/(tabs)/saved"], ["person-outline", "Profile", "/(tabs)/profile"]].map(([icon, label, href]) => <Pressable key={label} onPress={() => router.push(href as any)} style={{ minWidth: 52, alignItems: "center", gap: 3 }}><Ionicons name={icon as any} size={22} color={buzzup.colors.cocoa} /><Text style={{ color: buzzup.colors.cocoa, fontSize: 10, fontWeight: "600" }}>{label}</Text></Pressable>)}</View></SafeAreaView>;
}

const iconButton = { width: 44, height: 44, borderRadius: 15, backgroundColor: buzzup.colors.surface, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1, borderColor: buzzup.colors.border };
function Detail({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Ionicons name={icon} size={20} color={buzzup.colors.cocoaSoft} /><Text selectable style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft }}>{text}</Text></View>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date TBA" : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
