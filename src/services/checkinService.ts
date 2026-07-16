import { getDemoInteractionCounts, hasDemoInteraction, setDemoInteraction } from "../../data/demoData";
import { isDemoMode, supabase } from "../../data/supabaseClient";
import { Event, UserProfile } from "../types";

const toBigIntId = (id: string | number): number => {
  const n = typeof id === "number" ? id : parseInt(String(id), 10);
  if (Number.isNaN(n)) throw new Error(`Invalid event_id: ${id}`);
  return n;
};

export interface CheckinStats {
  rsvpCount: number;
  checkedInCount: number;
  rate: number;
}

/** Payload to encode into the organizer's check-in QR for an event. */
export const getCheckinQrPayload = (event: Pick<Event, "id" | "checkinCode">): string =>
  `${event.id}:${event.checkinCode || ""}`;

/**
 * Whether the given user can view/generate the check-in QR and analytics for this event.
 * Reuses the same trust check CreateEvent.tsx already uses for who can post events for a
 * club (verified member of that club, or a global admin) — no new trust surface.
 */
export const canManageCheckin = (
  event: Pick<Event, "clubId">,
  profile: UserProfile | null | undefined,
  userClubIds: string[]
): boolean => {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  return userClubIds.includes(event.clubId);
};

/** Whether it's currently within the check-in window for an event (opens 30 min before start, stays open for the rest of the day). */
export const isWithinCheckinWindow = (eventDateISO: string, now: Date = new Date()): boolean => {
  const start = new Date(eventDateISO).getTime();
  const windowStart = start - 30 * 60 * 1000;
  const windowEnd = start + 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  return nowMs >= windowStart && nowMs <= windowEnd;
};

export const checkInAttendee = async (
  event: Pick<Event, "id" | "checkinCode">,
  userId: string,
  scannedPayload: string
): Promise<{ success: boolean; message: string }> => {
  const [scannedEventId, scannedCode] = scannedPayload.split(":");

  if (scannedEventId !== event.id) {
    return { success: false, message: "This code is for a different event." };
  }
  if (!event.checkinCode || scannedCode !== event.checkinCode) {
    return { success: false, message: "Invalid check-in code." };
  }

  if (isDemoMode) {
    await setDemoInteraction("checkins", userId, event.id, true);
    return { success: true, message: "You're checked in!" };
  }

  const { error } = await supabase
    .from("event_checkins")
    .upsert({ event_id: toBigIntId(event.id), user_uid: userId }, { onConflict: "event_id,user_uid" });

  if (error) {
    console.error("Error checking in:", error);
    return { success: false, message: "Could not check in. Please try again." };
  }

  return { success: true, message: "You're checked in!" };
};

export const hasCheckedIn = async (eventId: string, userId: string): Promise<boolean> => {
  if (isDemoMode) {
    return hasDemoInteraction("checkins", userId, eventId);
  }

  const { data, error } = await supabase
    .from("event_checkins")
    .select("id")
    .eq("event_id", toBigIntId(eventId))
    .eq("user_uid", userId)
    .maybeSingle();

  if (error) {
    console.error("Error checking check-in status:", error);
    return false;
  }

  return !!data;
};

export const getCheckinStats = async (eventId: string, rsvpCount: number): Promise<CheckinStats> => {
  let checkedInCount = 0;

  if (isDemoMode) {
    const counts = await getDemoInteractionCounts("checkins", [eventId]);
    checkedInCount = counts[eventId] || 0;
  } else {
    const { count, error } = await supabase
      .from("event_checkins")
      .select("*", { count: "exact", head: true })
      .eq("event_id", toBigIntId(eventId));

    if (error) {
      console.error("Error getting check-in stats:", error);
    } else {
      checkedInCount = count || 0;
    }
  }

  return {
    rsvpCount,
    checkedInCount,
    rate: rsvpCount > 0 ? checkedInCount / rsvpCount : 0,
  };
};
