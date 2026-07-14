import { User, onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { getProfile, upsertProfileFromAuth } from '../services/profileService';
import { syncRemindersForUser } from '../services/notificationsService';
import { UserProfile } from '../types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

/**
 * Hook to manage authentication state and user profile
 * Externalizes Firebase Auth state and automatically creates/updates local user profiles
 */
export const useAuthUser = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (firebaseUser: User) => {
  try {
    // 1. Upsert base info (name/email/isAdmin)
    await upsertProfileFromAuth(firebaseUser);

    // 2. Load full profile including memberships
    const fullProfile = await getProfile(firebaseUser.uid);

    if (fullProfile) {
      setProfile(fullProfile);
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}, []);


  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      // Reload profile from storage (which may have been updated by verification)
      const updatedProfile = await getProfile(user.uid);
      if (updatedProfile) {
        setProfile(updatedProfile);
      } else {
        // If profile doesn't exist, recreate it from auth
        await loadProfile(user);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in - create or update local profile
          await loadProfile(firebaseUser);
          setUser(firebaseUser);
          // Sync event reminder notifications after login
          try {
            await syncRemindersForUser(firebaseUser.uid);
          } catch (e) {
            console.error('Failed to sync notification reminders', e);
          }
        } else {
          // User is signed out
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
        // On error, clear state
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadProfile]);

  return { user, profile, loading, refreshProfile };
};
