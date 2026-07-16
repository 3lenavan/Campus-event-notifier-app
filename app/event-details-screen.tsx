// Imports
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { EncodingType } from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { isDemoMode, supabase } from "../data/supabaseClient";
import { Club, getClubByIdSupabase } from "../data/dataLoader";
import { auth, db } from "../src/lib/firebase";
import { useAuthUser } from "../src/hooks/useAuthUser";
import {
  cancelEventReminders,
  notifyRSVPConfirmation,
  scheduleEventReminders,
} from "../src/services/notificationsService";
import { listApprovedEvents, getEventById } from "../src/services/eventsService";
import { listClubs } from "../src/services/clubsService";
import { canManageCheckin, getCheckinQrPayload, isWithinCheckinWindow } from "../src/services/checkinService";
import {
  getEventLikeCount,
  getEventsInteractions,
  toggleFavorite as toggleFavoriteService,
  toggleLike as toggleLikeService,
  toggleRSVP as toggleRSVPService,
  isEventRSVPd,
} from "../src/services/interactionsService";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";
import { BuzzUpMascot, HoneycombBackground } from "../src/components";

// Event interface
interface Event {
  id: string;
  title: string;
  description: string;

  // ✅ Store full ISO string here now (ex: 2025-12-15T02:17:00.000Z)
  date: string;

  // Display time string (ex: 21:17)
  time: string;

  location: string;
  category: string;
  attendees: number;
  maxAttendees?: number;
  imageUrl?: string;
  isUserAttending?: boolean;
  organizer?: string;
  fullDescription?: string;
  status?: "pending" | "approved" | "rejected";
  clubId?: string;
  checkinCode?: string;
}

// Main Component
export default function EventDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  // Event state
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [rsvped, setRsvped] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [club, setClub] = useState<Club | null>(null);

  // Track logged-in user
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  // Organizer check-in tools: which clubs the current user can manage events for.
  // Mirrors src/pages/CreateEvent.tsx's loadUserClubs — same trust check, same source.
  const { profile } = useAuthUser();
  const [userClubIds, setUserClubIds] = useState<string[]>([]);
  useEffect(() => {
    const loadUserClubs = async () => {
      if (!currentUser?.uid) {
        setUserClubIds([]);
        return;
      }

      if (isDemoMode) {
        const availableClubs = await listClubs();
        setUserClubIds(
          availableClubs
            .filter((c) => profile?.memberships.includes(c.slug))
            .map((c) => c.id)
        );
        return;
      }

      const { data, error } = await supabase
        .from("clubs_users")
        .select("club_id")
        .eq("user_id", currentUser.uid);

      if (error || !data) {
        setUserClubIds([]);
        return;
      }

      setUserClubIds(data.map((row: any) => String(row.club_id)));
    };

    loadUserClubs();
  }, [currentUser?.uid, profile?.memberships]);

  const canManage = event ? canManageCheckin({ clubId: event.clubId || "" }, profile, userClubIds) : false;

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);

        // First try to get the event by ID directly
        const foundEvent = await getEventById(id);

        if (foundEvent) {
          const eventDate = new Date(foundEvent.dateISO);

          const eventData: Event = {
            id: foundEvent.id,
            title: foundEvent.title,
            description: foundEvent.description,

            // ✅ Keep ISO (prevents UTC date shift bugs)
            date: foundEvent.dateISO,

            // ✅ Time formatted from same ISO
            time: eventDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),

            location: foundEvent.location,
            category: "Club Event",
            attendees: foundEvent.attendees || 0,
            maxAttendees: undefined,
            imageUrl: foundEvent.imageUrl,
            isUserAttending: false,
            organizer: undefined,
            fullDescription: foundEvent.description,
            status: foundEvent.status,
            clubId: foundEvent.clubId,
            checkinCode: foundEvent.checkinCode,
          };

          setEvent(eventData);

          // Fetch club information
          if (foundEvent.clubId) {
            try {
              const clubData = await getClubByIdSupabase(Number(foundEvent.clubId));
              setClub(clubData);
            } catch (error) {
              console.error("Error fetching club:", error);
            }
          }

          // Load RSVP status if user is logged in (only for approved events)
          if (currentUser?.uid && foundEvent.status === "approved") {
            const isRSVPd = await isEventRSVPd(currentUser.uid, foundEvent.id);
            setRsvped(isRSVPd);
            setEvent((prev) => (prev ? { ...prev, isUserAttending: isRSVPd } : prev));
          }
        } else {
          // Fallback: Try approved events list (backward compatibility)
          const approvedEvents = await listApprovedEvents();
          const fallbackEvent = approvedEvents.find((e) => e.id === id);

          if (fallbackEvent) {
            const eventDate = new Date(fallbackEvent.dateISO);

            const eventData: Event = {
              id: fallbackEvent.id,
              title: fallbackEvent.title,
              description: fallbackEvent.description,

              // ✅ Keep ISO
              date: fallbackEvent.dateISO,

              // ✅ Time from same ISO
              time: eventDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),

              location: fallbackEvent.location,
              category: "Club Event",
              attendees: fallbackEvent.attendees || 0,
              maxAttendees: undefined,
              imageUrl: fallbackEvent.imageUrl,
              isUserAttending: false,
              organizer: undefined,
              fullDescription: fallbackEvent.description,
              status: fallbackEvent.status,
              clubId: fallbackEvent.clubId,
              checkinCode: fallbackEvent.checkinCode,
            };

            setEvent(eventData);

            if (fallbackEvent.clubId) {
              try {
                const clubData = await getClubByIdSupabase(Number(fallbackEvent.clubId));
                setClub(clubData);
              } catch (error) {
                console.error("Error fetching club:", error);
              }
            }

            if (currentUser?.uid) {
              const isRSVPd = await isEventRSVPd(currentUser.uid, fallbackEvent.id);
              setRsvped(isRSVPd);
              setEvent((prev) => (prev ? { ...prev, isUserAttending: isRSVPd } : prev));
            }
          } else {
            // Last fallback to Firestore if not found in Supabase
            const docRef = doc(db, "events", id as string);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              setEvent({ ...(docSnap.data() as Event), id: docSnap.id });
            } else {
              console.log("No such event!");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, currentUser?.uid]);

  // Load like/favorite/RSVP status when event or user changes
  useEffect(() => {
    const loadInteractions = async () => {
      if (!event?.id) return;

      try {
        if (currentUser?.uid) {
          const interactions = await getEventsInteractions(currentUser.uid, [event.id]);
          setLiked(interactions.likedEvents.has(event.id));
          setFavorited(interactions.favoritedEvents.has(event.id));
          setRsvped(interactions.rsvpedEvents.has(event.id));
          setLikeCount(interactions.likeCounts[event.id] || 0);

          setEvent((prev) =>
            prev ? { ...prev, isUserAttending: interactions.rsvpedEvents.has(event.id) } : null
          );
        } else {
          const count = await getEventLikeCount(event.id);
          setLikeCount(count);
          setLiked(false);
          setFavorited(false);
          setRsvped(false);
        }
      } catch (error) {
        console.error("Error loading interactions:", error);
      }
    };

    loadInteractions();
  }, [event?.id, currentUser?.uid]);

  // Handle like toggle
  const handleToggleLike = async () => {
    if (!currentUser) {
      alert("Please log in to like events.");
      return;
    }

    try {
      const newLikedState = await toggleLikeService(currentUser.uid, event!.id);
      setLiked(newLikedState);

      const count = await getEventLikeCount(event!.id);
      setLikeCount(count);
    } catch (error) {
      console.error("Error toggling like:", error);
      alert("Failed to update like. Please try again.");
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!currentUser) {
      alert("Please log in to favorite events.");
      return;
    }

    try {
      const newFavoritedState = await toggleFavoriteService(currentUser.uid, event!.id);
      setFavorited(newFavoritedState);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("Failed to update favorite. Please try again.");
    }
  };

  // Handle RSVP Toggle (simple, no email preference modal)
  const handleRSVP = async (eventId: string, eventTitle: string) => {
    try {
      if (!currentUser) {
        alert("Please log in to RSVP.");
        return;
      }

      const newRSVPState = await toggleRSVPService(currentUser.uid, eventId);
      setRsvped(newRSVPState);
      setEvent((prev) => (prev ? { ...prev, isUserAttending: newRSVPState } : null));

      if (newRSVPState) {
        // RSVP'd successfully
        try {
          await notifyRSVPConfirmation(eventTitle);
          if (event) {
            await scheduleEventReminders({
              id: eventId,
              title: eventTitle,
              dateISO: event.date,
              location: event.location,
            });
          }
          await addDoc(collection(db, "notifications"), {
            userId: currentUser.uid,
            message: `You RSVP'd for ${eventTitle}!`,
            timestamp: serverTimestamp(),
            read: false,
          });
        } catch {}
      } else {
        // Canceled RSVP
        await cancelEventReminders(eventId).catch(() => {});
        alert(`RSVP canceled for "${eventTitle}"`);
      }
    } catch (error) {
      console.error("Error toggling RSVP:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Handle Add to Calendar
  const handleAddToCalendar = async (event: Event) => {
    try {
      // ✅ event.date is ISO now, so just use it
      const eventDateTime = new Date(event.date);

      if (isNaN(eventDateTime.getTime())) {
        throw new Error("Invalid event date/time");
      }

      // Format dates for ICS (YYYYMMDDTHHMMSSZ)
      const formatICSDate = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        const hours = String(date.getUTCHours()).padStart(2, "0");
        const minutes = String(date.getUTCMinutes()).padStart(2, "0");
        const seconds = String(date.getUTCSeconds()).padStart(2, "0");
        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
      };

      const startTime = formatICSDate(eventDateTime);
      const endTime = formatICSDate(new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000));

      const uid = `event-${event.id}-${Date.now()}@campuseventnotifier.app`;

      const escapeICS = (text: string): string => {
        return text
          .replace(/\\/g, "\\\\")
          .replace(/;/g, "\\;")
          .replace(/,/g, "\\,")
          .replace(/\n/g, "\\n");
      };

      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Campus Event Notifier//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTART:${startTime}`,
        `DTEND:${endTime}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `SUMMARY:${escapeICS(event.title)}`,
        `DESCRIPTION:${escapeICS(event.description || "")}\\n\\nLocation: ${escapeICS(event.location)}`,
        `LOCATION:${escapeICS(event.location)}`,
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      if (Platform.OS === "web" && typeof document !== "undefined") {
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${event.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert("Calendar file downloaded successfully!");
      } else {
        const fileName = `${event.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`;

        const cacheDir = FileSystem.cacheDirectory;
        const docDir = FileSystem.documentDirectory;
        const directory = cacheDir || docDir;

        if (directory) {
          try {
            const fileUri = `${directory}${directory.endsWith("/") ? "" : "/"}${fileName}`;

            await FileSystem.writeAsStringAsync(fileUri, icsContent, {
              encoding: EncodingType.UTF8,
            });

            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
              throw new Error("File was not created successfully");
            }

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(fileUri, {
                mimeType: "text/calendar",
                dialogTitle: "Add to Calendar",
                UTI: Platform.OS === "ios" ? "com.apple.ical.ics" : undefined,
              });

              setTimeout(() => {
                if (Platform.OS === "ios") {
                  Alert.alert(
                    "How to Add to Calendar",
                    'In the share menu:\n\n• Tap "Add to Calendar"\n• Or "Save to Files" then open it\n• Or email it to yourself',
                    [{ text: "OK" }]
                  );
                } else {
                  Alert.alert(
                    "How to Add to Calendar",
                    'In the share menu:\n\n• Tap "Google Calendar" if available\n• Or save the file then open it with your calendar app',
                    [{ text: "OK" }]
                  );
                }
              }, 500);

              return;
            }
          } catch (fileError: any) {
            console.error("Error with file system approach:", fileError);
          }
        }

        try {
          const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

          const canOpen = await Linking.canOpenURL(dataUri);
          if (canOpen) {
            await Linking.openURL(dataUri);
            return;
          }

          alert(
            `Calendar file ready!\n\nSince file system access is limited, please:\n1. Copy this link and open it in your browser\n2. Or use the share button\n\nTry a development build instead of Expo Go if needed.`
          );

          if (await Sharing.isAvailableAsync()) {
            const tempContent = `To add this event to your calendar, copy and open:\n\n${dataUri}`;
            const tempFileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ""}calendar_instructions.txt`;

            try {
              if (FileSystem.cacheDirectory || FileSystem.documentDirectory) {
                await FileSystem.writeAsStringAsync(tempFileUri, tempContent, {
                  encoding: EncodingType.UTF8,
                });
                await Sharing.shareAsync(tempFileUri, {
                  dialogTitle: "Calendar Event Instructions",
                });
              }
            } catch (e) {
              console.log("Data URI:", dataUri);
            }
          }
        } catch (fallbackError: any) {
          console.error("Error with data URI fallback:", fallbackError);
          alert(
            `Unable to create calendar file. Try a development build or web version. Error: ${
              fallbackError?.message || fallbackError
            }`
          );
        }
      }
    } catch (error: any) {
      console.error("Error creating calendar file:", error);
      alert(`Failed to create calendar file: ${error.message || "Please try again."}`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.text }]}>Event not found</Text>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/home");
            }
          }}
          style={[styles.backButtonText, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.backButtonTextLabel}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Helpers
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isEventFull = event.maxAttendees && event.attendees >= event.maxAttendees;

  // ✅ event.date is ISO now, so this comparison is correct
  const isEventPast = new Date(event.date).getTime() < Date.now();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HoneycombBackground />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: event.imageUrl || "https://via.placeholder.com/800x400.png?text=Event+Image",
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Header Overlay */}
          <View style={styles.heroHeader}>
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/home");
                }
              }}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={styles.heartButton}
              disabled={!currentUser}
              activeOpacity={0.8}
            >
              <Ionicons
                name={favorited ? "heart" : "heart-outline"}
                size={24}
                color={favorited ? "#EF4444" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={[styles.contentSection, { backgroundColor: colors.background }]}>
          <View style={[styles.detailPill, { backgroundColor: isDark ? colors.card : colors.nectar, borderColor: colors.border }]}>
            <Ionicons name="radio-outline" size={15} color={colors.primary} />
            <Text style={[styles.detailPillText, { color: colors.primary }]}>Event Buzz</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

          {club && (
            <View style={styles.clubRow}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={[styles.clubText, { color: colors.primary }]}>{club.name}</Text>
            </View>
          )}

          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.subtitle }]}>{event.location}</Text>
          </View>

          {likeCount > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="heart" size={16} color="#EF4444" />
              <Text style={[styles.ratingText, { color: "#EF4444" }]}>{likeCount}</Text>
              <Text style={[styles.reviewsText, { color: colors.subtitle }]}>likes</Text>
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionSection}>
            <View style={styles.descriptionRow}>
              <Text style={[styles.description, { color: colors.subtitle }]} numberOfLines={undefined}>
                {event.fullDescription || event.description}
              </Text>
              <BuzzUpMascot size={142} style={styles.detailMascot} />
            </View>
          </View>

          {/* Event Details */}
          <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color={colors.subtitle} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(event.date)}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color={colors.subtitle} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Time</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{event.time}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={20} color={colors.subtitle} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Attendees</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {event.attendees} {event.maxAttendees && `/ ${event.maxAttendees} max`}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleToggleLike}
              disabled={!currentUser}
              activeOpacity={0.7}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={22}
                color={liked ? "#EF4444" : colors.subtitle}
              />
              <Text style={[styles.actionText, { color: colors.subtitle }, liked && styles.likedText]}>
                {likeCount} {likeCount === 1 ? "like" : "likes"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* RSVP Button - Only show for approved events */}
          {event.status && event.status !== "approved" ? (
            <View
              style={[
                styles.primaryButton,
                styles.disabledButton,
                {
                  backgroundColor: colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons name="time-outline" size={20} color={colors.subtitle} />
              <Text style={[styles.primaryButtonText, { color: colors.subtitle, marginLeft: 8 }]}>
                {event.status === "pending" ? "Event Pending Approval" : "Event Not Available"}
              </Text>
            </View>
          ) : isEventPast ? (
            <TouchableOpacity
              style={[styles.primaryButton, styles.disabledButton, { backgroundColor: colors.border }]}
              disabled
            >
              <Text style={styles.primaryButtonText}>Event has ended</Text>
            </TouchableOpacity>
          ) : isEventFull && !rsvped ? (
            <TouchableOpacity
              style={[styles.primaryButton, styles.disabledButton, { backgroundColor: colors.border }]}
              disabled
            >
              <Text style={styles.primaryButtonText}>Event is full</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: rsvped ? colors.honey : colors.primary },
              ]}
              onPress={() => handleRSVP(event.id, event.title)}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryButtonText, rsvped && { color: colors.text }]}>
                {rsvped ? "Cancel RSVP" : "RSVP to Event"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Check In Button - only for RSVP'd attendees, within the check-in window */}
          {rsvped && event.status === "approved" && isWithinCheckinWindow(event.date) && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: "/checkin-scanner", params: { id: event.id } })}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Scan to Check In</Text>
            </TouchableOpacity>
          )}

          {/* Add to Calendar Button */}
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleAddToCalendar(event)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Add to Calendar</Text>
          </TouchableOpacity>

          {/* Organizer tools: check-in QR + analytics, only visible to club members/admins */}
          {canManage && event.checkinCode && (
            <View style={[styles.organizerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.organizerTitle, { color: colors.text }]}>Organizer tools</Text>
              <Text style={[styles.organizerSubtitle, { color: colors.subtitle }]}>
                Display this code at the venue — attendees scan it with their own phone to check in.
              </Text>
              <View style={styles.qrWrapper}>
                <QRCode value={getCheckinQrPayload({ id: event.id, checkinCode: event.checkinCode })} size={180} />
              </View>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: "/event-analytics", params: { id: event.id } })}
                activeOpacity={0.8}
              >
                <Ionicons name="stats-chart-outline" size={20} color={colors.text} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>View Check-in Analytics</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 120 },
  heroContainer: {
    position: "relative",
    width: "100%",
    height: 320,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentSection: {
    padding: 20,
  },
  detailPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  detailPillText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: 0,
    lineHeight: 38,
  },
  clubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  clubText: {
    fontSize: 15,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "600",
  },
  reviewsText: {
    fontSize: 15,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  description: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  detailMascot: {
    marginRight: -14,
    marginVertical: -18,
  },
  detailsCard: {
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionsCard: {
    marginBottom: 20,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  likedText: {
    color: "#EF4444",
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonStyle: {},
  cancelButtonText: {},
  disabledButton: {},
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  backButtonText: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonTextLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  organizerCard: {
    marginTop: 12,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  organizerTitle: {
    fontSize: 18,
    fontWeight: "700",
    alignSelf: "flex-start",
  },
  organizerSubtitle: {
    fontSize: 13,
    alignSelf: "flex-start",
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
});
