import * as Notifications from "expo-notifications";
import { Event } from "../types";
import { getEventsByIds } from "./eventsService";
import { getUserRSVPdEvents } from "./interactionsService";

/** Only the fields a reminder notification actually needs to render. */
export type EventReminderInput = Pick<Event, "id" | "title" | "dateISO" | "location">;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_WINDOWS: { key: "24h" | "1h"; hoursBefore: number }[] = [
  { key: "24h", hoursBefore: 24 },
  { key: "1h", hoursBefore: 1 },
];

const reminderIdentifier = (eventId: string, windowKey: "24h" | "1h") =>
  `event-reminder:${eventId}:${windowKey}`;

/**
 * Read the current notification permission status without prompting the user.
 */
export const getNotificationPermissionStatus = async (): Promise<"granted" | "denied"> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted" ? "granted" : "denied";
  } catch (error) {
    console.error("Error reading notification permission status:", error);
    return "denied";
  }
};

/**
 * Request local notification permission, creating the Android channel reminders are posted to.
 */
export const requestNotificationPermission = async (): Promise<"granted" | "denied"> => {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    // No-ops on platforms other than Android (see expo-notifications' own
    // platform-specific implementation), so this is safe to call unconditionally.
    await Notifications.setNotificationChannelAsync("event-reminders", {
      name: "Event reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    return status === "granted" ? "granted" : "denied";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return "denied";
  }
};

const scheduleReminder = async (
  event: EventReminderInput,
  windowKey: "24h" | "1h",
  hoursBefore: number
): Promise<void> => {
  const identifier = reminderIdentifier(event.id, windowKey);
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  const triggerDate = new Date(new Date(event.dateISO).getTime() - hoursBefore * 60 * 60 * 1000);
  if (triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: `Upcoming: ${event.title}`,
      body: `${event.location} • ${windowKey === "24h" ? "Tomorrow" : "In 1 hour"}`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
};

/**
 * Schedule (or reschedule) the 24h/1h-before local reminders for an event.
 */
export const scheduleEventReminders = async (event: EventReminderInput): Promise<void> => {
  try {
    for (const { key, hoursBefore } of REMINDER_WINDOWS) {
      await scheduleReminder(event, key, hoursBefore);
    }
  } catch (error) {
    console.error("Error scheduling event reminders:", error);
  }
};

/**
 * Cancel any scheduled reminders for an event (e.g. after cancelling an RSVP).
 */
export const cancelEventReminders = async (eventId: string): Promise<void> => {
  try {
    for (const { key } of REMINDER_WINDOWS) {
      await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(eventId, key)).catch(
        () => {}
      );
    }
  } catch (error) {
    console.error("Error cancelling event reminders:", error);
  }
};

/**
 * Cancel every reminder this app has scheduled (e.g. the user turned notifications off).
 */
export const cancelAllReminders = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error cancelling all reminders:", error);
  }
};

/**
 * Reconcile scheduled reminders against the user's current RSVP list.
 * Call on login/app foreground.
 */
export const syncRemindersForUser = async (uid: string): Promise<void> => {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") return;

    const rsvpedIds = await getUserRSVPdEvents(uid);
    if (!rsvpedIds.length) return;

    const events = await getEventsByIds(rsvpedIds);
    for (const event of events) {
      await scheduleEventReminders(event);
    }
  } catch (error) {
    console.error("Error syncing reminders for user:", error);
  }
};

const notifyNow = async (title: string, body: string): Promise<void> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch (error) {
    console.error("Error showing immediate notification:", error);
  }
};

export const notifyRSVPConfirmation = async (eventTitle: string): Promise<void> => {
  await notifyNow("RSVP Confirmed", `You RSVP'd for ${eventTitle}`);
};

export const notifyApprovalUpdate = async (eventTitle: string, approved: boolean): Promise<void> => {
  const status = approved ? "approved" : "rejected";
  await notifyNow("Event Update", `${eventTitle} was ${status}`);
};
