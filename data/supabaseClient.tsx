// cSpell:ignore supabase
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const hasPlaceholderConfig =
  SUPABASE_URL?.includes("placeholder.supabase.co") ||
  SUPABASE_ANON_KEY === "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !hasPlaceholderConfig
);

export const isDemoMode =
  process.env.EXPO_PUBLIC_DEMO_MODE === "true" || !isSupabaseConfigured;

if (__DEV__ && isDemoMode) {
  console.info(
    "BuzzUp is running in demo mode. Add Supabase credentials to .env to use the live database."
  );
}

// Data services short-circuit before this fallback client can make requests.
export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL! : "http://127.0.0.1:54321",
  isSupabaseConfigured ? SUPABASE_ANON_KEY! : "buzzup-demo-anon-key"
);
