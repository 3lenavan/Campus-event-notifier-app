import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthUser } from '../src/hooks/useAuthUser';
import { EventPolicy, getEventPolicy, setEventPolicy } from '../src/lib/eventPolicy';
import { notifyApprovalUpdate } from '../src/services/notificationsService';
import { listClubs, updateClubCodes } from '../src/services/clubsService';
import { approveEvent, listEvents, rejectEvent } from '../src/services/eventsService';
import { Club, Event } from '../src/types';
import { useAppTheme, LightThemeColors } from '../src/ThemeContext';
import { showAlert } from "../src/lib/alert";

export default function AdminSettings() {
  const { profile } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [newMemberCode, setNewMemberCode] = useState('');
  const [newModeratorCode, setNewModeratorCode] = useState('');
  const [savingCodes, setSavingCodes] = useState(false);
  const [policy, setPolicy] = useState<EventPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);

  useEffect(() => {
    if (!profile?.isAdmin) return;
    reload();
  }, [profile?.isAdmin]);

  const reload = async () => {
    setEventsLoading(true);
    setClubsLoading(true);
    setPolicyLoading(true);
    try {
      const [events, clubsList, currentPolicy] = await Promise.all([listEvents(), listClubs(), getEventPolicy()]);
      setAllEvents(events || []);
      setClubs(clubsList || []);
      setPolicy(currentPolicy);
      if (clubsList && clubsList.length > 0) {
        setSelectedClubId(clubsList[0].id);
      }
    } catch (e) {
      showAlert('Error', 'Failed to load admin data');
    } finally {
      setEventsLoading(false);
      setClubsLoading(false);
      setPolicyLoading(false);
    }
  };

  const pendingEvents = useMemo(() => allEvents.filter(e => e.status === 'pending'), [allEvents]);

  const handleApprove = async (eventId: string) => {
    try {
      await approveEvent(eventId);
      setAllEvents(prev => prev.map(e => (e.id === eventId ? { ...e, status: 'approved' } : e)));
      const ev = allEvents.find(e => e.id === eventId);
      if (ev) { 
        try { 
          // Notify creator about approval
          await notifyApprovalUpdate(ev.title, true);
          // Also notify that a new event is available (for all users via scan loop)
        } catch {} 
      }
    } catch (e) {
      showAlert('Error', 'Failed to approve event');
    }
  };

  const toggleModeration = async (mode: 'off' | 'clubModerator') => {
    if (!policy) return;
    try {
      const next = { ...policy, moderationMode: mode } as EventPolicy;
      await setEventPolicy(next);
      setPolicy(next);
      showAlert('Success', mode === 'off' ? 'Auto-approve enabled' : 'Approval required');
    } catch {
      showAlert('Error', 'Failed to update moderation mode');
    }
  };

  const handleReject = async (eventId: string) => {
    try {
      await rejectEvent(eventId, 'Rejected by admin');
      setAllEvents(prev => prev.map(e => (e.id === eventId ? { ...e, status: 'rejected', moderationNote: 'Rejected by admin' } : e)));
      const ev = allEvents.find(e => e.id === eventId);
      if (ev) { try { await notifyApprovalUpdate(ev.title, false); } catch {} }
    } catch (e) {
      showAlert('Error', 'Failed to reject event');
    }
  };

  const handleRotateCodes = async () => {
    if (!selectedClubId) {
      showAlert('Validation', 'Please select a club');
      return;
    }
    if (!newMemberCode && !newModeratorCode) {
      showAlert('Validation', 'Enter at least one new code');
      return;
    }
    setSavingCodes(true);
    try {
      await updateClubCodes(selectedClubId, {
        newMemberCode: newMemberCode || undefined,
        newModeratorCode: newModeratorCode || undefined,
      });
      setNewMemberCode('');
      setNewModeratorCode('');
      showAlert('Success', 'Codes updated');
    } catch (e) {
      showAlert('Error', 'Failed to update codes');
    } finally {
      setSavingCodes(false);
    }
  };

  if (!profile?.isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/settings');
          }
        }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.header, { color: colors.text }]}>Admin Settings</Text>
        <Text style={{ color: colors.text }}>You do not have access to this page.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/settings');
        }
      }}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
        <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
      </TouchableOpacity>
      <Text style={[styles.header, { color: colors.text }]}>Admin Settings</Text>

      <View style={[styles.card, styles.cardSpacing, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Moderation</Text>
        {policyLoading || !policy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={[styles.subtitle, { color: colors.subtitle }]}>
              Current mode: {policy.moderationMode === 'off' ? 'Auto-approve' : 'Require approval'}
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, { borderColor: colors.border }, policy.moderationMode === 'off' && [styles.toggleBtnActive, { backgroundColor: colors.primary }]]}
                onPress={() => toggleModeration('off')}
              >
                <Text style={[styles.toggleText, { color: colors.text }, policy.moderationMode === 'off' && styles.toggleTextActive]}>Auto-approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, { borderColor: colors.border }, policy.moderationMode === 'clubModerator' && [styles.toggleBtnActive, { backgroundColor: colors.primary }]]}
                onPress={() => toggleModeration('clubModerator')}
              >
                <Text style={[styles.toggleText, { color: colors.text }, policy.moderationMode === 'clubModerator' && styles.toggleTextActive]}>Require approval</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={[styles.card, styles.cardSpacing, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Pending Events</Text>
        {eventsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <FlatList
            data={pendingEvents}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={[styles.subtitle, { color: colors.subtitle }]}>No pending events</Text>}
            renderItem={({ item }) => (
              <View style={styles.eventRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.eventMeta, { color: colors.subtitle }]}>{item.clubId} • {new Date(item.dateISO).toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={[styles.button, styles.approve]} onPress={() => handleApprove(item.id)}>
                  <Text style={styles.buttonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.reject]} onPress={() => handleReject(item.id)}>
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <View style={[styles.card, styles.cardSpacing, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Rotate Club Codes</Text>
        {clubsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={styles.pillRow}>
              {clubs.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pill, { borderColor: colors.border }, selectedClubId === c.id && [styles.pillSelected, { backgroundColor: colors.primary }]]}
                  onPress={() => setSelectedClubId(c.id)}
                >
                  <Text style={[styles.pillText, { color: colors.text }, selectedClubId === c.id && styles.pillTextSelected]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="New member code (optional)"
              placeholderTextColor={colors.placeholderText}
              value={newMemberCode}
              onChangeText={setNewMemberCode}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="New moderator code (optional)"
              placeholderTextColor={colors.placeholderText}
              value={newModeratorCode}
              onChangeText={setNewModeratorCode}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              autoCapitalize="none"
            />
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }, savingCodes && { opacity: 0.7 }]} onPress={handleRotateCodes} disabled={savingCodes}>
              <Text style={styles.primaryButtonText}>{savingCodes ? 'Saving...' : 'Update Codes'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, padding: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { marginLeft: 8, fontSize: 16 },
  header: { fontSize: 24, fontWeight: '700', marginVertical: 16 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  cardSpacing: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  subtitle: { },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  eventMeta: { fontSize: 12 },
  button: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  approve: { backgroundColor: '#10b981' },
  reject: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontWeight: '600' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9999, borderWidth: 1 },
  pillSelected: { },
  pillText: { },
  pillTextSelected: { color: '#fff' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  primaryButton: { borderRadius: 10, padding: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  toggleBtnActive: { },
  toggleText: { fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
});


