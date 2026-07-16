import { describe, expect, it } from 'vitest';
import { canManageCheckin, getCheckinQrPayload, isWithinCheckinWindow } from '../services/checkinService';
import { UserProfile } from '../types';

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'student',
  isAdmin: false,
  memberships: [],
  activityVisible: false,
  ...overrides,
});

describe('getCheckinQrPayload', () => {
  it('encodes the event id and checkin code', () => {
    expect(getCheckinQrPayload({ id: '42', checkinCode: 'ABC123' })).toBe('42:ABC123');
  });

  it('handles a missing checkin code gracefully', () => {
    expect(getCheckinQrPayload({ id: '42', checkinCode: undefined })).toBe('42:');
  });
});

describe('canManageCheckin', () => {
  it('denies access with no profile', () => {
    expect(canManageCheckin({ clubId: '1' }, null, [])).toBe(false);
  });

  it('allows global admins regardless of club membership', () => {
    expect(canManageCheckin({ clubId: '1' }, profile({ isAdmin: true }), [])).toBe(true);
  });

  it('allows members of the event\'s club', () => {
    expect(canManageCheckin({ clubId: '1' }, profile(), ['1', '2'])).toBe(true);
  });

  it('denies non-members who are not admins', () => {
    expect(canManageCheckin({ clubId: '1' }, profile(), ['2', '3'])).toBe(false);
  });
});

describe('isWithinCheckinWindow', () => {
  const eventStart = '2024-06-01T18:00:00Z';

  it('is closed more than 30 minutes before the event starts', () => {
    const now = new Date('2024-06-01T17:00:00Z');
    expect(isWithinCheckinWindow(eventStart, now)).toBe(false);
  });

  it('opens 30 minutes before the event starts', () => {
    const now = new Date('2024-06-01T17:31:00Z');
    expect(isWithinCheckinWindow(eventStart, now)).toBe(true);
  });

  it('stays open for the rest of the day after the event starts', () => {
    const now = new Date('2024-06-02T10:00:00Z');
    expect(isWithinCheckinWindow(eventStart, now)).toBe(true);
  });

  it('closes more than 24 hours after the event starts', () => {
    const now = new Date('2024-06-03T18:01:00Z');
    expect(isWithinCheckinWindow(eventStart, now)).toBe(false);
  });
});
