import {
  createDemoEvent,
  getDemoInteractionCounts,
  listDemoEvents,
} from '../../data/demoData';
import { isDemoMode, supabase } from '../../data/supabaseClient';
import { getEventPolicy } from '../lib/eventPolicy';
import { CreateEventInput, Event } from '../types';
import { getEventAttendeeCounts } from './interactionsService';

// Doesn't need to be cryptographically secure — just unpredictable enough that a
// stranger can't guess it without seeing the organizer's actual QR code.
const generateCheckinCode = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

const listDemoEventsWithAttendees = async (): Promise<Event[]> => {
  const events = await listDemoEvents();
  const attendeeCounts = await getDemoInteractionCounts(
    'rsvps',
    events.map((event) => event.id)
  );
  return events.map((event) => ({
    ...event,
    attendees: attendeeCounts[event.id] || 0,
  }));
};

/**
 * Get all events sorted by creation date (newest first)
 */
export const listEvents = async (): Promise<Event[]> => {
  if (isDemoMode) {
    return listDemoEventsWithAttendees();
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing events from Supabase:', error);
      return [];
    }

    const mapped = (data || []).map((row: any) => ({
      id: String(row.id),
      title: row.title,
      description: row.description,
      clubId: String(row.club_id),
      dateISO: row.date_iso,
      location: row.location,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at).getTime(),
      status: row.status || 'pending',
      moderationNote: row.moderation_note || undefined,
      imageUrl: row.image_url || undefined,
      checkinCode: row.checkin_code || undefined,
    }));

    // Get attendee counts for all events
    const eventIds = mapped.map((e) => e.id);
    const attendeeCounts = await getEventAttendeeCounts(eventIds);

    // Add attendee counts to events
    return mapped.map((event) => ({
      ...event,
      attendees: attendeeCounts[event.id] || 0,
    }));
  } catch (error) {
    console.error('Error listing events:', error);
    return [];
  }
};

/**
 * Get all approved events sorted by creation date (newest first)
 */
export const listApprovedEvents = async (forceRefresh: boolean = false): Promise<Event[]> => {
  if (isDemoMode) {
    return listDemoEventsWithAttendees();
  }

  try {
    console.log('🔍 Querying Supabase for approved events...');

    // Get only approved events
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error listing approved events from Supabase:', error);
      return [];
    }

    const mapped = (data || []).map((row: any) => ({
      id: String(row.id),
      title: row.title,
      description: row.description,
      clubId: String(row.club_id),
      dateISO: row.date_iso,
      location: row.location,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at).getTime(),
      status: row.status || 'approved',
      moderationNote: row.moderation_note || undefined,
      imageUrl: row.image_url || undefined,
      checkinCode: row.checkin_code || undefined,
    }));

    // Get attendee counts for all events
    const eventIds = mapped.map((e) => e.id);
    const attendeeCounts = await getEventAttendeeCounts(eventIds);

    // Add attendee counts to events
    const eventsWithAttendees = mapped.map((event) => ({
      ...event,
      attendees: attendeeCounts[event.id] || 0,
    }));

    console.log('✨ Mapped events:', eventsWithAttendees.length);
    return eventsWithAttendees;
  } catch (error) {
    console.error('❌ Error listing approved events:', error);
    return [];
  }
};

/**
 * Get events for a specific club (only approved events)
 */
export const listClubEvents = async (clubId: string): Promise<Event[]> => {
  if (isDemoMode) {
    const events = await listDemoEventsWithAttendees();
    return events.filter((event) => event.clubId === clubId);
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('club_id', parseInt(clubId))
      .eq('status', 'approved')
      .order('date_iso', { ascending: true });

    // 🔍 DEBUG LOG — check exactly what Supabase sends
    console.log('RAW events from Supabase (listClubEvents):', data);

    if (error) {
      console.error('Error listing club events from Supabase:', error);
      return [];
    }

    const mapped = (data || []).map((row: any) => ({
      id: String(row.id),
      title: row.title,
      description: row.description,
      clubId: String(row.club_id),
      dateISO: row.date_iso,
      location: row.location,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at).getTime(),
      status: row.status || 'approved', // ✅ FIXED: since we filter approved
      moderationNote: row.moderation_note || undefined,
      imageUrl: row.image_url || undefined,
      checkinCode: row.checkin_code || undefined,
    }));

    // Get attendee counts for all events
    const eventIds = mapped.map((e) => e.id);
    const attendeeCounts = await getEventAttendeeCounts(eventIds);

    // Add attendee counts to events
    return mapped.map((event) => ({
      ...event,
      attendees: attendeeCounts[event.id] || 0,
    }));
  } catch (error) {
    console.error('Error listing club events:', error);
    return [];
  }
};

/**
 * Get the count of approved events for a specific club
 */
export const getClubEventCount = async (clubId: string | number): Promise<number> => {
  if (isDemoMode) {
    const events = await listDemoEvents();
    return events.filter(
      (event) => event.clubId === String(clubId) && event.status === 'approved'
    ).length;
  }

  try {
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', typeof clubId === 'string' ? parseInt(clubId) : clubId)
      .eq('status', 'approved');

    if (error) {
      console.error('Error getting club event count from Supabase:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting club event count:', error);
    return 0;
  }
};

/**
 * Get a single event by ID (regardless of status - useful for viewing own pending events)
 */
export const getEventById = async (eventId: string): Promise<Event | null> => {
  if (isDemoMode) {
    const events = await listDemoEventsWithAttendees();
    return events.find((event) => event.id === eventId) || null;
  }

  try {
    const numericId = parseInt(eventId);
    if (isNaN(numericId)) return null;

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', numericId)
      .single();

    if (error) {
      console.error('Error getting event by ID from Supabase:', error);
      return null;
    }

    if (!data) return null;

    const event = {
      id: String(data.id),
      title: data.title,
      description: data.description,
      clubId: String(data.club_id),
      dateISO: data.date_iso,
      location: data.location,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at).getTime(),
      status: data.status || 'pending',
      moderationNote: data.moderation_note || undefined,
      imageUrl: data.image_url || undefined,
      checkinCode: data.checkin_code || undefined,
    };

    // Get attendee count for this event
    const attendeeCounts = await getEventAttendeeCounts([event.id]);
    return {
      ...event,
      attendees: attendeeCounts[event.id] || 0,
    };
  } catch (error) {
    console.error('Error getting event by ID:', error);
    return null;
  }
};

/**
 * Get events by their IDs
 */
export const getEventsByIds = async (eventIds: string[]): Promise<Event[]> => {
  if (isDemoMode) {
    const events = await listDemoEventsWithAttendees();
    const requestedIds = new Set(eventIds);
    return events.filter((event) => requestedIds.has(event.id));
  }

  try {
    if (eventIds.length === 0) return [];

    // Convert string IDs to numbers, filtering out any invalid ones
    const numericIds = eventIds
      .map((id) => {
        const num = parseInt(id);
        return isNaN(num) ? null : num;
      })
      .filter((id): id is number => id !== null);

    if (numericIds.length === 0) return [];

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('id', numericIds)
      .eq('status', 'approved')
      .order('date_iso', { ascending: true });

    if (error) {
      console.error('Error getting events by IDs from Supabase:', error);
      return [];
    }

    const mapped = (data || []).map((row: any) => ({
      id: String(row.id),
      title: row.title,
      description: row.description,
      clubId: String(row.club_id),
      dateISO: row.date_iso,
      location: row.location,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at).getTime(),
      status: row.status || 'approved',
      moderationNote: row.moderation_note || undefined,
      imageUrl: row.image_url || undefined,
      checkinCode: row.checkin_code || undefined,
    }));

    // Get attendee counts for all events
    const attendeeCounts = await getEventAttendeeCounts(mapped.map((e) => e.id));

    // Add attendee counts to events
    return mapped.map((event) => ({
      ...event,
      attendees: attendeeCounts[event.id] || 0,
    }));
  } catch (error) {
    console.error('Error getting events by IDs:', error);
    return [];
  }
};

/**
 * Create a new event
 */
export const createEvent = async (eventInput: CreateEventInput, createdBy: string): Promise<Event> => {
  if (isDemoMode) {
    return createDemoEvent(eventInput, createdBy);
  }

  try {
    const eventPolicy = await getEventPolicy();
    const status = eventPolicy.moderationMode === 'off' ? 'approved' : 'pending';
    console.log('📋 Event policy:', { moderationMode: eventPolicy.moderationMode, status });

    const checkinCode = generateCheckinCode();

    const insertData = {
      title: eventInput.title,
      description: eventInput.description,
      club_id: parseInt(eventInput.clubId),
      date_iso: eventInput.dateISO,
      location: eventInput.location,
      created_by: createdBy,
      status: status,
      created_at: new Date().toISOString(),
      image_url: eventInput.imageUrl || null,
      checkin_code: checkinCode,
    };
    console.log('💾 Inserting event:', insertData);

    const { data, error } = await supabase.from('events').insert(insertData).select().single();

    if (error) {
      console.error('❌ Error creating event in Supabase:', error);
      if (error.code === '42501') {
        throw new Error('Permission denied. Please check your Supabase RLS policies.');
      }
      throw error;
    }

    console.log('✅ Event inserted successfully:', data);
    console.log('📋 Event status from database:', data.status);

    const result = {
      id: String(data.id),
      title: data.title,
      description: data.description,
      clubId: String(data.club_id),
      dateISO: data.date_iso,
      location: data.location,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at).getTime(),
      status: data.status || status,
      moderationNote: data.moderation_note || undefined,
      imageUrl: data.image_url || undefined,
      checkinCode: data.checkin_code || checkinCode,
    };

    console.log('🎉 Event created successfully:', result);
    console.log('🔍 Final event status:', result.status);
    return result;
  } catch (error) {
    console.error('❌ Error creating event:', error);
    throw error;
  }
};
