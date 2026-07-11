// interactionsService.ts
// Likes = Supabase
// Favorites = Supabase

import {
  getDemoInteractionCounts,
  getDemoUserEventIds,
  hasDemoInteraction,
  setDemoInteraction,
  toggleDemoInteraction,
} from "../../data/demoData";
import { isDemoMode, supabase } from "../../data/supabaseClient";
import { db } from "../lib/firebase"; // only needed for notifications etc., KEEPING

// Helper: event_id is bigint in Supabase, so always convert safely
const toBigIntId = (id: string | number): number => {
  const n = typeof id === "number" ? id : parseInt(String(id), 10);
  if (Number.isNaN(n)) throw new Error(`Invalid event_id: ${id}`);
  return n;
};

// SUPABASE LIKES
export const likeEvent = async (userId: string, eventId: string): Promise<void> => {
  if (isDemoMode) {
    await setDemoInteraction("likes", userId, eventId, true);
    return;
  }

  const { error } = await supabase.from("likes").insert({
    user_uid: userId,
    event_id: eventId,
  });

  if (error) {
    console.error("Error liking event:", error);
    throw error;
  }
};

export const unlikeEvent = async (userId: string, eventId: string): Promise<void> => {
  if (isDemoMode) {
    await setDemoInteraction("likes", userId, eventId, false);
    return;
  }

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("user_uid", userId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error unliking event:", error);
    throw error;
  }
};

export const isEventLiked = async (userId: string, eventId: string): Promise<boolean> => {
  if (isDemoMode) {
    return hasDemoInteraction("likes", userId, eventId);
  }

  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("user_uid", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Error checking like:", error);
    return false;
  }

  return !!data;
};

export const getEventLikeCount = async (eventId: string): Promise<number> => {
  if (isDemoMode) {
    const counts = await getDemoInteractionCounts("likes", [eventId]);
    return counts[eventId] || 0;
  }

  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    console.error("Error getting like count:", error);
    return 0;
  }

  return count || 0;
};

export const toggleLike = async (userId: string, eventId: string): Promise<boolean> => {
  if (isDemoMode) {
    return toggleDemoInteraction("likes", userId, eventId);
  }

  const liked = await isEventLiked(userId, eventId);

  if (liked) {
    await unlikeEvent(userId, eventId);
    return false;
  } else {
    await likeEvent(userId, eventId);
    return true;
  }
};

export const getUserLikedEvents = async (userId: string): Promise<string[]> => {
  if (isDemoMode) {
    return getDemoUserEventIds("likes", userId);
  }

  const { data, error } = await supabase
    .from("likes")
    .select("event_id")
    .eq("user_uid", userId);

  if (error) {
    console.error("Error getting liked events:", error);
    return [];
  }

  return data.map((row: any) => row.event_id);
};

// SUPABASE FAVORITES — THIS SECTION IS EXACTLY WHAT YOU ALREADY HAD
export const favoriteEvent = async (userId: string, eventId: string): Promise<void> => {
  if (isDemoMode) {
    await setDemoInteraction("favorites", userId, eventId, true);
    return;
  }

  const { error } = await supabase.from("favorites").insert({
    user_uid: userId,
    event_id: eventId,
  });

  if (error) {
    console.error("Error favoriting event:", error);
    throw error;
  }
};

export const unfavoriteEvent = async (userId: string, eventId: string): Promise<void> => {
  if (isDemoMode) {
    await setDemoInteraction("favorites", userId, eventId, false);
    return;
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_uid", userId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error unfavoriting:", error);
    throw error;
  }
};

export const isEventFavorited = async (userId: string, eventId: string): Promise<boolean> => {
  if (isDemoMode) {
    return hasDemoInteraction("favorites", userId, eventId);
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_uid", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Error checking favorite:", error);
    return false;
  }

  return !!data;
};

export const getUserFavoritedEvents = async (userId: string): Promise<string[]> => {
  if (isDemoMode) {
    return getDemoUserEventIds("favorites", userId);
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("event_id")
    .eq("user_uid", userId);

  if (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }

  return data.map((row: any) => row.event_id);
};

export const toggleFavorite = async (userId: string, eventId: string): Promise<boolean> => {
  if (isDemoMode) {
    return toggleDemoInteraction("favorites", userId, eventId);
  }

  const isFav = await isEventFavorited(userId, eventId);

  if (isFav) {
    await unfavoriteEvent(userId, eventId);
    return false;
  } else {
    await favoriteEvent(userId, eventId);
    return true;
  }
};

// SUPABASE RSVPs
export const rsvpToEvent = async (
  userId: string,
  eventId: string
): Promise<void> => {
  if (isDemoMode) {
    await setDemoInteraction("rsvps", userId, eventId, true);
    return;
  }

  const payload = {
    firebase_uid: userId,
    event_id: toBigIntId(eventId),
  };

  const { error } = await supabase
    .from("event_rsvp")
    .upsert(payload, { onConflict: "event_id,firebase_uid" });

  if (error) {
    console.error("Error RSVPing to event:", error);
    throw error;
  }
};

export const cancelRSVP = async (userId: string, eventId: string): Promise<void> => {
  if (isDemoMode) {
    await setDemoInteraction("rsvps", userId, eventId, false);
    return;
  }

  const eid = toBigIntId(eventId);

  const { error } = await supabase
    .from("event_rsvp")
    .delete()
    .eq("firebase_uid", userId)
    .eq("event_id", eid); // ✅ bigint-safe

  if (error) {
    console.error("Error canceling RSVP:", error);
    throw error;
  }
};

export const isEventRSVPd = async (userId: string, eventId: string): Promise<boolean> => {
  if (isDemoMode) {
    return hasDemoInteraction("rsvps", userId, eventId);
  }

  const eid = toBigIntId(eventId);

  const { data, error } = await supabase
    .from("event_rsvp")
    .select("id")
    .eq("firebase_uid", userId)
    .eq("event_id", eid) // ✅ bigint-safe
    .maybeSingle();

  if (error) {
    console.error("Error checking RSVP:", error);
    return false;
  }

  return !!data;
};

export const getUserRSVPdEvents = async (userId: string): Promise<string[]> => {
  if (isDemoMode) {
    return getDemoUserEventIds("rsvps", userId);
  }

  const { data, error } = await supabase
    .from("event_rsvp")
    .select("event_id")
    .eq("firebase_uid", userId);

  if (error) {
    console.error("Error getting RSVP'd events:", error);
    return [];
  }

  return (data || []).map((row: any) => String(row.event_id));
};

export const toggleRSVP = async (
  userId: string,
  eventId: string
): Promise<boolean> => {
  if (isDemoMode) {
    return toggleDemoInteraction("rsvps", userId, eventId);
  }

  const isRSVPd = await isEventRSVPd(userId, eventId);

  if (isRSVPd) {
    await cancelRSVP(userId, eventId);
    return false;
  } else {
    await rsvpToEvent(userId, eventId);
    return true;
  }
};

/**
 * Get attendee counts for multiple events
 * Returns a map of eventId -> attendee count
 */
export const getEventAttendeeCounts = async (
  eventIds: string[]
): Promise<Record<string, number>> => {
  if (eventIds.length === 0) return {};

  if (isDemoMode) {
    return getDemoInteractionCounts("rsvps", eventIds);
  }

  try {
    // Convert string IDs to numbers
    const numericIds = eventIds
      .map((id) => {
        const num = parseInt(id);
        return isNaN(num) ? null : num;
      })
      .filter((id): id is number => id !== null);

    if (numericIds.length === 0) return {};

    // Query all RSVPs for these events
    const { data, error } = await supabase
      .from("event_rsvp")
      .select("event_id")
      .in("event_id", numericIds);

    if (error) {
      console.error("Error getting attendee counts:", error);
      return {};
    }

    // Count RSVPs per event
    const counts: Record<string, number> = {};
    eventIds.forEach((id) => (counts[id] = 0)); // Initialize all to 0

    if (data) {
      data.forEach((row: any) => {
        const eventId = String(row.event_id);
        if (counts.hasOwnProperty(eventId)) {
          counts[eventId] = (counts[eventId] || 0) + 1;
        }
      });
    }

    return counts;
  } catch (error) {
    console.error("Error getting attendee counts:", error);
    return {};
  }
};

/**
 * Get attendee count for a single event
 */
export const getEventAttendeeCount = async (eventId: string): Promise<number> => {
  const counts = await getEventAttendeeCounts([eventId]);
  return counts[eventId] || 0;
};

// Combined Loader (Home + Discover + Profile use this)
export const getEventsInteractions = async (
  userId: string,
  eventIds: string[]
): Promise<{
  likedEvents: Set<string>;
  favoritedEvents: Set<string>;
  rsvpedEvents: Set<string>;
  likeCounts: Record<string, number>;
}> => {
  if (isDemoMode) {
    const [likedIds, favoriteIds, rsvpIds, likeCounts] = await Promise.all([
      getDemoUserEventIds("likes", userId),
      getDemoUserEventIds("favorites", userId),
      getDemoUserEventIds("rsvps", userId),
      getDemoInteractionCounts("likes", eventIds),
    ]);
    return {
      likedEvents: new Set(likedIds),
      favoritedEvents: new Set(favoriteIds),
      rsvpedEvents: new Set(rsvpIds),
      likeCounts,
    };
  }

  const likedEvents = new Set<string>();
  const favoritedEvents = new Set<string>();
  const rsvpedEvents = new Set<string>();
  const likeCounts: Record<string, number> = {};

  // Initialize like counts
  eventIds.forEach((id) => (likeCounts[id] = 0));

  // Load likes from Supabase
  for (const id of eventIds) {
    const count = await getEventLikeCount(id);
    likeCounts[id] = count;

    const liked = await isEventLiked(userId, id);
    if (liked) likedEvents.add(id);
  }

  // Load favorites from Supabase
  const favorites = await getUserFavoritedEvents(userId);
  favorites.forEach((id) => favoritedEvents.add(id.toString()));

  // Load RSVPs from Supabase
  const rsvps = await getUserRSVPdEvents(userId);
  rsvps.forEach((id) => rsvpedEvents.add(id.toString()));

  return { likedEvents, favoritedEvents, rsvpedEvents, likeCounts };
};
