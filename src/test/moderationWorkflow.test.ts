import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approveEvent, getPendingEvents, listApprovedEvents, rejectEvent } from '../services/eventsService';
import { updateDemoEventStatus } from '../../data/demoData';
import { Event } from '../types';

// These tests run in demo mode (no Supabase credentials in the test env, same as
// every other service test in this suite) and mock the demo data layer directly.
vi.mock('../../data/demoData', () => ({
  createDemoEvent: vi.fn(),
  getDemoInteractionCounts: vi.fn().mockResolvedValue({}),
  listDemoEvents: vi.fn(),
  updateDemoEventStatus: vi.fn(),
}));

const { getDemoInteractionCounts, listDemoEvents } = await import('../../data/demoData');

const makeEvent = (overrides: Partial<Event>): Event => ({
  id: 'event-1',
  title: 'Test Event',
  description: 'Description',
  clubId: 'club-1',
  dateISO: '2030-12-25T14:30:00Z',
  location: 'Innovation Lab - Room 204',
  createdBy: 'user123',
  createdAt: Date.now(),
  status: 'pending',
  ...overrides,
});

describe('Moderation workflow (demo mode)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listDemoEvents).mockResolvedValue([]);
    vi.mocked(getDemoInteractionCounts).mockResolvedValue({});
  });

  describe('approveEvent', () => {
    it('marks the event approved', async () => {
      await approveEvent('event-1');
      expect(updateDemoEventStatus).toHaveBeenCalledWith('event-1', 'approved');
    });

    it('propagates "Event not found" for unknown events', async () => {
      vi.mocked(updateDemoEventStatus).mockRejectedValue(new Error('Event not found'));
      await expect(approveEvent('missing')).rejects.toThrow('Event not found');
    });
  });

  describe('rejectEvent', () => {
    it('marks the event rejected with the moderation note', async () => {
      await rejectEvent('event-1', 'Inappropriate content');
      expect(updateDemoEventStatus).toHaveBeenCalledWith('event-1', 'rejected', 'Inappropriate content');
    });

    it('propagates "Event not found" for unknown events', async () => {
      vi.mocked(updateDemoEventStatus).mockRejectedValue(new Error('Event not found'));
      await expect(rejectEvent('missing', 'Reason')).rejects.toThrow('Event not found');
    });
  });

  describe('getPendingEvents', () => {
    it('returns only pending events for the given club', async () => {
      vi.mocked(listDemoEvents).mockResolvedValue([
        makeEvent({ id: 'p1', status: 'pending', clubId: 'club-1' }),
        makeEvent({ id: 'p2', status: 'pending', clubId: 'club-1' }),
        makeEvent({ id: 'a1', status: 'approved', clubId: 'club-1' }),
        makeEvent({ id: 'p3', status: 'pending', clubId: 'club-2' }),
      ]);

      const pending = await getPendingEvents('club-1');

      expect(pending.map((event) => event.id)).toEqual(['p1', 'p2']);
      expect(pending.every((event) => event.status === 'pending')).toBe(true);
    });

    it('returns all pending events when no club is given', async () => {
      vi.mocked(listDemoEvents).mockResolvedValue([
        makeEvent({ id: 'p1', status: 'pending', clubId: 'club-1' }),
        makeEvent({ id: 'p3', status: 'pending', clubId: 'club-2' }),
        makeEvent({ id: 'a1', status: 'approved', clubId: 'club-1' }),
      ]);

      const pending = await getPendingEvents();

      expect(pending.map((event) => event.id)).toEqual(['p1', 'p3']);
    });

    it('returns an empty array when nothing is pending', async () => {
      vi.mocked(listDemoEvents).mockResolvedValue([
        makeEvent({ id: 'a1', status: 'approved' }),
      ]);

      expect(await getPendingEvents('club-1')).toHaveLength(0);
    });
  });

  describe('listApprovedEvents', () => {
    it('never includes pending or rejected events', async () => {
      vi.mocked(listDemoEvents).mockResolvedValue([
        makeEvent({ id: 'a1', status: 'approved' }),
        makeEvent({ id: 'p1', status: 'pending' }),
        makeEvent({ id: 'r1', status: 'rejected', moderationNote: 'Inappropriate content' }),
      ]);

      const approved = await listApprovedEvents();

      expect(approved).toHaveLength(1);
      expect(approved[0].id).toBe('a1');
    });
  });
});
