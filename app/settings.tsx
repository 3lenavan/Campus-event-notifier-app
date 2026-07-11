import { router } from "expo-router";
import { SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useAuthUser } from "../src/hooks/useAuthUser";
import { LightThemeColors, useAppTheme } from "../src/ThemeContext";
import { HoneycombBackground } from "../src/components";


export default function Settings() {
  const { profile } = useAuthUser();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;
  const toggleTheme = themeContext?.toggleTheme || (() => {});

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.safeArea }]}>
      <HoneycombBackground />
      <View style={[styles.headerPanel, { backgroundColor: isDark ? colors.card : colors.nectar, borderColor: colors.border }]}>
        <Text style={[styles.header, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>Tune your BuzzUp hive.</Text>
      </View>

      <View style={[styles.card, styles.cardSpacing, styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Dark Mode</Text>
        <Switch value={isDark} onValueChange={toggleTheme} />
      </View>

      <TouchableOpacity
        style={[styles.card, styles.cardSpacing, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/update-password")}
      >
        <Text style={[styles.title, { color: colors.text }]}>Update Password</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>Change your account password</Text>
      </TouchableOpacity>

      {profile?.isAdmin && (
        <TouchableOpacity
          style={[styles.card, styles.cardSpacing, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/admin-settings")}
        >
          <Text style={[styles.title, { color: colors.text }]}>Admin Settings</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>Approve/Reject events and rotate club codes</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: 15,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  headerPanel: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
  },
  card: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardSpacing: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { 
    fontSize: 16, 
    fontWeight: "600" 
  },
  subtitle: { 
    fontSize: 13, 
    marginTop: 4 
  },
});
