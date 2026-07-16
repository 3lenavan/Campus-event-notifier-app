import { beforeEach, describe, expect, it, vi } from 'vitest';
import { followUser, searchUsers } from '../services/friendsService';

// No .env/Supabase credentials exist in the test environment, so data/supabaseClient's
// isDemoMode is already true here — same as every other service test in this suite.

describe('searchUsers (demo mode)', () => {
  it('returns matching demo users by case-insensitive name search', async () => {
    const results = await searchUsers('maya');
    expect(results).toEqual([{ uid: 'demo-user-maya', name: 'Maya Chen' }]);
  });

  it('excludes the given uid from results', async () => {
    const results = await searchUsers('maya', 'demo-user-maya');
    expect(results).toEqual([]);
  });

  it('returns an empty array for a blank query', async () => {
    expect(await searchUsers('   ')).toEqual([]);
  });

  it('returns an empty array when nothing matches', async () => {
    expect(await searchUsers('nonexistent-name-xyz')).toEqual([]);
  });
});

describe('followUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects following without being logged in', async () => {
    await expect(followUser(null, 'demo-user-maya')).rejects.toThrow('AUTH_REQUIRED');
  });

  it('rejects following yourself', async () => {
    await expect(followUser('demo-user-maya', 'demo-user-maya')).rejects.toThrow('CANNOT_FOLLOW_SELF');
  });
});
