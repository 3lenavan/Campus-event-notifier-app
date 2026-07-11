import { DEMO_CLUBS, listDemoEvents } from "./demoData";
import { isDemoMode, supabase } from "./supabaseClient";

export interface Club {
  id: number;
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string; // camelCase for the UI
  events?: any[]; // holds fetched or related events
}

// Fetch all clubs and include their upcoming events count
export async function getClubs(): Promise<Club[]> {
  if (isDemoMode) {
    const events = await listDemoEvents();
    const now = Date.now();
    return DEMO_CLUBS.map((club) => ({
      id: club.id,
      name: club.name,
      description: club.description,
      category: club.category,
      imageUrl: club.imageUrl,
      events: events.filter(
        (event) =>
          event.clubId === String(club.id) &&
          event.status === "approved" &&
          new Date(event.dateISO).getTime() > now
      ),
    }));
  }

  const { data, error } = await supabase
    .from("clubs")
    .select(`
      id,
      name,
      description,
      category,
      image_url,
      events ( id, date )
    `);

  if (error) {
    console.error("Error fetching clubs:", error);
    return [];
  }

  // Only keep *future* events for each club
  const mapped = (data ?? []).map((row: any) => {
    const today = new Date();
    const upcomingEvents = (row.events || []).filter(
      (event: any) => event.date && new Date(event.date) >= today
    );

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      category: row.category ?? "Other",
      imageUrl: row.image_url ?? undefined,
      events: upcomingEvents, // store only upcoming events
    };
  });

  console.log("Fetched clubs with upcoming event counts:", mapped);
  return mapped;
}

// Fetch one club by ID and its related events
export async function getClubByIdSupabase(id: number): Promise<Club | null> {
  if (isDemoMode) {
    const club = DEMO_CLUBS.find((item) => item.id === id);
    if (!club) return null;
    return {
      id: club.id,
      name: club.name,
      description: club.description,
      category: club.category,
      imageUrl: club.imageUrl,
    };
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id, name, description, category, image_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching club by id:", error);
    return null;
  }
  if (!data) return null;

  // Fetch events linked to this club
  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", id)
    .order("date", { ascending: true });

  if (eventError) {
    console.error("Error fetching events for club:", eventError);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? "",
    category: data.category ?? "Other",
    imageUrl: data.image_url ?? undefined,
    events: events || [],
  };
}

// Fetch only events belonging to a specific club
export async function getEventsByClub(clubId: number) {
  if (isDemoMode) {
    const events = await listDemoEvents();
    return events
      .filter(
        (event) =>
          event.clubId === String(clubId) &&
          event.status === "approved" &&
          new Date(event.dateISO).getTime() > Date.now()
      )
      .map((event) => ({
        ...event,
        id: Number(event.id),
        date: new Date(event.dateISO).toLocaleDateString(),
        date_iso: event.dateISO,
      }));
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", clubId)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  console.log("Fetched events for club", clubId, data);
  return data || [];
}
