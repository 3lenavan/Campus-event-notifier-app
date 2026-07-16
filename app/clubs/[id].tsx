import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Club, getClubByIdSupabase, getEventsByClub } from "../../data/dataLoader";
import EventCard, { Event as CardEvent } from "../event-card";
import { BeeMascot, BuzzUpBrandLogo } from "../../src/components/buzzup-ui";
import { auth } from "../../src/lib/firebase";
import { getFollowedClubIds, toggleClubFollow } from "../../src/services/club-follow-service";
import { cancelRSVP, getUserRSVPdEvents, rsvpToEvent } from "../../src/services/interactionsService";
import { buzzup } from "../../src/theme/buzzup-theme";
import { showAlert } from "../../src/lib/alert";

const fallbackCover = require("../../assets/design/buzzup-desktop-ui-mockup.png");

export default function ClubDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState("");
  const [userRsvps, setUserRsvps] = useState<number[]>([]);
  const [rsvpLoadingEventId, setRsvpLoadingEventId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError("");
      try {
        const numericId = Number(id);
        const [loadedClub, events, rsvpIds, followedIds] = await Promise.all([
          getClubByIdSupabase(numericId),
          getEventsByClub(numericId),
          auth.currentUser ? getUserRSVPdEvents(auth.currentUser.uid) : Promise.resolve([]),
          auth.currentUser ? getFollowedClubIds(auth.currentUser.uid) : Promise.resolve(new Set<string>()),
        ]);
        if (!active) return;
        if (loadedClub) loadedClub.events = events;
        setClub(loadedClub);
        setUserRsvps(rsvpIds.map(Number));
        setFollowing(followedIds.has(String(id)));
      } catch (error) {
        console.error("Unable to load club profile:", error);
        if (active) setLoadError("We couldn’t load this club right now. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  const eventCards = useMemo<CardEvent[]>(() => (club?.events || []).map((event: any) => {
    const dateValue = event.dateISO || event.date;
    const date = new Date(dateValue);
    return {
      id: String(event.id),
      title: event.title,
      description: event.description || "",
      date: dateValue,
      dateISO: dateValue,
      time: Number.isNaN(date.getTime()) ? "Time TBA" : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      location: event.location || "Location TBA",
      category: club?.category || "Club Event",
      attendees: event.attendees || 0,
      imageUrl: event.imageUrl || club?.imageUrl,
      isUserAttending: userRsvps.includes(Number(event.id)),
    };
  }), [club, userRsvps]);

  const handleFollow = async () => {
    const user = auth.currentUser;
    if (!user) {
      showAlert("Login required", "Sign in to follow clubs and receive updates.");
      return;
    }
    setFollowError("");
    setFollowLoading(true);
    const previous = following;
    setFollowing(!previous);
    try {
      const followed = await toggleClubFollow(user.uid, String(id));
      const next = followed.has(String(id));
      setFollowing(next);
      AccessibilityInfo.announceForAccessibility(next ? `${club?.name} followed` : `${club?.name} unfollowed`);
    } catch (error) {
      console.error("Unable to update club follow:", error);
      setFollowing(previous);
      setFollowError("Couldn’t update your follow. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRSVP = async (eventId: string) => {
    const user = auth.currentUser;
    if (!user) {
      showAlert("Login required", "Please sign in before you RSVP.");
      return;
    }
    const numericId = Number(eventId);
    setRsvpLoadingEventId(numericId);
    const isGoing = userRsvps.includes(numericId);
    try {
      if (isGoing) {
        await cancelRSVP(user.uid, eventId);
        setUserRsvps((current) => current.filter((value) => value !== numericId));
      } else {
        await rsvpToEvent(user.uid, eventId);
        setUserRsvps((current) => current.includes(numericId) ? current : [...current, numericId]);
      }
    } catch (error) {
      console.error("Unable to update RSVP:", error);
      showAlert("Couldn’t update RSVP", "Please try again.");
    } finally {
      setRsvpLoadingEventId(null);
    }
  };

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: buzzup.colors.background }}><BeeMascot size={100} animated /><ActivityIndicator color={buzzup.colors.primaryPressed} /><Text style={{ color: buzzup.colors.cocoaSoft }}>Loading club profile…</Text></View>;
  }

  if (loadError || !club) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: buzzup.colors.background }}><Ionicons name="alert-circle-outline" size={42} color={buzzup.colors.coral} /><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa }}>{loadError || "Club not found"}</Text><Pressable onPress={() => router.replace("/(tabs)/discover")} style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: buzzup.colors.primary }}><Text style={{ color: buzzup.colors.cocoa, fontWeight: "800" }}>Back to Discover</Text></Pressable></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: club.name, headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: buzzup.colors.background }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 1180, alignSelf: "center", padding: desktop ? 32 : 16, paddingBottom: 70 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to Discover" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/discover")} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}><Ionicons name="arrow-back" size={23} color={buzzup.colors.cocoa} /><Text style={{ color: buzzup.colors.cocoa, fontWeight: "700" }}>Back to Discover</Text></Pressable>
            {desktop && <BuzzUpBrandLogo compact />}
          </View>

          <View style={{ height: desktop ? 310 : 230, borderRadius: buzzup.radius.xl, overflow: "hidden", backgroundColor: buzzup.colors.surfaceMuted }}>
            <Image source={club.imageUrl ? { uri: club.imageUrl } : fallbackCover} resizeMode="cover" style={{ width: "100%", height: "100%" }} accessibilityLabel={`${club.name} cover image`} />
            <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(33, 19, 5, 0.24)" } as any} />
            <View style={{ position: "absolute", left: desktop ? 32 : 18, right: desktop ? 32 : 18, bottom: desktop ? 26 : 18, flexDirection: "row", alignItems: "flex-end", gap: 18 }}>
              <View style={{ width: desktop ? 112 : 82, height: desktop ? 112 : 82, borderRadius: desktop ? 30 : 23, overflow: "hidden", borderWidth: 4, borderColor: buzzup.colors.surface, backgroundColor: buzzup.colors.surfaceMuted }}><Image source={club.imageUrl ? { uri: club.imageUrl } : fallbackCover} style={{ width: "100%", height: "100%" }} resizeMode="cover" /></View>
              <View style={{ flex: 1, paddingBottom: 5 }}><View style={{ alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: buzzup.colors.primary }}><Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoa, textTransform: "uppercase" }}>{club.category || "Campus club"}</Text></View><Text style={{ ...buzzup.type.display, color: buzzup.colors.white, fontSize: desktop ? 38 : 27, marginTop: 7, textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 8 }}>{club.name}</Text></View>
              {desktop && <Pressable accessibilityRole="button" accessibilityLabel={following ? `Unfollow ${club.name}` : `Follow ${club.name}`} accessibilityState={{ busy: followLoading }} onPress={handleFollow} disabled={followLoading} style={{ minWidth: 138, height: 50, borderRadius: 15, backgroundColor: following ? buzzup.colors.surface : buzzup.colors.green, borderWidth: 1, borderColor: following ? buzzup.colors.border : buzzup.colors.green, alignItems: "center", justifyContent: "center" }}><Text style={{ color: following ? buzzup.colors.cocoa : buzzup.colors.white, fontWeight: "900" }}>{followLoading ? "Updating…" : following ? "Following" : "Follow"}</Text></Pressable>}
            </View>
          </View>

          {!desktop && <Pressable accessibilityRole="button" accessibilityLabel={following ? `Unfollow ${club.name}` : `Follow ${club.name}`} accessibilityState={{ busy: followLoading }} onPress={handleFollow} disabled={followLoading} style={{ minHeight: 50, marginTop: 16, borderRadius: 15, backgroundColor: following ? buzzup.colors.surface : buzzup.colors.green, borderWidth: 1, borderColor: following ? buzzup.colors.border : buzzup.colors.green, alignItems: "center", justifyContent: "center" }}><Text style={{ color: following ? buzzup.colors.cocoa : buzzup.colors.white, fontWeight: "900" }}>{followLoading ? "Updating…" : following ? "Following" : "Follow"}</Text></Pressable>}
          {!!followError && <Text accessibilityRole="alert" style={{ color: buzzup.colors.red, marginTop: 10, fontWeight: "600" }}>{followError}</Text>}

          <View style={{ flexDirection: desktop ? "row" : "column", gap: 18, marginTop: 22 }}>
            <View style={{ flex: 1.45, padding: 22, borderRadius: buzzup.radius.lg, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border }}><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa, marginBottom: 10 }}>About this club</Text><Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft }}>{club.description || "This club hasn’t added a description yet."}</Text></View>
            <View style={{ flex: 1, padding: 22, borderRadius: buzzup.radius.lg, backgroundColor: buzzup.colors.surfaceMuted, borderWidth: 1, borderColor: buzzup.colors.border, gap: 13 }}><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa, marginBottom: 2 }}>Club details</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Ionicons name="pricetag-outline" size={19} color={buzzup.colors.primaryPressed} /><Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoa }}>{club.category || "Campus organization"}</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Ionicons name="school-outline" size={19} color={buzzup.colors.primaryPressed} /><Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoa }}>Campus community</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Ionicons name="calendar-outline" size={19} color={buzzup.colors.primaryPressed} /><Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoa }}>{eventCards.length} upcoming event{eventCards.length === 1 ? "" : "s"}</Text></View></View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 32, marginBottom: 16 }}><Text style={{ ...buzzup.type.h1, color: buzzup.colors.cocoa }}>Upcoming events</Text><Text style={{ ...buzzup.type.meta, color: buzzup.colors.green }}>{eventCards.length ? `${eventCards.length} scheduled` : "Check back soon"}</Text></View>
          {eventCards.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>{eventCards.map((event) => <View key={event.id} style={{ width: desktop ? "48.8%" : "100%", marginBottom: 4, opacity: rsvpLoadingEventId === Number(event.id) ? 0.65 : 1 }}><EventCard event={event} onPress={(item) => router.push({ pathname: "/event-details-screen", params: { id: item.id } })} onRSVP={handleRSVP} /></View>)}</View> : <View style={{ minHeight: 260, padding: 24, borderRadius: buzzup.radius.lg, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border, alignItems: "center", justifyContent: "center", gap: 10 }}><BeeMascot size={110} animated /><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa }}>No upcoming events yet</Text><Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft, textAlign: "center" }}>Follow {club.name} and check back soon for new campus buzz.</Text></View>}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
