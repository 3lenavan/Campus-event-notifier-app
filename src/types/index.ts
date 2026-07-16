// User and Authentication Types
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  memberships: string[]; // <-- ADD THIS BACK
  activityVisible: boolean; // opt-in: show this user's RSVPs/likes to followers
}


// Club Types
export interface Club {
  id: string;                 // numeric id from Supabase
  slug: string;               // string identifier (e.g. "biology_club")
  name: string;
  category: string;
  verification_code: string;  // plaintext code stored
  code_hash: string;          // hashed code (used for verification)
  image_url?: string;         // optional club image
  created_at: string;
}

// Event Types
export interface Event {
  id: string;
  title: string;
  description: string;
  clubId: string;
  dateISO: string;
  location: string;
  createdBy: string;
  createdAt: number;
  status: "pending" | "approved" | "rejected";
  moderationNote?: string;
  imageUrl?: string;
  attendees?: number; // Number of people who RSVP'd to this event
  checkinCode?: string; // Code encoded in the organizer's check-in QR
}

// Service Types
export interface CreateEventInput {
  title: string;
  description: string;
  clubId: string;
  dateISO: string;
  location: string;
  imageUrl?: string;
}

export interface VerifyClubInput {
  clubInput: string;
  codePlaintext: string;
}
