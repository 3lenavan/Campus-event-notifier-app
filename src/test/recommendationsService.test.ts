import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecommendedEvents, RecommendationContext } from '../services/recommendationsService';

const baseContext: RecommendationContext = {
  clubCategoryById: {},
  followedClubIds: new Set(),
  interactedClubIds: new Set(),
};

describe('getRecommendedEvents', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-06-01T00:00:00Z'));
  });

  it('ranks events from followed clubs above everything else', () => {
    const events = [
      { id: 'a', clubId: 'club-a', dateISO: '2024-06-05T18:00:00Z', attendees: 5 },
      { id: 'b', clubId: 'club-b', dateISO: '2024-06-06T18:00:00Z', attendees: 500 },
    ];

    const recs = getRecommendedEvents(events, {
      ...baseContext,
      followedClubIds: new Set(['club-a']),
    });

    expect(recs[0].event.id).toBe('a');
    expect(recs[0].reason).toBe('You follow this club');
  });

  it('boosts events whose club category matches ones the user has previously engaged with', () => {
    const events = [
      { id: 'a', clubId: 'club-a', dateISO: '2024-06-05T18:00:00Z', attendees: 5 },
      { id: 'b', clubId: 'club-b', dateISO: '2024-06-06T18:00:00Z', attendees: 5 },
    ];

    const recs = getRecommendedEvents(events, {
      ...baseContext,
      clubCategoryById: { 'club-a': 'Music', 'club-b': 'Sports' },
      interactedClubIds: new Set(['club-a']),
    });

    expect(recs[0].event.id).toBe('a');
    expect(recs[0].reason).toContain('Music');
  });

  it('falls back to trending-by-attendee-count for cold-start users with no history', () => {
    const events = [
      { id: 'low', clubId: 'club-a', dateISO: '2024-06-05T18:00:00Z', attendees: 3 },
      { id: 'high', clubId: 'club-b', dateISO: '2024-06-06T18:00:00Z', attendees: 300 },
    ];

    const recs = getRecommendedEvents(events, baseContext);

    expect(recs.map((r) => r.event.id)).toEqual(['high', 'low']);
    expect(recs[0].reason).toBe('Trending on campus');
  });

  it('excludes events already in the exclude set (e.g. already RSVP\'d)', () => {
    const events = [
      { id: 'a', clubId: 'club-a', dateISO: '2024-06-05T18:00:00Z' },
      { id: 'b', clubId: 'club-b', dateISO: '2024-06-06T18:00:00Z' },
    ];

    const recs = getRecommendedEvents(events, {
      ...baseContext,
      excludeEventIds: new Set(['a']),
    });

    expect(recs.map((r) => r.event.id)).toEqual(['b']);
  });

  it('excludes events that have already happened', () => {
    const events = [
      { id: 'past', clubId: 'club-a', dateISO: '2024-05-01T18:00:00Z' },
      { id: 'future', clubId: 'club-b', dateISO: '2024-06-05T18:00:00Z' },
    ];

    const recs = getRecommendedEvents(events, baseContext);

    expect(recs.map((r) => r.event.id)).toEqual(['future']);
  });

  it('respects the limit parameter', () => {
    const events = Array.from({ length: 10 }, (_, i) => ({
      id: `event-${i}`,
      clubId: 'club-a',
      dateISO: '2024-06-05T18:00:00Z',
      attendees: i,
    }));

    const recs = getRecommendedEvents(events, baseContext, 3);

    expect(recs).toHaveLength(3);
  });

  it('prioritizes the followed-club boost over category affinity when both apply', () => {
    const events = [{ id: 'a', clubId: 'club-a', dateISO: '2024-06-05T18:00:00Z' }];

    const recs = getRecommendedEvents(events, {
      ...baseContext,
      clubCategoryById: { 'club-a': 'Music' },
      followedClubIds: new Set(['club-a']),
      interactedClubIds: new Set(['club-a']),
    });

    expect(recs[0].reason).toBe('You follow this club');
  });
});
