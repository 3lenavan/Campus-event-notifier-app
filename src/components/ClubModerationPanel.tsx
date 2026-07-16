import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthUser } from '../hooks/useAuthUser';
import { getPendingEvents, approveEvent, rejectEvent } from '../services/eventsService';
import { Event } from '../types';
import { useAppTheme, LightThemeColors } from '../ThemeContext';
import { showAlert } from "../lib/alert";

interface ClubModerationPanelProps {
  clubId: string;
  clubName: string;
}

export const ClubModerationPanel: React.FC<ClubModerationPanelProps> = ({ clubId, clubName }) => {
  const { profile } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    loadPendingEvents();
  }, [clubId]);

  const loadPendingEvents = async () => {
    try {
      setLoading(true);
      const events = await getPendingEvents(clubId);
      setPendingEvents(events);
    } catch (error) {
      console.error('Error loading pending events:', error);
      showAlert('Error', 'Failed to load pending events');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      await approveEvent(eventId);
      showAlert('Success', 'Event approved successfully');
      loadPendingEvents(); // Refresh the list
    } catch (error) {
      console.error('Error approving event:', error);
      showAlert('Error', 'Failed to approve event');
    }
  };

  const handleReject = async (eventId: string) => {
    if (!rejectNote.trim()) {
      showAlert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      await rejectEvent(eventId, rejectNote.trim());
      showAlert('Success', 'Event rejected successfully');
      setRejectingEventId(null);
      setRejectNote('');
      loadPendingEvents(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting event:', error);
      showAlert('Error', 'Failed to reject event');
    }
  };

  const startReject = (eventId: string) => {
    setRejectingEventId(eventId);
    setRejectNote('');
  };

  const cancelReject = () => {
    setRejectingEventId(null);
    setRejectNote('');
  };

  // Check if user is a member of this club
  const isClubMember = profile?.role === 'member' && profile?.memberships.includes(clubId);

  if (!isClubMember) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.noAccessText, { color: colors.text }]}>
          You must be a member of {clubName} to moderate events.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading pending events...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Moderate Events</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>{clubName}</Text>
      </View>

      {pendingEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          <Text style={[styles.emptyText, { color: colors.text }]}>No pending events</Text>
          <Text style={[styles.emptySubText, { color: colors.subtitle }]}>All events are up to date</Text>
        </View>
      ) : (
        <ScrollView style={styles.eventsList}>
          {pendingEvents.map((event) => (
            <View key={event.id} style={[styles.eventCard, { backgroundColor: colors.card }]}>
              <View style={styles.eventHeader}>
                <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
                  <Text style={[styles.statusText, { color: '#D97706' }]}>PENDING</Text>
                </View>
              </View>
              
              <Text style={[styles.eventDescription, { color: colors.subtitle }]}>{event.description}</Text>
              
              <View style={styles.eventDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.subtitle} />
                  <Text style={[styles.detailText, { color: colors.subtitle }]}>
                    {new Date(event.dateISO).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={colors.subtitle} />
                  <Text style={[styles.detailText, { color: colors.subtitle }]}>
                    {new Date(event.dateISO).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color={colors.subtitle} />
                  <Text style={[styles.detailText, { color: colors.subtitle }]}>{event.location}</Text>
                </View>
              </View>

              {rejectingEventId === event.id ? (
                <View style={[styles.rejectForm, { backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.rejectLabel, { color: '#DC2626' }]}>Reason for rejection:</Text>
                  <TextInput
                    style={[styles.rejectInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                    placeholder="Enter reason for rejection..."
                    placeholderTextColor={colors.placeholderText}
                    value={rejectNote}
                    onChangeText={setRejectNote}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.rejectActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={cancelReject}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(event.id)}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(event.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="white" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => startReject(event.id)}
                  >
                    <Ionicons name="close" size={16} color="white" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    marginLeft: 8,
  },
  noAccessText: {
    textAlign: 'center',
    fontSize: 16,
    margin: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
  },
  eventsList: {
    flex: 1,
    padding: 16,
  },
  eventCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  rejectForm: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  rejectInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  rejectActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
