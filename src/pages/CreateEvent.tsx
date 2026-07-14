import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isDemoMode, supabase } from "../../data/supabaseClient";
import { useAuthUser } from '../hooks/useAuthUser';
import { checkPersonalConflicts } from '../lib/eventConflicts';
import { getDefaultDenylist, validateEventInput } from '../lib/eventValidators';
import { listClubs } from '../services/clubsService';
import { createEvent, getEventsByIds } from '../services/eventsService';
import { getUserRSVPdEvents } from '../services/interactionsService';
import { Club } from '../types';
import { useAppTheme, LightThemeColors } from '../ThemeContext';
import { HoneycombBackground } from '../components';

// Updated import to use rewritten image picker and uploader
import { pickImage, uploadEventImage } from '../services/imageUploadService';

// Web HTML5 input component - renders native HTML inputs for web
const WebDateInput: React.FC<{
  id: string;
  type: 'date' | 'time';
  value: string;
  min?: string;
  onChange: (value: string) => void;
  colors: any;
}> = ({ id, type, value, min, onChange, colors }) => {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const setupInput = () => {
        // @ts-ignore - React Native Web allows DOM access
        const container = containerRef.current?._nativeNode || 
                         (typeof document !== 'undefined' ? document.getElementById(`container-${id}`) : null);
        
        if (!container) return;

        // Remove existing input if any
        const existing = container.querySelector('input');
        if (existing) {
          existing.remove();
        }

        // Create new input element
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.value = value;
        if (min && type === 'date') input.min = min;
        
        // Apply styles with dark text color for visibility
        // Ensure text is always visible - use dark color unless in dark mode
        const textColor = colors.text === '#FFFFFF' || colors.text === '#fff' || !colors.text || colors.text === colors.inputBackground ? '#000000' : colors.text;
        input.style.cssText = `
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid ${colors.border};
          background-color: ${colors.inputBackground};
          color: ${textColor};
          font-size: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          box-sizing: border-box;
          cursor: pointer;
          outline: none;
          -webkit-appearance: none;
          -moz-appearance: textfield;
        `;
        
        // Add focus styles
        input.addEventListener('focus', () => {
          input.style.borderColor = colors.primary;
          input.style.boxShadow = `0 0 0 3px ${colors.primary}33`;
        });
        
        input.addEventListener('blur', () => {
          input.style.borderColor = colors.border;
          input.style.boxShadow = 'none';
        });
        
        // Handle change
        const handleChange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          if (target.value) {
            onChange(target.value);
          }
        };
        
        input.addEventListener('change', handleChange);
        
        // Append to container
        if (container.appendChild) {
          container.appendChild(input);
        } else if (container.parentNode) {
          container.parentNode.insertBefore(input, container.nextSibling);
        }
      };

      // Setup after render - use requestAnimationFrame for better timing
      const setup = () => {
        requestAnimationFrame(() => {
          setupInput();
        });
      };
      
      const timer = setTimeout(setup, 100);
      
      // Also update value when it changes
      const valueUpdateTimer = setInterval(() => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input && input.value !== value) {
          input.value = value;
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        clearInterval(valueUpdateTimer);
      };
    }
  }, [id, type, value, min, onChange, colors]);

  // Separate effect to update value without recreating the element
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input && input.value !== value) {
        input.value = value;
      }
    }
  }, [id, value]);

  if (Platform.OS !== 'web') return null;

  return (
    <View 
      ref={containerRef}
      style={{ minHeight: 44, width: '100%' }}
      // @ts-ignore - React Native Web supports testID which creates an ID
      testID={`container-${id}`}
    />
  );
};

interface CreateEventProps {
  clubId?: string;
}

export const CreateEvent: React.FC<CreateEventProps> = ({ clubId }) => {
  const router = useRouter();
  const { user, profile } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  const [clubs, setClubs] = useState<Club[]>([]);
  const [userClubIds, setUserClubIds] = useState<string[]>([]);
  const [selectedClubId, setSelectedClubId] = useState(clubId || '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Initialize to tomorrow at 12:00 PM to ensure it's always in the future
  const getDefaultEventDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    return tomorrow;
  };
  const [eventDate, setEventDate] = useState(getDefaultEventDate());
  const [location, setLocation] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Updated image states: store both URI and Base64
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Web date/time input refs - use stable IDs
  const dateInputIdRef = React.useRef(`web-date-input-${Math.random().toString(36).substr(2, 9)}`);
  const timeInputIdRef = React.useRef(`web-time-input-${Math.random().toString(36).substr(2, 9)}`);
  
  // Store stable handler references using useRef
  const handleDateChangeRef = useRef<((e: Event) => void) | null>(null);
  const handleTimeChangeRef = useRef<((e: Event) => void) | null>(null);

  // Setup web date/time input event listeners
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Setup date input listener
      const setupDateInput = () => {
        const dateInput = document.getElementById(dateInputIdRef.current) as HTMLInputElement;
        if (dateInput) {
          // Remove old listener if it exists
          if (handleDateChangeRef.current) {
            dateInput.removeEventListener('change', handleDateChangeRef.current);
          }
          
          // Create new handler
          const handleDateChange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.value) {
              const newDate = new Date(target.value + 'T' + eventDate.toTimeString().slice(0, 5));
              const now = new Date();
              if (newDate <= now) {
                newDate.setDate(now.getDate() + 1);
              }
              setEventDate(newDate);
            }
          };
          
          // Store reference and add listener
          handleDateChangeRef.current = handleDateChange;
          dateInput.addEventListener('change', handleDateChange);
        }
      };

      // Setup time input listener
      const setupTimeInput = () => {
        const timeInput = document.getElementById(timeInputIdRef.current) as HTMLInputElement;
        if (timeInput) {
          // Remove old listener if it exists
          if (handleTimeChangeRef.current) {
            timeInput.removeEventListener('change', handleTimeChangeRef.current);
          }
          
          // Create new handler
          const handleTimeChange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.value) {
              const [hours, minutes] = target.value.split(':');
              const newDate = new Date(eventDate);
              newDate.setHours(parseInt(hours, 10));
              newDate.setMinutes(parseInt(minutes, 10));
              const now = new Date();
              if (newDate <= now) {
                newDate.setDate(newDate.getDate() + 1);
              }
              setEventDate(newDate);
            }
          };
          
          // Store reference and add listener
          handleTimeChangeRef.current = handleTimeChange;
          timeInput.addEventListener('change', handleTimeChange);
        }
      };

      // Setup after a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setupDateInput();
        setupTimeInput();
      }, 100);

      return () => {
        clearTimeout(timer);
        // Cleanup: remove listeners using stored references
        const dateInput = document.getElementById(dateInputIdRef.current) as HTMLInputElement;
        const timeInput = document.getElementById(timeInputIdRef.current) as HTMLInputElement;
        if (dateInput && handleDateChangeRef.current) {
          dateInput.removeEventListener('change', handleDateChangeRef.current);
        }
        if (timeInput && handleTimeChangeRef.current) {
          timeInput.removeEventListener('change', handleTimeChangeRef.current);
        }
      };
    }
  }, [eventDate, Platform.OS]);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    const data = await listClubs();
    setClubs(data || []);
  };

  const loadUserClubs = async () => {
    if (!user) return;

    if (isDemoMode) {
      const availableClubs = await listClubs();
      setUserClubIds(
        availableClubs
          .filter((club) => profile?.memberships.includes(club.slug))
          .map((club) => club.id)
      );
      return;
    }

    const { data, error } = await supabase
      .from('clubs_users')
      .select('club_id')
      .eq('user_id', user.uid);

    if (!data || error) {
      setUserClubIds([]);
      return;
    }

    setUserClubIds(data.map((row: any) => String(row.club_id)));
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadUserClubs();
      }
    }, [user, profile?.memberships])
  );

  useEffect(() => {
    if (userClubIds.length > 0 && !selectedClubId) {
      setSelectedClubId(String(userClubIds[0]));
    }
  }, [userClubIds]);

  const pickerColor = '#000000';

  const toTitleCase = (value: string) =>
    value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

  const LOCATION_REGEX = /^.+\s-\sRoom\s\d+$/;

  const handleLocationChange = (value: string) => {
    const formatted = toTitleCase(value);
    setLocation(formatted);

    if (formatted.length === 0) {
      setLocationError(null);
    } else if (!LOCATION_REGEX.test(formatted)) {
      setLocationError("Use format: Building - Room 123");
    } else {
      setLocationError(null);
    }
  };

  // Updated: Pick image using new picker that returns { uri, base64 }
  const handlePickImage = async () => {
    const result = await pickImage();
    if (result) {
      setSelectedImageUri(result.uri);
      setSelectedImageBase64(result.base64);
    }
  };

  // Updated: Remove image clears both values
  const handleRemoveImage = () => {
    setSelectedImageUri(null);
    setSelectedImageBase64(null);
  };

  const handleCreateEvent = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    const errors: string[] = [];
    if (!selectedClubId) errors.push('Please select a club');
    if (!title.trim()) errors.push('Please enter a title');
    if (!description.trim()) errors.push('Please enter a description');
    if (!location.trim() || !LOCATION_REGEX.test(location.trim()))
      errors.push("Location must match 'Building - Room 123'");

    if (!userClubIds.includes(String(selectedClubId))) {
      errors.push('You must be a verified member of this club to create events');
    }

    if (errors.length) {
      setValidationErrors(errors);
      return;
    }

    const candidateInput = {
      title: title.trim(),
      description: description.trim(),
      clubId: selectedClubId,
      dateISO: eventDate.toISOString(),
      location: location.trim(),
      ...(selectedImageBase64 ? { image: selectedImageBase64 } : {}),
    };

    const policyCheck = await validateEventInput(candidateInput, user.uid, getDefaultDenylist());
    if (!policyCheck.ok) {
      setValidationErrors(policyCheck.errors);
      return;
    }

    setValidationErrors([]);

    try {
      const rsvpedIds = await getUserRSVPdEvents(user.uid);
      const rsvpedEvents = rsvpedIds.length ? await getEventsByIds(rsvpedIds) : [];
      const conflicts = checkPersonalConflicts(
        { id: '', title: candidateInput.title, dateISO: candidateInput.dateISO },
        rsvpedEvents
      );
      setConflictWarnings(conflicts.map((conflict) => conflict.message));
    } catch (error) {
      console.error('Error checking schedule conflicts:', error);
    }

    setLoading(true);
    let imageUrl: string | undefined = undefined;

    // Updated image upload logic using new uploadEventImage
    if (selectedImageUri && selectedImageBase64) {
      setUploadingImage(true);

      const uploadedUrl = await uploadEventImage(
        selectedImageUri,
        selectedImageBase64,
        user.uid
      );

      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        Alert.alert("Warning", "Failed to upload image. Event will be created without image.");
      }

      setUploadingImage(false);
    }

    try {
      console.log('📝 Creating event...', { title: title.trim(), clubId: selectedClubId, dateISO: eventDate.toISOString() });
      const newEvent = await createEvent(
        {
          title: title.trim(),
          description: description.trim(),
          clubId: selectedClubId,
          dateISO: eventDate.toISOString(),
          location: location.trim(),
          imageUrl: imageUrl,
        },
        user.uid
      );
      console.log('✅ Event created:', newEvent);

      // Clear form
      setTitle('');
      setDescription('');
      setLocation('');
      setSelectedImageUri(null);
      setSelectedImageBase64(null);
      setValidationErrors([]);
      setConflictWarnings([]);

      // Show success message and navigate
      const message = newEvent.status === 'approved' 
        ? `"${title.trim()}" has been successfully created and is now visible to everyone!`
        : `"${title.trim()}" has been created and is pending admin approval.`;

      Alert.alert(
        'Event Created! ✅', 
        message,
        [
          { 
            text: 'View Event', 
            onPress: () => {
              // Navigate to event details to show the new event immediately
              router.replace({ pathname: '/event-details-screen', params: { id: newEvent.id } });
            },
            style: 'default'
          },
          { 
            text: 'Go to Home', 
            onPress: async () => {
              // Navigate to home feed - give it a moment to ensure event is committed
              await new Promise(resolve => setTimeout(resolve, 600));
              router.push('/(tabs)/home');
            },
            style: 'cancel'
          }
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error('Error creating event:', error);
      Alert.alert('Error', error.message || 'Failed to create event. Please try again.');
      setValidationErrors([error.message || 'Failed to create event']);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color={colors.subtitle} />
          <Text style={[styles.centeredText, { color: colors.text }]}>Please sign in to create events</Text>
        </View>
      </View>
    );
  }

  const userClubs = clubs.filter((c) => userClubIds.includes(String(c.id)));

  if (userClubs.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={48} color={colors.subtitle} />
          <Text style={[styles.centeredText, { color: colors.text }]}>You need to join a club first</Text>
          <TouchableOpacity
            style={[styles.verifyButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/verify-club')}
          >
            <Text style={styles.verifyButtonText}>Verify Club Membership</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HoneycombBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={[styles.headerPanel, { backgroundColor: isDark ? colors.card : colors.nectar, borderColor: colors.border }]}>
            <View style={styles.kickerRow}>
              <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
              <Text style={[styles.kicker, { color: colors.primary }]}>Send a Buzz</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Create Event</Text>
            <Text style={[styles.subtitle, { color: colors.subtitle }]}>Post a club event for the campus hive.</Text>
          </View>

          {/* Club selection */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Select Club *</Text>
            <View style={styles.clubSelector}>
              {userClubs.map((club) => (
                <TouchableOpacity
                  key={club.id}
                  style={[
                    styles.clubOption,
                    { backgroundColor: isDark ? colors.border : colors.nectar, borderColor: colors.border },
                    selectedClubId === club.id && [styles.clubOptionSelected, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setSelectedClubId(club.id)}
                >
                  <Text
                    style={[
                      styles.clubOptionText,
                      { color: colors.text },
                      selectedClubId === club.id && styles.clubOptionTextSelected,
                    ]}
                  >
                    {club.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Event Title */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Event Title *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Enter event title"
              placeholderTextColor={colors.placeholderText}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Describe your event..."
              placeholderTextColor={colors.placeholderText}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          {/* Date and time pickers */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Date & Time *</Text>
            {/* Date and time pickers - unified approach for all platforms */}
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {eventDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[styles.dateTimeText, { color: colors.text }]}>
                  {eventDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View style={[
                Platform.OS === 'ios' ? { 
                  backgroundColor: colors.card, 
                  borderRadius: 12,
                  padding: 8,
                } : {},
                Platform.OS === 'web' ? {
                  backgroundColor: colors.card,
                  borderRadius: 8,
                  padding: 12,
                } : {}
              ]}>
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : Platform.OS === 'web' ? 'inline' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android' || Platform.OS === 'web') {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      const newDate = new Date(selectedDate);
                      newDate.setHours(eventDate.getHours());
                      newDate.setMinutes(eventDate.getMinutes());
                      // Ensure the date is in the future
                      const now = new Date();
                      if (newDate <= now) {
                        // If date is today or past, set to tomorrow
                        newDate.setDate(now.getDate() + 1);
                      }
                      setEventDate(newDate);
                    } else if (Platform.OS === 'android' || Platform.OS === 'web') {
                      setShowDatePicker(false);
                    }
                  }}
                  minimumDate={new Date()}
                  textColor={isDark ? colors.text : '#0B0C0E'}
                  themeVariant={isDark ? 'dark' : 'light'}
                  accentColor={colors.primary}
                />
              </View>
            )}

            {showTimePicker && (
              <View style={[
                Platform.OS === 'ios' ? { 
                  backgroundColor: colors.card, 
                  borderRadius: 12,
                  padding: 8,
                } : {},
                Platform.OS === 'web' ? {
                  backgroundColor: colors.card,
                  borderRadius: 8,
                  padding: 12,
                } : {}
              ]}>
                <DateTimePicker
                  value={eventDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : Platform.OS === 'web' ? 'inline' : 'default'}
                  onChange={(event, selectedTime) => {
                    if (Platform.OS === 'android' || Platform.OS === 'web') {
                      setShowTimePicker(false);
                    }
                    if (selectedTime) {
                      const newDate = new Date(eventDate);
                      const selectedHours = selectedTime.getHours();
                      const selectedMinutes = selectedTime.getMinutes();
                      newDate.setHours(selectedHours);
                      newDate.setMinutes(selectedMinutes);
                      // If the selected time makes the date in the past, move to next day
                      const now = new Date();
                      if (newDate <= now) {
                        newDate.setDate(newDate.getDate() + 1);
                      }
                      setEventDate(newDate);
                    } else if (Platform.OS === 'android' || Platform.OS === 'web') {
                      setShowTimePicker(false);
                    }
                  }}
                  textColor={isDark ? colors.text : '#0B0C0E'}
                  themeVariant={isDark ? 'dark' : 'light'}
                  accentColor={colors.primary}
                />
              </View>
            )}

            {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
              <View style={styles.iosPickerActions}>
                <TouchableOpacity
                  style={styles.iosPickerButton}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.iosPickerButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Location */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Location *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Building - Room 123"
              placeholderTextColor={colors.placeholderText}
              value={location}
              onChangeText={handleLocationChange}
            />
            {locationError && (
              <Text style={[styles.errorTextSmall, { color: '#DC2626' }]}>{locationError}</Text>
            )}
          </View>

          {/* Image Picker Section (Updated) */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Event Image (Optional)</Text>

            {selectedImageUri ? (
              <View style={[styles.imagePreviewContainer, { borderColor: colors.border }]}>
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Ionicons name="close-circle" size={24} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.imagePickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={handlePickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={20} color={colors.primary} />
                    <Text style={[styles.imagePickerText, { color: colors.primary }]}>Select Image</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <View style={[styles.errorContainer, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              {validationErrors.map((error, idx) => (
                <Text key={idx} style={styles.errorText}>
                  • {error}
                </Text>
              ))}
            </View>
          )}

          {/* Schedule conflict warnings (informational only, doesn't block submission) */}
          {conflictWarnings.length > 0 && (
            <View style={[styles.errorContainer, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
              {conflictWarnings.map((warning, idx) => (
                <Text key={idx} style={[styles.errorText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                  ⚠ {warning}
                </Text>
              ))}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleCreateEvent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.createButtonText}>Create Event</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  content: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centeredText: { fontSize: 16, marginTop: 16 },
  verifyButton: {
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  verifyButtonText: { color: 'white', fontWeight: '600' },
  headerPanel: {
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
  },
  iosPickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iosPickerButtonText: {
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '600',
  },
  clubSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clubOption: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  clubOptionSelected: { },
  clubOptionTextSelected: { color: 'white' },
  clubOptionText: { },
  createButton: {
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  createButtonText: { color: 'white', fontWeight: '600', marginLeft: 8 },
  buttonDisabled: { opacity: 0.6 },
  errorContainer: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  errorText: { color: '#DC2626' },
  errorTextSmall: { fontSize: 12 },
  helpText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  imagePickerText: {
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imagePreview: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
  },
});
