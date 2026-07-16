import { isDemoMode, supabase } from "../../data/supabaseClient";
import { getFollowing } from "./friendsService";
import { getEventsByIds } from "./eventsService";
import type { Event } from "../types";

export interface ActivityItem {
  id: string;
  type: "rsvp" | "like";
  userUid: string;
  userName: string;
  event: Event;
  createdAt: string;
}

interface RawActivity {
  type: "rsvp" | "like";
  userUid: string;
  eventId: string;
  createdAt: string;
}

/**
 * Recent RSVP/like activity from people the given user follows, computed at query
 * time (no DB trigger/activity-log table — mirrors this app's existing convention
 * of keeping all logic in the service layer).
 *
 * Demo mode always returns an empty feed: the demo AsyncStorage model only ever
 * tracks the one real logged-in user's own interactions, so there's no data to
 * show for the fake DEMO_USERS roster. See friendsService.getFollowers.
 *
 * Only shows activity from followees who've opted in via
 * user_profiles.activity_visible — see the migration for why this defaults to off.
 */
export const getFriendActivity = async (uid: string, limit: number = 20): Promise<ActivityItem[]> => {
  if (isDemoMode) return [];

  const followees = await getFollowing(uid);
  if (followees.size === 0) return [];

  const followeeIds = [...followees];

  const { data: visibleProfiles, error: profileError } = await supabase
    .from("user_profiles")
    .select("uid, name")
    .in("uid", followeeIds)
    .eq("activity_visible", true);

  if (profileError || !visibleProfiles || visibleProfiles.length === 0) {
    if (profileError) console.error("Error loading followee profiles:", profileError);
    return [];
  }

  const nameByUid = new Map<string, string>(visibleProfiles.map((p: any) => [p.uid, p.name]));
  const visibleUids = [...nameByUid.keys()];

  const [{ data: rsvpRows, error: rsvpError }, { data: likeRows, error: likeError }] = await Promise.all([
    supabase
      .from("event_rsvp")
      .select("event_id, firebase_uid, created_at")
      .in("firebase_uid", visibleUids)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("likes")
      .select("event_id, user_uid, created_at")
      .in("user_uid", visibleUids)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (rsvpError) console.error("Error loading friend RSVP activity:", rsvpError);
  if (likeError) console.error("Error loading friend like activity:", likeError);

  const rawItems: RawActivity[] = [
    ...(rsvpRows || []).map((row: any) => ({
      type: "rsvp" as const,
      userUid: row.firebase_uid,
      eventId: String(row.event_id),
      createdAt: row.created_at,
    })),
    ...(likeRows || []).map((row: any) => ({
      type: "like" as const,
      userUid: row.user_uid,
      eventId: String(row.event_id),
      createdAt: row.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  if (rawItems.length === 0) return [];

  const events = await getEventsByIds([...new Set(rawItems.map((item) => item.eventId))]);
  const eventById = new Map(events.map((event) => [event.id, event]));

  return rawItems
    .map((item): ActivityItem | null => {
      const event = eventById.get(item.eventId);
      if (!event) return null;
      return {
        id: `${item.type}-${item.eventId}-${item.userUid}`,
        type: item.type,
        userUid: item.userUid,
        userName: nameByUid.get(item.userUid) || "Someone",
        event,
        createdAt: item.createdAt,
      };
    })
    .filter((item): item is ActivityItem => item !== null);
};
