import AsyncStorage from "@react-native-async-storage/async-storage";
import { CreateEventInput, Event, UserProfile } from "../src/types";

export interface DemoClub {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  verificationCode: string;
  codeHash: string;
  imageUrl?: string;
  createdAt: string;
}

type DemoInteraction = "likes" | "favorites" | "rsvps" | "checkins";
type InteractionMap = Record<string, string[]>;

export interface DemoUser {
  uid: string;
  name: string;
}

// A small fake roster so the friend search/follow feature has someone to find in
// demo mode. There's only ever one real logged-in user on-device in demo mode, so
// these can't follow you back or show up in an activity feed — see friendsService.ts.
export const DEMO_USERS: DemoUser[] = [
  { uid: "demo-user-maya", name: "Maya Chen" },
  { uid: "demo-user-jordan", name: "Jordan Patel" },
  { uid: "demo-user-sam", name: "Sam Rivera" },
  { uid: "demo-user-alex", name: "Alex Kim" },
];

const CUSTOM_EVENTS_KEY = "@buzzup/demo-events";
const PROFILES_KEY = "@buzzup/demo-profiles";
const interactionKey = (kind: DemoInteraction) => `@buzzup/demo-${kind}`;
const BASE_LIKE_COUNTS: Record<string, number> = {
  "900001": 18,
  "900002": 37,
  "900003": 12,
  "900004": 24,
};

export const DEMO_CLUBS: DemoClub[] = [
  {
    id: 1,
    slug: "coding-collective",
    name: "Coding Collective",
    description: "Build projects, swap ideas, and sharpen practical software skills together.",
    category: "Academic",
    verificationCode: "BUZZ-CODE",
    codeHash: "",
    imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    createdAt: "2026-01-10T12:00:00.000Z",
  },
  {
    id: 2,
    slug: "campus-activities-board",
    name: "Campus Activities Board",
    description: "Plan social events that bring students together across campus.",
    category: "Social",
    verificationCode: "BUZZ-CAB",
    codeHash: "",
    imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    createdAt: "2026-01-10T12:00:00.000Z",
  },
  {
    id: 3,
    slug: "visual-arts-society",
    name: "Visual Arts Society",
    description: "A welcoming studio community for artists at every experience level.",
    category: "Arts",
    verificationCode: "BUZZ-ART",
    codeHash: "",
    imageUrl: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=1200&q=80",
    createdAt: "2026-01-10T12:00:00.000Z",
  },
  {
    id: 4,
    slug: "recreation-club",
    name: "Recreation Club",
    description: "Low-pressure games, outdoor activities, and friendly campus competition.",
    category: "Sports",
    verificationCode: "BUZZ-PLAY",
    codeHash: "",
    imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
    createdAt: "2026-01-10T12:00:00.000Z",
  },
  {
    id: 5,
    slug: "career-network",
    name: "Career Network",
    description: "Meet mentors, practice career skills, and connect with local employers.",
    category: "Career",
    verificationCode: "BUZZ-CAREER",
    codeHash: "",
    imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80",
    createdAt: "2026-01-10T12:00:00.000Z",
  },
];

const futureDate = (daysFromNow: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const buildSeedEvents = (): Event[] => [
  {
    id: "900001",
    title: "Build Night: Campus Tools",
    description: "Team up for a relaxed evening of coding, design, and rapid prototypes for campus life.",
    clubId: "1",
    dateISO: futureDate(2, 18, 30),
    location: "Innovation Lab 204",
    createdBy: "buzzup-demo",
    createdAt: Date.now() - 4000,
    status: "approved",
    imageUrl: DEMO_CLUBS[0].imageUrl,
    attendees: 28,
    checkinCode: "CHECKIN-BUILD",
  },
  {
    id: "900002",
    title: "Golden Hour Block Party",
    description: "Music, lawn games, food, and a sunset hangout with clubs from across campus.",
    clubId: "2",
    dateISO: futureDate(4, 17),
    location: "Campus Green",
    createdBy: "buzzup-demo",
    createdAt: Date.now() - 3000,
    status: "approved",
    imageUrl: DEMO_CLUBS[1].imageUrl,
    attendees: 64,
    checkinCode: "CHECKIN-BLOCK",
  },
  {
    id: "900003",
    title: "Paint and Pour: Honey Palette",
    description: "Create a warm-toned canvas with guided instruction and alcohol-free seasonal drinks.",
    clubId: "3",
    dateISO: futureDate(7, 19),
    location: "Arts Center Studio B",
    createdBy: "buzzup-demo",
    createdAt: Date.now() - 2000,
    status: "approved",
    imageUrl: DEMO_CLUBS[2].imageUrl,
    attendees: 19,
    checkinCode: "CHECKIN-PAINT",
  },
  {
    id: "900004",
    title: "Sunrise Campus 5K",
    description: "Run, jog, or walk a friendly loop followed by breakfast near the finish line.",
    clubId: "4",
    dateISO: futureDate(10, 8),
    location: "Athletics Pavilion",
    createdBy: "buzzup-demo",
    createdAt: Date.now() - 1000,
    status: "approved",
    imageUrl: DEMO_CLUBS[3].imageUrl,
    attendees: 41,
    checkinCode: "CHECKIN-RUN",
  },
];

const readCustomEvents = async (): Promise<Event[]> => {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Unable to read demo events:", error);
    return [];
  }
};

export const listDemoEvents = async (): Promise<Event[]> => {
  const customEvents = await readCustomEvents();
  return [...customEvents, ...buildSeedEvents()].sort(
    (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
  );
};

const randomCheckinCode = () => `CHECKIN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const createDemoEvent = async (
  eventInput: CreateEventInput,
  createdBy: string
): Promise<Event> => {
  const event: Event = {
    id: String(Date.now()),
    ...eventInput,
    createdBy,
    createdAt: Date.now(),
    status: "approved",
    attendees: 0,
    checkinCode: randomCheckinCode(),
  };
  const customEvents = await readCustomEvents();
  await AsyncStorage.setItem(CUSTOM_EVENTS_KEY, JSON.stringify([event, ...customEvents]));
  return event;
};

const readDemoProfiles = async (): Promise<Record<string, UserProfile>> => {
  try {
    const stored = await AsyncStorage.getItem(PROFILES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Unable to read demo profiles:", error);
    return {};
  }
};

export const getDemoProfile = async (uid: string): Promise<UserProfile | null> => {
  const profiles = await readDemoProfiles();
  return profiles[uid] || null;
};

export const saveDemoProfile = async (profile: UserProfile): Promise<UserProfile> => {
  const profiles = await readDemoProfiles();
  profiles[profile.uid] = profile;
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  return profile;
};

const readInteractions = async (kind: DemoInteraction): Promise<InteractionMap> => {
  try {
    const stored = await AsyncStorage.getItem(interactionKey(kind));
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error(`Unable to read demo ${kind}:`, error);
    return {};
  }
};

const writeInteractions = async (kind: DemoInteraction, value: InteractionMap) => {
  await AsyncStorage.setItem(interactionKey(kind), JSON.stringify(value));
};

export const hasDemoInteraction = async (
  kind: DemoInteraction,
  userId: string,
  eventId: string
) => {
  const interactions = await readInteractions(kind);
  return (interactions[eventId] || []).includes(userId);
};

export const setDemoInteraction = async (
  kind: DemoInteraction,
  userId: string,
  eventId: string,
  active: boolean
) => {
  const interactions = await readInteractions(kind);
  const users = new Set(interactions[eventId] || []);
  if (active) {
    users.add(userId);
  } else {
    users.delete(userId);
  }
  interactions[eventId] = [...users];
  await writeInteractions(kind, interactions);
};

export const toggleDemoInteraction = async (
  kind: DemoInteraction,
  userId: string,
  eventId: string
) => {
  const active = await hasDemoInteraction(kind, userId, eventId);
  await setDemoInteraction(kind, userId, eventId, !active);
  return !active;
};

export const getDemoUserEventIds = async (
  kind: DemoInteraction,
  userId: string
) => {
  const interactions = await readInteractions(kind);
  return Object.entries(interactions)
    .filter(([, users]) => users.includes(userId))
    .map(([eventId]) => eventId);
};

export const getDemoInteractionCounts = async (
  kind: "likes" | "rsvps" | "checkins",
  eventIds: string[]
): Promise<Record<string, number>> => {
  const interactions = await readInteractions(kind);
  const events = kind === "rsvps" ? await listDemoEvents() : [];
  const attendeeCounts = new Map(events.map((event) => [event.id, event.attendees || 0]));

  return Object.fromEntries(
    eventIds.map((eventId) => [
      eventId,
      (kind === "likes" ? BASE_LIKE_COUNTS[eventId] || 0 : kind === "rsvps" ? attendeeCounts.get(eventId) || 0 : 0) +
        (interactions[eventId]?.length || 0),
    ])
  );
};
