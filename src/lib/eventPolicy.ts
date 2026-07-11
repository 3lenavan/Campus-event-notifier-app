import { isDemoMode, supabase } from "../../data/supabaseClient";

export type EventPolicy = {
  enabledGlobal: boolean;
  enabledByClub: Record<string, boolean>;
  moderationMode: "off" | "clubModerator";
  limits: {
    maxPerClubPerDay: number;
    userCooldownMinutes: number;
    allowImages: boolean;
    maxImageMB: number;
    maxTitleLen: number;
    maxDescLen: number;
  };
};

const DEFAULT_POLICY: EventPolicy = {
  enabledGlobal: true,
  enabledByClub: {},
  moderationMode: "off",
  limits: {
    maxPerClubPerDay: 5,
    userCooldownMinutes: 30,
    allowImages: true,
    maxImageMB: 5,
    maxTitleLen: 100,
    maxDescLen: 500,
  },
};

// Helper: treat these as "expected" errors when RLS/auth blocks reads/writes
const isAuthOrRLSError = (error: any) => {
  const msg = (error?.message || "").toLowerCase();
  const status = (error as any)?.status;

  return (
    error?.code === "42501" || // RLS / insufficient_privilege
    error?.code === "PGRST301" || // PostgREST auth-related
    status === 401 ||
    msg.includes("401") ||
    msg.includes("jwt") ||
    msg.includes("unauthorized") ||
    msg.includes("permission") ||
    msg.includes("row-level security") ||
    msg.includes("row level security")
  );
};

/**
 * Get the current event policy with sensible defaults
 */
export const getEventPolicy = async (): Promise<EventPolicy> => {
  if (isDemoMode) {
    return DEFAULT_POLICY;
  }

  try {
    const { data, error } = await supabase
      .from("event_policy")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      // If it's a permission/authorization error (RLS or 401), silently use default policy
      // This is expected if RLS policies aren't set up yet or user is not authenticated
      if (isAuthOrRLSError(error)) {
        return DEFAULT_POLICY;
      }

      // For other errors, log but still return default
      console.warn("Error getting event policy from Supabase:", error.message);
      return DEFAULT_POLICY;
    }

    if (!data) {
      // If no policy exists, try to create default one (may fail due to RLS)
      try {
        await setEventPolicy(DEFAULT_POLICY);
      } catch (createError: any) {
        // If creation fails (likely due to RLS), that's okay - we'll use the default
        if (!isAuthOrRLSError(createError)) {
          console.warn("Could not create default event policy:", createError.message);
        }
      }
      return DEFAULT_POLICY;
    }

    // Transform Supabase data to EventPolicy interface
    return {
      enabledGlobal: data.enabled_global ?? DEFAULT_POLICY.enabledGlobal,
      enabledByClub: data.enabled_by_club ?? DEFAULT_POLICY.enabledByClub,
      moderationMode: data.moderation_mode ?? DEFAULT_POLICY.moderationMode,
      limits: {
        maxPerClubPerDay:
          data.limits?.max_per_club_per_day ?? DEFAULT_POLICY.limits.maxPerClubPerDay,
        userCooldownMinutes:
          data.limits?.user_cooldown_minutes ?? DEFAULT_POLICY.limits.userCooldownMinutes,
        allowImages: data.limits?.allow_images ?? DEFAULT_POLICY.limits.allowImages,
        maxImageMB: data.limits?.max_image_mb ?? DEFAULT_POLICY.limits.maxImageMB,
        maxTitleLen: data.limits?.max_title_len ?? DEFAULT_POLICY.limits.maxTitleLen,
        maxDescLen: data.limits?.max_desc_len ?? DEFAULT_POLICY.limits.maxDescLen,
      },
    };
  } catch (error) {
    console.error("Error getting event policy:", error);
    return DEFAULT_POLICY;
  }
};

/**
 * Set the event policy
 */
export const setEventPolicy = async (policy: EventPolicy): Promise<void> => {
  if (isDemoMode) {
    return;
  }

  try {
    const { error } = await supabase.from("event_policy").upsert(
      {
        id: 1,
        enabled_global: policy.enabledGlobal,
        enabled_by_club: policy.enabledByClub,
        moderation_mode: policy.moderationMode,
        limits: {
          max_per_club_per_day: policy.limits.maxPerClubPerDay,
          user_cooldown_minutes: policy.limits.userCooldownMinutes,
          allow_images: policy.limits.allowImages,
          max_image_mb: policy.limits.maxImageMB,
          max_title_len: policy.limits.maxTitleLen,
          max_desc_len: policy.limits.maxDescLen,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (error) {
      // If it's a permission/authorization error, don't throw - just log
      if (isAuthOrRLSError(error)) {
        console.log("Cannot set event policy (RLS/Unauthorized), using default policy");
        return; // Silently fail - default policy will be used
      }

      console.error("Error setting event policy in Supabase:", error);
      throw error;
    }
  } catch (error: any) {
    // If it's a permission/authorization error, don't throw
    if (isAuthOrRLSError(error)) {
      console.log("Cannot set event policy (RLS/Unauthorized), using default policy");
      return; // Silently fail - default policy will be used
    }

    console.error("Error setting event policy:", error);
    throw error;
  }
};

/**
 * Check if event creation is enabled for a specific club
 */
export const isCreationEnabledForClub = async (clubId: string): Promise<boolean> => {
  try {
    const policy = await getEventPolicy();

    // If global is disabled, no club can create events
    if (!policy.enabledGlobal) {
      return false;
    }

    // If club-specific setting exists, use it
    if (clubId in policy.enabledByClub) {
      return policy.enabledByClub[clubId];
    }

    // Default to enabled if no specific setting
    return true;
  } catch (error) {
    console.error("Error checking club creation policy:", error);
    return false;
  }
};
