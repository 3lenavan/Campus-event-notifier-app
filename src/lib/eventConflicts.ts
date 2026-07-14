import { Event } from "../types";

/**
 * Events have no explicit end time in this app's data model. Assume a fixed 2-hour
 * duration for conflict purposes, matching the same assumption the .ics calendar
 * export already makes (see app/event-details-screen.tsx's handleAddToCalendar).
 */
export const DEFAULT_EVENT_DURATION_MINUTES = 120;

export type ConflictCandidate = Pick<Event, "id" | "title" | "dateISO">;

export interface ConflictWarning {
  event: ConflictCandidate;
  message: string;
}

const getEventWindow = (dateISO: string, durationMinutes: number) => {
  const start = new Date(dateISO).getTime();
  return { start, end: start + durationMinutes * 60 * 1000 };
};

const windowsOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && bStart < aEnd;

/**
 * Check whether a candidate event's time window overlaps with any event the user
 * has already RSVP'd to. Purely informational (non-blocking) — callers decide
 * whether/how to surface this to the user.
 */
export const checkPersonalConflicts = (
  candidate: ConflictCandidate,
  rsvpedEvents: ConflictCandidate[],
  durationMinutes: number = DEFAULT_EVENT_DURATION_MINUTES
): ConflictWarning[] => {
  const candidateWindow = getEventWindow(candidate.dateISO, durationMinutes);

  return rsvpedEvents
    .filter((event) => event.id !== candidate.id)
    .filter((event) => {
      const window = getEventWindow(event.dateISO, durationMinutes);
      return windowsOverlap(candidateWindow.start, candidateWindow.end, window.start, window.end);
    })
    .map((event) => ({
      event,
      message: `Overlaps with "${event.title}", which you're already RSVP'd to.`,
    }));
};
