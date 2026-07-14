import { describe, expect, it } from 'vitest';
import { checkPersonalConflicts } from '../lib/eventConflicts';

describe('checkPersonalConflicts', () => {
  it('flags an RSVP\'d event that overlaps the candidate\'s 2-hour window', () => {
    const candidate = { id: 'new', title: 'New Event', dateISO: '2024-06-01T18:00:00Z' };
    const rsvped = [{ id: 'existing', title: 'Existing Event', dateISO: '2024-06-01T19:00:00Z' }];

    const conflicts = checkPersonalConflicts(candidate, rsvped);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].message).toContain('Existing Event');
  });

  it('does not flag events that start after the candidate\'s window ends', () => {
    const candidate = { id: 'new', title: 'New Event', dateISO: '2024-06-01T18:00:00Z' };
    const rsvped = [{ id: 'existing', title: 'Existing Event', dateISO: '2024-06-01T20:30:00Z' }];

    const conflicts = checkPersonalConflicts(candidate, rsvped);

    expect(conflicts).toHaveLength(0);
  });

  it('does not flag events that end before the candidate\'s window starts', () => {
    const candidate = { id: 'new', title: 'New Event', dateISO: '2024-06-01T18:00:00Z' };
    const rsvped = [{ id: 'existing', title: 'Existing Event', dateISO: '2024-06-01T15:00:00Z' }];

    const conflicts = checkPersonalConflicts(candidate, rsvped);

    expect(conflicts).toHaveLength(0);
  });

  it('excludes the candidate itself from the RSVP list (editing an existing RSVP)', () => {
    const candidate = { id: 'existing', title: 'Existing Event', dateISO: '2024-06-01T18:00:00Z' };
    const rsvped = [{ id: 'existing', title: 'Existing Event', dateISO: '2024-06-01T18:00:00Z' }];

    const conflicts = checkPersonalConflicts(candidate, rsvped);

    expect(conflicts).toHaveLength(0);
  });

  it('flags multiple overlapping events', () => {
    const candidate = { id: 'new', title: 'New Event', dateISO: '2024-06-01T18:00:00Z' };
    const rsvped = [
      { id: 'a', title: 'Event A', dateISO: '2024-06-01T18:30:00Z' },
      { id: 'b', title: 'Event B', dateISO: '2024-06-01T19:30:00Z' },
      { id: 'c', title: 'Event C', dateISO: '2024-06-02T09:00:00Z' },
    ];

    const conflicts = checkPersonalConflicts(candidate, rsvped);

    expect(conflicts.map((c) => c.event.id)).toEqual(['a', 'b']);
  });

  it('respects a custom duration', () => {
    const candidate = { id: 'new', title: 'New Event', dateISO: '2024-06-01T18:00:00Z' };
    const rsvped = [{ id: 'existing', title: 'Existing Event', dateISO: '2024-06-01T18:45:00Z' }];

    expect(checkPersonalConflicts(candidate, rsvped, 30)).toHaveLength(0);
    expect(checkPersonalConflicts(candidate, rsvped, 60)).toHaveLength(1);
  });
});
