import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { CampusLocation, getLocationForEvent, listCampusLocations } from "../../src/services/campusMapService";
import { listApprovedEvents } from "../../src/services/eventsService";
import { useAppTheme, LightThemeColors } from "../../src/ThemeContext";
import type { Event } from "../../src/types";

const MAP_SIZE = 340;

export default function CampusMap() {
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;

  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const [loadedLocations, loadedEvents] = await Promise.all([listCampusLocations(), listApprovedEvents()]);
        setLocations(loadedLocations);
        setEvents(loadedEvents.filter((event) => new Date(event.dateISO).getTime() >= Date.now()));
        setLoading(false);
      };
      load();
    }, [])
  );

  const eventsByBuilding = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const building = getLocationForEvent(event, locations);
      if (!building) continue;
      const list = map.get(building.id) || [];
      list.push(event);
      map.set(building.id, list);
    }
    return map;
  }, [events, locations]);

  const selectedEvents = selectedBuildingId ? eventsByBuilding.get(selectedBuildingId) || [] : [];
  const selectedBuilding = locations.find((location) => location.id === selectedBuildingId);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Campus Map</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>Tap a building to see what's happening there</Text>
      </View>

      <View style={[styles.mapWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Svg width={MAP_SIZE} height={MAP_SIZE} viewBox="0 0 100 100" style={StyleSheet.absoluteFillObject}>
          <Rect x={2} y={2} width={96} height={96} rx={4} fill={colors.background} />
          <Path d="M 10 50 Q 50 30 90 50" stroke={colors.border} strokeWidth={1.2} fill="none" />
          <Path d="M 50 10 Q 35 50 50 90" stroke={colors.border} strokeWidth={1.2} fill="none" />
          <Circle cx={50} cy={50} r={6} fill={colors.card} stroke={colors.border} strokeWidth={0.5} />
        </Svg>

        {locations.map((location) => {
          const buildingEvents = eventsByBuilding.get(location.id) || [];
          const isSelected = location.id === selectedBuildingId;
          return (
            <Pressable
              key={location.id}
              onPress={() => setSelectedBuildingId(isSelected ? null : location.id)}
              style={[
                styles.pin,
                {
                  left: `${location.xPct}%`,
                  top: `${location.yPct}%`,
                },
              ]}
            >
              <View style={[styles.pinDot, { backgroundColor: isSelected ? colors.primary : colors.card, borderColor: colors.primary }]}>
                <Ionicons name="location" size={16} color={isSelected ? "#FFFFFF" : colors.primary} />
              </View>
              {buildingEvents.length > 0 && (
                <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
                  <Text style={styles.badgeText}>{buildingEvents.length}</Text>
                </View>
              )}
              <Text style={[styles.pinLabel, { color: colors.text }]} numberOfLines={1}>
                {location.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
        {selectedBuilding ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{selectedBuilding.name}</Text>
            {selectedEvents.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.subtitle }]}>No upcoming events here.</Text>
            ) : (
              selectedEvents.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => router.push({ pathname: "/event-details-screen", params: { id: event.id } })}
                  style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text numberOfLines={1} style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                  <Text style={[styles.eventMeta, { color: colors.subtitle }]}>{event.location}</Text>
                </Pressable>
              ))
            )}
          </>
        ) : (
          <Text style={[styles.emptyText, { color: colors.subtitle }]}>Select a building to see its upcoming events.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 4, fontWeight: "500" },
  mapWrapper: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    alignSelf: "center",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "visible",
  },
  pin: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -18 }, { translateY: -18 }],
    width: 36,
  },
  pinDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  pinLabel: { fontSize: 10, fontWeight: "700", marginTop: 2, maxWidth: 70, textAlign: "center" },
  detailScroll: { flex: 1, marginTop: 12 },
  detailContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  eventRow: { padding: 14, borderRadius: 8, borderWidth: 1, gap: 4 },
  eventTitle: { fontSize: 15, fontWeight: "700" },
  eventMeta: { fontSize: 12 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 20 },
});
