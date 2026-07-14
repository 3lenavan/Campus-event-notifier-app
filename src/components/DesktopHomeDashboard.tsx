import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import EventCard, { Event as CardEvent } from "../../app/event-card";
import { Club } from "../types";
import { buzzup } from "../theme/buzzup-theme";
import { BeeMascot, FilterPills, NotificationButton, SearchBar } from "./buzzup-ui";

export type DesktopFeedEvent = CardEvent & {
  liked: boolean;
  favorited: boolean;
  likes: number;
};

type Props = {
  events: DesktopFeedEvent[];
  clubs: Club[];
  firstName: string;
  onPressEvent: (event: CardEvent) => void;
  onRSVP: (eventId: string) => void;
  onLike: (eventId: string) => void;
  onFavorite: (eventId: string) => void;
};

const filters = ["All", "Today", "This Week", "Clubs", "Sports", "Arts"];
const fallbackClubImage = require("../../assets/images/buzzup-mascot.png");

export function DesktopHomeDashboard({ events, clubs, firstName, onPressEvent, onRSVP, onLike, onFavorite }: Props) {
  const { width } = useWindowDimensions();
  const showRightRail = width >= 1280;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);
    return events.filter((event) => {
      const textMatch = `${event.title} ${event.description} ${event.location}`.toLowerCase().includes(query.toLowerCase());
      const eventDate = new Date(event.dateISO || event.date || 0);
      const filterMatch = filter === "All" || filter === "Clubs"
        || (filter === "Today" && eventDate.toDateString() === now.toDateString())
        || (filter === "This Week" && eventDate >= now && eventDate <= endOfWeek)
        || (filter === "Sports" && event.category.toLowerCase().includes("sport"))
        || (filter === "Arts" && event.category.toLowerCase().includes("art"));
      return textMatch && filterMatch;
    });
  }, [events, filter, query]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  }), []);

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: buzzup.colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 34, paddingRight: 24, paddingBottom: 70 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 150, marginBottom: 8 }}>
          <BeeMascot size={170} animated style={{ marginLeft: -18, marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...buzzup.type.display, color: buzzup.colors.cocoa, fontSize: 38 }}>Good morning, {firstName}!</Text>
            <Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft, marginTop: 4 }}>Here&apos;s what&apos;s buzzing on campus</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "flex-start", paddingTop: 18 }}>
            <NotificationButton />
            <Pressable accessibilityLabel="Open profile" onPress={() => router.push("/(tabs)/profile")} style={{ alignItems: "center", gap: 5 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: buzzup.colors.cocoa, borderWidth: 3, borderColor: buzzup.colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: buzzup.colors.primary, fontWeight: "900", fontSize: 18 }}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoa }}>{firstName}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 16, marginBottom: 26 }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search campus events" />
          <FilterPills options={filters} selected={filter} onSelect={setFilter} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa }}>Happening soon</Text>
          <Pressable onPress={() => setFilter("All")}><Text style={{ color: buzzup.colors.green, fontWeight: "700" }}>View all</Text></Pressable>
        </View>

        {filteredEvents.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
            {filteredEvents.map((event) => (
              <View key={event.id} style={{ width: "48.5%", flexBasis: "47%", marginBottom: 2 }}>
                <EventCard event={event} onPress={onPressEvent} onRSVP={onRSVP} onLike={onLike} onFavorite={onFavorite} liked={event.liked} favorited={event.favorited} likesCount={event.likes} />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ minHeight: 220, borderRadius: buzzup.radius.lg, borderWidth: 1, borderColor: buzzup.colors.border, backgroundColor: buzzup.colors.surface, alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Ionicons name="search-outline" size={34} color={buzzup.colors.cocoaSoft} />
            <Text style={{ ...buzzup.type.title, color: buzzup.colors.cocoa }}>No matching events</Text>
            <Text style={{ ...buzzup.type.body, color: buzzup.colors.cocoaSoft }}>Try another search or filter.</Text>
          </View>
        )}
      </ScrollView>

      {showRightRail && <ScrollView style={{ width: 350, borderLeftWidth: 1, borderLeftColor: buzzup.colors.border }} contentContainerStyle={{ padding: 24, gap: 18, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={{ minHeight: 226, overflow: "hidden", borderRadius: buzzup.radius.lg, padding: 22, backgroundColor: "#FFE179", borderWidth: 1, borderColor: buzzup.colors.primaryPressed }}>
          <Text style={{ ...buzzup.type.h1, color: buzzup.colors.cocoa, maxWidth: 165 }}>Never miss the buzz!</Text>
          <Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft, maxWidth: 165, marginTop: 8 }}>Follow clubs and RSVP to stay updated on the events you love.</Text>
          <BeeMascot size={154} animated style={{ position: "absolute", right: -18, bottom: -14 }} />
        </View>

        <View style={{ borderRadius: buzzup.radius.lg, padding: 16, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa, fontSize: 19 }}>Your week</Text>
            <Text style={{ ...buzzup.type.meta, color: buzzup.colors.green }}>View calendar</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            {weekDays.map((day, index) => (
              <View key={day.toISOString()} style={{ width: 36, paddingVertical: 7, borderRadius: 10, alignItems: "center", backgroundColor: index === 0 ? buzzup.colors.surfaceMuted : "transparent", borderWidth: index === 0 ? 1 : 0, borderColor: buzzup.colors.primary }}>
                <Text style={{ fontSize: 9, color: buzzup.colors.cocoaSoft }}>{day.toLocaleDateString("en-US", { weekday: "short" })}</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: buzzup.colors.cocoa, marginTop: 3 }}>{day.getDate()}</Text>
              </View>
            ))}
          </View>
          <Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoa, marginBottom: 10 }}>{Math.min(events.length, 2)} events coming up</Text>
          {events.slice(0, 2).map((event) => (
            <Pressable key={event.id} onPress={() => onPressEvent(event)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: buzzup.colors.border }}>
              <Image source={event.imageUrl ? { uri: event.imageUrl } : fallbackClubImage} style={{ width: 64, height: 44, borderRadius: 9 }} />
              <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: "800", color: buzzup.colors.cocoa, fontSize: 12 }}>{event.title}</Text><Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}>{event.time} · {event.location}</Text></View>
              <Ionicons name="heart" color={buzzup.colors.red} size={16} />
            </Pressable>
          ))}
        </View>

        <View style={{ borderRadius: buzzup.radius.lg, padding: 16, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><Text style={{ ...buzzup.type.h2, color: buzzup.colors.cocoa, fontSize: 19 }}>Trending clubs</Text><Text style={{ ...buzzup.type.meta, color: buzzup.colors.green }}>View all</Text></View>
          {clubs.slice(0, 3).map((club) => (
            <Pressable key={club.id} onPress={() => router.push({ pathname: "/clubs/[id]", params: { id: club.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: buzzup.colors.border }}>
              <Image source={club.image_url ? { uri: club.image_url } : fallbackClubImage} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: buzzup.colors.surfaceMuted }} />
              <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontWeight: "800", color: buzzup.colors.cocoa }}>{club.name}</Text><Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}>{club.category}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={buzzup.colors.cocoaSoft} />
            </Pressable>
          ))}
        </View>
      </ScrollView>}
    </View>
  );
}
