import { Ionicons } from "@expo/vector-icons";
import { Image, ImageSourcePropType, Pressable, Text, View } from "react-native";
import { AvatarGroup } from "../src/components/buzzup-ui";
import { buzzup } from "../src/theme/buzzup-theme";

const fallbackImage = require("../assets/design/buzzup-mascot.png");

export interface Event {
  id: string;
  title: string;
  description: string;
  date?: string;
  dateISO?: string;
  time: string;
  location: string;
  category: string;
  attendees?: number;
  maxAttendees?: number;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  isUserAttending?: boolean;
}

interface EventCardProps {
  event: Event;
  onPress: (event: Event) => void;
  onRSVP?: (eventId: string) => void;
  onLike?: (eventId: string) => void;
  onFavorite?: (eventId: string) => void;
  liked?: boolean;
  favorited?: boolean;
  likesCount?: number;
  compact?: boolean;
}

const categoryColor = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes("music") || value.includes("club")) return buzzup.colors.blue;
  if (value.includes("art")) return buzzup.colors.coral;
  if (value.includes("sport") || value.includes("outdoor")) return buzzup.colors.green;
  return buzzup.colors.blue;
};

export function EventCard({ event, onPress, onRSVP, onLike, onFavorite, liked = false, favorited = false, compact = false }: EventCardProps) {
  const rawDate = event.dateISO || event.date;
  const date = rawDate ? new Date(rawDate) : null;
  const displayDate = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "Date TBA";

  if (compact) {
    return (
      <Pressable accessibilityRole="button" onPress={() => onPress(event)} style={({ pressed }) => ({ padding: 14, borderRadius: 14, backgroundColor: pressed ? buzzup.colors.surfaceMuted : buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border, gap: 6 })}>
        <Text numberOfLines={1} style={{ ...buzzup.type.title, fontSize: 15, color: buzzup.colors.cocoa }}>{event.title}</Text>
        <Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}>{displayDate} · {event.time} · {event.location}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${event.title}`}
      onPress={() => onPress(event)}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, overflow: "hidden", borderRadius: buzzup.radius.lg, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border, opacity: pressed ? 0.94 : 1, boxShadow: `0 7px 20px ${buzzup.colors.shadow}` })}
    >
      <View style={{ height: 190 }}>
        <Image source={event.imageSource || (event.imageUrl ? { uri: event.imageUrl } : fallbackImage)} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityLabel={`${event.title} event image`} />
        <View style={{ position: "absolute", left: 12, top: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: categoryColor(event.category) }}>
          <Text style={{ color: buzzup.colors.white, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{event.category || "EVENT"}</Text>
        </View>
        {onLike && (
          <Pressable accessibilityLabel={liked ? "Unlike event" : "Like event"} onPress={(e) => { e.stopPropagation(); onLike(event.id); }} style={{ position: "absolute", right: 12, top: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: buzzup.colors.surface, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={21} color={liked ? buzzup.colors.red : buzzup.colors.cocoa} />
          </Pressable>
        )}
      </View>
      <View style={{ padding: 16, gap: 10 }}>
        <Text selectable numberOfLines={2} style={{ ...buzzup.type.title, color: buzzup.colors.cocoa }}>{event.title}</Text>
        <View style={{ gap: 5 }}>
          <Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}><Ionicons name="calendar-outline" size={13} />  {displayDate} · {event.time}</Text>
          <Text numberOfLines={1} style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}><Ionicons name="location-outline" size={13} />  {event.location}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <AvatarGroup count={event.attendees || 0} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {onFavorite && (
              <Pressable accessibilityLabel={favorited ? "Unsave event" : "Save event"} onPress={(e) => { e.stopPropagation(); onFavorite(event.id); }} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: buzzup.colors.border, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={favorited ? "bookmark" : "bookmark-outline"} size={20} color={favorited ? buzzup.colors.blue : buzzup.colors.cocoa} />
              </Pressable>
            )}
            {onRSVP && (
              <Pressable accessibilityLabel={event.isUserAttending ? "Cancel RSVP" : "RSVP to event"} onPress={(e) => { e.stopPropagation(); onRSVP(event.id); }} style={{ minWidth: 76, height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: buzzup.colors.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: buzzup.colors.cocoa, fontWeight: "900" }}>{event.isUserAttending ? "Going" : "RSVP"}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default EventCard;
