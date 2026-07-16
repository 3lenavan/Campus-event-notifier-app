import { describe, expect, it } from 'vitest';
import { CampusLocation, getLocationForEvent } from '../services/campusMapService';

const locations: CampusLocation[] = [
  { id: '1', name: 'Innovation Lab', xPct: 20, yPct: 25 },
  { id: '2', name: 'Campus Green', xPct: 50, yPct: 50 },
];

describe('getLocationForEvent', () => {
  it('matches the new "Building - Room 123" format', () => {
    const match = getLocationForEvent({ location: 'Innovation Lab - Room 204' }, locations);
    expect(match?.name).toBe('Innovation Lab');
  });

  it('matches older, pre-picker location strings by substring', () => {
    const match = getLocationForEvent({ location: 'Innovation Lab 204' }, locations);
    expect(match?.name).toBe('Innovation Lab');
  });

  it('is case-insensitive', () => {
    const match = getLocationForEvent({ location: 'campus green' }, locations);
    expect(match?.name).toBe('Campus Green');
  });

  it('returns null when no building matches', () => {
    const match = getLocationForEvent({ location: 'Off-campus apartment' }, locations);
    expect(match).toBeNull();
  });
});
