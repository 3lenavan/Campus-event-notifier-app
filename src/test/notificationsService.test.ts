import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  setNotificationHandler,
} = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
}));

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: unknown[]) => getPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => requestPermissionsAsync(...args),
  setNotificationChannelAsync: (...args: unknown[]) => setNotificationChannelAsync(...args),
  scheduleNotificationAsync: (...args: unknown[]) => scheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => cancelScheduledNotificationAsync(...args),
  cancelAllScheduledNotificationsAsync: (...args: unknown[]) => cancelAllScheduledNotificationsAsync(...args),
  setNotificationHandler: (...args: unknown[]) => setNotificationHandler(...args),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

vi.mock('../services/eventsService', () => ({
  getEventsByIds: vi.fn(),
}));

vi.mock('../services/interactionsService', () => ({
  getUserRSVPdEvents: vi.fn(),
}));

import { getEventsByIds } from '../services/eventsService';
import { getUserRSVPdEvents } from '../services/interactionsService';
import {
  cancelAllReminders,
  cancelEventReminders,
  getNotificationPermissionStatus,
  notifyApprovalUpdate,
  notifyRSVPConfirmation,
  requestNotificationPermission,
  scheduleEventReminders,
  syncRemindersForUser,
} from '../services/notificationsService';

const baseEvent = {
  id: 'event-1',
  title: 'Robotics Demo',
  description: 'Come see the bots',
  clubId: 'club-1',
  dateISO: '',
  location: 'Innovation Lab',
  createdBy: 'organizer-1',
  createdAt: Date.now(),
  status: 'approved' as const,
};

describe('notificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    scheduleNotificationAsync.mockResolvedValue('scheduled-id');
    setNotificationChannelAsync.mockResolvedValue(undefined);
  });

  describe('requestNotificationPermission', () => {
    it('returns granted without re-requesting if already granted', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const result = await requestNotificationPermission();

      expect(result).toBe('granted');
      expect(requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission when not already granted', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      requestPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const result = await requestNotificationPermission();

      expect(result).toBe('granted');
      expect(requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns denied when permission is refused', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await requestNotificationPermission();

      expect(result).toBe('denied');
    });

    it('returns denied instead of throwing if the native call errors', async () => {
      getPermissionsAsync.mockRejectedValue(new Error('no native module'));

      const result = await requestNotificationPermission();

      expect(result).toBe('denied');
    });
  });

  describe('scheduleEventReminders', () => {
    it('schedules both the 24h and 1h reminders for a future event', async () => {
      const event = { ...baseEvent, dateISO: '2024-01-20T18:00:00Z' };

      await scheduleEventReminders(event);

      expect(scheduleNotificationAsync).toHaveBeenCalledTimes(2);
      const identifiers = scheduleNotificationAsync.mock.calls.map((call) => call[0].identifier);
      expect(identifiers).toEqual(['event-reminder:event-1:24h', 'event-reminder:event-1:1h']);
    });

    it('skips a reminder window that has already passed', async () => {
      // Event is only 30 minutes away: the 24h-before trigger is in the past, the 1h-before trigger is not.
      const event = { ...baseEvent, dateISO: '2024-01-15T10:30:00Z' };

      await scheduleEventReminders(event);

      expect(scheduleNotificationAsync).toHaveBeenCalledTimes(0);
    });

    it('cancels any previously-scheduled reminder before rescheduling', async () => {
      const event = { ...baseEvent, dateISO: '2024-01-20T18:00:00Z' };

      await scheduleEventReminders(event);

      expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('event-reminder:event-1:24h');
      expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('event-reminder:event-1:1h');
    });
  });

  describe('cancelEventReminders', () => {
    it('cancels both reminder identifiers for the event', async () => {
      await cancelEventReminders('event-1');

      expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('event-reminder:event-1:24h');
      expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('event-reminder:event-1:1h');
    });
  });

  describe('syncRemindersForUser', () => {
    it('schedules reminders for every event the user has RSVP\'d to', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      vi.mocked(getUserRSVPdEvents).mockResolvedValue(['event-1', 'event-2']);
      vi.mocked(getEventsByIds).mockResolvedValue([
        { ...baseEvent, id: 'event-1', dateISO: '2024-01-20T18:00:00Z' },
        { ...baseEvent, id: 'event-2', dateISO: '2024-01-21T18:00:00Z' },
      ]);

      await syncRemindersForUser('user-1');

      expect(scheduleNotificationAsync).toHaveBeenCalledTimes(4);
    });

    it('does nothing when notification permission is denied', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'denied' });
      requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await syncRemindersForUser('user-1');

      expect(getUserRSVPdEvents).not.toHaveBeenCalled();
    });

    it('does nothing when the user has no RSVPs', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'granted' });
      vi.mocked(getUserRSVPdEvents).mockResolvedValue([]);

      await syncRemindersForUser('user-1');

      expect(getEventsByIds).not.toHaveBeenCalled();
    });
  });

  describe('immediate notifications', () => {
    it('fires an RSVP confirmation immediately when permission is granted', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      await notifyRSVPConfirmation('Robotics Demo');

      expect(scheduleNotificationAsync).toHaveBeenCalledWith({
        content: { title: 'RSVP Confirmed', body: "You RSVP'd for Robotics Demo" },
        trigger: null,
      });
    });

    it('fires an approval update immediately when permission is granted', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      await notifyApprovalUpdate('Robotics Demo', false);

      expect(scheduleNotificationAsync).toHaveBeenCalledWith({
        content: { title: 'Event Update', body: 'Robotics Demo was rejected' },
        trigger: null,
      });
    });

    it('does not fire when permission is not granted', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await notifyRSVPConfirmation('Robotics Demo');

      expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('getNotificationPermissionStatus', () => {
    it('reflects granted status without prompting the user', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const result = await getNotificationPermissionStatus();

      expect(result).toBe('granted');
      expect(requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('reflects denied status without prompting the user', async () => {
      getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });

      const result = await getNotificationPermissionStatus();

      expect(result).toBe('denied');
      expect(requestPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('cancelAllReminders', () => {
    it('cancels every scheduled notification', async () => {
      await cancelAllReminders();

      expect(cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });
});
