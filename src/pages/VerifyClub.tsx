import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthUser } from "../hooks/useAuthUser";
import { verifyClubMembership } from "../services/profileService";
import { supabase } from "../../data/supabaseClient";
import { listClubs } from "../services/clubsService";
import { Club } from "../types";
import { useAppTheme, LightThemeColors } from "../ThemeContext";
import { showAlert } from "../lib/alert";

export const VerifyClub = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { user, refreshProfile } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [clubInput, setClubInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    loadClubs();
    if (user) loadMyClubs();
  }, [user]);

  const loadClubs = async () => {
    const data = await listClubs();
    setClubs(data || []);
  };

  const loadMyClubs = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("clubs_users")
      .select("club_id, clubs(*)")
      .eq("user_id", user.uid);

    if (!data) return;

    const extracted = data.map((row: any) => row.clubs);
    setMyClubs(extracted);
  };

  const handleVerify = async () => {
    if (!user) return showAlert("Error", "Please sign in first.");

    if (!clubInput.trim() || !codeInput.trim()) {
      return showAlert("Error", "Fill in all fields.");
    }

    setLoading(true);

    const result = await verifyClubMembership(
      user.uid,
      clubInput.trim(),
      codeInput.trim()
    );

    setLoading(false);

    if (!result.success) {
      return showAlert("Error", result.message);
    }

    // ✔ FIX: Refresh profile and reload clubs
    await refreshProfile();
    await loadMyClubs();

    showAlert("Success", result.message);

    setClubInput("");
    setCodeInput("");
    onSuccess?.();
  };

  const filtered = clubs.filter(
    (c) =>
      c.name.toLowerCase().includes(clubInput.toLowerCase()) ||
      c.slug.toLowerCase().includes(clubInput.toLowerCase())
  );

  const renderClub = ({ item }: { item: Club }) => (
    <TouchableOpacity
      style={styles.clubItem}
      onPress={() => {
        setClubInput(item.slug);
        setShowList(false);
      }}
    >
      <Text style={[styles.clubName, { color: colors.text }]}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.subtitle} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.text }]}>Verify Club Membership</Text>

        <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Ionicons name="school" size={20} color={colors.subtitle} />
          <TextInput
            placeholder="Club name or slug"
            placeholderTextColor={colors.placeholderText}
            style={[styles.input, { color: colors.text }]}
            value={clubInput}
            onChangeText={(t) => {
              setClubInput(t);
              setShowList(t.length > 0);
            }}
            autoCapitalize="none"
          />
        </View>

        {showList && filtered.length > 0 && (
          <FlatList
            data={filtered.slice(0, 5)}
            renderItem={renderClub}
            keyExtractor={(i) => i.slug}
            style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
          />
        )}

        <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Ionicons name="key" size={20} color={colors.subtitle} />
          <TextInput
            placeholder="Verification code"
            placeholderTextColor={colors.placeholderText}
            style={[styles.input, { color: colors.text }]}
            value={codeInput}
            onChangeText={setCodeInput}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.myClubs}>
          <Text style={[styles.subtitle, { color: colors.text }]}>Your Clubs</Text>

          {myClubs.map((c) => (
            <View key={c.id} style={styles.myClubRow}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={[styles.myClubText, { color: colors.text }]}>{c.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  input: { marginLeft: 10, flex: 1 },
  dropdown: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  clubItem: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clubName: { fontSize: 16 },
  button: {
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  myClubs: { marginTop: 30 },
  subtitle: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  myClubRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  myClubText: { marginLeft: 8, fontSize: 15 },
});
