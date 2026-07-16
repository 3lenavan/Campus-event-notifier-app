import { isDemoMode, supabase } from "../../data/supabaseClient";
import type { Event } from "../types";

export interface CampusLocation {
  id: string;
  name: string;
  xPct: number;
  yPct: number;
}

// Mirrors the seed rows in the campus_locations migration, so demo mode has the
// same building layout as a live Supabase project.
const DEMO_CAMPUS_LOCATIONS: CampusLocation[] = [
  { id: "innovation-lab", name: "Innovation Lab", xPct: 20, yPct: 25 },
  { id: "campus-green", name: "Campus Green", xPct: 50, yPct: 50 },
  { id: "arts-center", name: "Arts Center", xPct: 78, yPct: 22 },
  { id: "athletics-pavilion", name: "Athletics Pavilion", xPct: 82, yPct: 75 },
  { id: "student-center", name: "Student Center", xPct: 48, yPct: 78 },
  { id: "library", name: "Library", xPct: 22, yPct: 70 },
];

export const listCampusLocations = async (): Promise<CampusLocation[]> => {
  if (isDemoMode) return DEMO_CAMPUS_LOCATIONS;

  const { data, error } = await supabase.from("campus_locations").select("id, name, x_pct, y_pct").order("name");

  if (error) {
    console.error("Error listing campus locations:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: String(row.id),
    name: row.name,
    xPct: row.x_pct,
    yPct: row.y_pct,
  }));
};

/**
 * Matches an event's free-text location (e.g. "Innovation Lab - Room 204", or
 * older data like "Innovation Lab 204") to a known campus building by substring,
 * rather than requiring an exact "Building - Room ###" split — this stays lenient
 * for location strings created before the building picker existed.
 */
export const getLocationForEvent = (event: Pick<Event, "location">, locations: CampusLocation[]): CampusLocation | null => {
  const haystack = event.location.toLowerCase();
  return locations.find((location) => haystack.includes(location.name.toLowerCase())) || null;
};
