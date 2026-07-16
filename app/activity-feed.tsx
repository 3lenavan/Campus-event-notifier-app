import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuthUser } from "../src/hooks/useAuthUser";
import { ActivityItem, getFriendActivity } from "../src/services/activityFeedService";
import { isDemoMode } from "../data/supabaseClient";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";

export default function ActivityFeed() {
  const router = useRouter();
  const { user } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems(await getFriendActivity(user.uid));
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Activity</Text>
        <Pressable onPress={() => router.push("/friends-search")} style={styles.backButton}>
          <Ionicons name="person-add-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isDemoMode ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={40} color={colors.subtitle} />
          <Text style={[styles.emptyText, { color: colors.subtitle }]}>
            Friend activity isn't available in demo mode — connect a Supabase project to see it live.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={40} color={colors.subtitle} />
              <Text style={[styles.emptyText, { color: colors.subtitle }]}>
                Follow other students to see their event activity here.
              </Text>
              <Pressable onPress={() => router.push("/friends-search")} style={[styles.findButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.findButtonText}>Find Students</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/event-details-screen", params: { id: item.event.id } })}
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons
                name={item.type === "rsvp" ? "checkmark-circle-outline" : "heart-outline"}
                size={20}
                color={item.type === "rsvp" ? colors.primary : "#EF4444"}
              />
              <Text style={[styles.rowText, { color: colors.text }]}>
                <Text style={styles.bold}>{item.userName}</Text>
                {item.type === "rsvp" ? " is going to " : " liked "}
                <Text style={styles.bold}>{item.event.title}</Text>
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  listContent: { padding: 16, gap: 10, flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 8, borderWidth: 1 },
  rowText: { flex: 1, fontSize: 14 },
  bold: { fontWeight: "700" },
  emptyText: { textAlign: "center", fontSize: 14 },
  findButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  findButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
