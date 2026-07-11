import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";

export interface Event {
  id: string;
  title: string;
  description: string;

  // Your original fields
  date?: string;
  time: string;

  // This is your ACTUAL date field from Supabase
  dateISO?: string;

  location: string;
  category: string;
  attendees?: number;
  maxAttendees?: number;
  imageUrl?: string;
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

export function EventCard({
  event,
  onPress,
  onLike,
  onFavorite,
  liked = false,
  favorited = false,
  likesCount,
  compact = false,
}: EventCardProps) {
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;

  // ALWAYS USE dateISO when available
  const getDisplayDate = () => {
    const rawDate = event.dateISO || event.date;
    if (!rawDate) return "No date";

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "Invalid date";

    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Academic: "#F59E0B",
      Social: "#10B981",
      Sports: "#EF4444",
      Arts: "#8B5CF6",
      Career: "#0EA5E9",
      Other: "#6B4E16",
    };
    return colors[category] || colors["Other"];
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => onPress(event)}
        activeOpacity={0.8}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: getCategoryColor(event.category) },
            ]}
          >
            <Text style={styles.badgeText}>{event.category}</Text>
          </View>
        </View>

        <View style={styles.iconRow}>
          <View style={styles.iconItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.subtitle}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.iconText, { color: colors.subtitle }]}>{getDisplayDate()}</Text>
          </View>
          <View style={styles.iconItem}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.subtitle}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.iconText, { color: colors.subtitle }]}>{event.time}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(event)}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              event.imageUrl ||
              "https://via.placeholder.com/400x300.png?text=Event+Image",
          }}
          style={styles.image}
          resizeMode="cover"
        />

        {(onLike || onFavorite) && (
          <View style={styles.imageOverlay}>
            {onLike && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onLike(event.id);
                }}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={24}
                  color={liked ? "#EF4444" : "#FFFFFF"}
                />
              </TouchableOpacity>
            )}
          {onFavorite && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onFavorite(event.id);
                }}
              >
                <Ionicons
                  name={favorited ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={favorited ? colors.secondary : "#FFFFFF"}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={[styles.cardContent, { backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.subtitle }]}>{event.location}</Text>
          </View>
          {typeof likesCount === "number" && likesCount > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="heart" size={14} color="#EF4444" />
              <Text style={styles.ratingText}>{likesCount}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {event.title}
        </Text>

        <Text style={[styles.description, { color: colors.subtitle }]} numberOfLines={2}>
          {event.description}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.text }]}>{getDisplayDate()}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.text }]}>{event.time}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.seeMoreButton, { backgroundColor: colors.primary }]}
          onPress={() => onPress(event)}
        >
          <Text style={styles.seeMoreText}>See more</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 0.5,
    shadowColor: "#4A2D00",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  imageContainer: {
    width: "100%",
    height: 240,
    position: "relative",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  cardContent: {
    padding: 18,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationText: {
    fontSize: 13,
    marginLeft: 4,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  ratingText: {
    fontSize: 13,
    color: "#EF4444",
    marginLeft: 4,
    fontWeight: "600",
  },

  title: {
    fontSize: 23,
    fontWeight: "800",
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    marginBottom: 16,
  },

  metaRow: {
    flexDirection: "row",
    marginBottom: 20,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },

  metaText: {
    marginLeft: 6,
    fontWeight: "500",
  },

  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
  },

  seeMoreText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },

  compactCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
  },

  compactTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  iconRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  iconItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },

  iconText: {
    fontSize: 13,
    fontWeight: "500",
  },

  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  badgeText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default EventCard;
