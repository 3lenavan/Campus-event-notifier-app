export interface RecommendationCandidate {
  id: string;
  clubId: string;
  dateISO: string;
  attendees?: number;
}

export interface Recommendation<T extends RecommendationCandidate = RecommendationCandidate> {
  event: T;
  reason: string;
}

export interface RecommendationContext {
  /** Map of clubId -> category, e.g. built from Club[]. */
  clubCategoryById: Record<string, string>;
  followedClubIds: Set<string>;
  /** Club IDs behind events the user has already liked, favorited, or RSVP'd to — used to infer category affinity. */
  interactedClubIds: Set<string>;
  /** Events to exclude outright, e.g. ones the user is already attending. */
  excludeEventIds?: Set<string>;
}

const FOLLOWED_CLUB_BOOST = 3;
const CATEGORY_AFFINITY_BOOST = 2;
/**
 * Small tiebreaker only. The raw attendee count is capped before weighting so an
 * arbitrarily popular event can never outscore a personalization boost above —
 * max possible contribution is POPULARITY_CAP * POPULARITY_WEIGHT = 1, which is
 * still less than CATEGORY_AFFINITY_BOOST.
 */
const POPULARITY_CAP = 100;
const POPULARITY_WEIGHT = 0.01;

/**
 * Rank candidate events for a user. Pure rule-based scoring, no ML/external calls —
 * callers are responsible for only passing approved, future events as candidates.
 *
 * Cold-start (no follows/interactions) degrades gracefully to trending-by-attendee-count,
 * since every event then scores 0 plus the same small popularity tiebreaker.
 */
export function getRecommendedEvents<T extends RecommendationCandidate>(
  events: T[],
  context: RecommendationContext,
  limit: number = 5
): Recommendation<T>[] {
  const affinityCategories = new Set(
    Array.from(context.interactedClubIds)
      .map((clubId) => context.clubCategoryById[clubId])
      .filter((category): category is string => Boolean(category))
  );

  const now = Date.now();

  return events
    .filter((event) => !context.excludeEventIds?.has(event.id))
    .filter((event) => new Date(event.dateISO).getTime() >= now)
    .map((event) => {
      let score = 0;
      let reason = "Trending on campus";
      const category = context.clubCategoryById[event.clubId];

      if (category && affinityCategories.has(category)) {
        score += CATEGORY_AFFINITY_BOOST;
        reason = `Similar to ${category} events you've liked`;
      }

      if (context.followedClubIds.has(event.clubId)) {
        score += FOLLOWED_CLUB_BOOST;
        reason = "You follow this club";
      }

      score += Math.min(event.attendees || 0, POPULARITY_CAP) * POPULARITY_WEIGHT;

      return { event, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ event, reason }) => ({ event, reason }));
}
