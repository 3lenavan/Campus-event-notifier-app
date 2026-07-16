import { auth } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
} from "firebase/auth";
import { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";
import { showAlert } from "../src/lib/alert";

export default function UpdateEmail() {
  const user = auth.currentUser;
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const handleUpdateEmail = async () => {
    if (!user) return;

    if (!currentPassword || !newEmail || !confirmEmail) {
      showAlert("Error", "Please fill in all fields.");
      return;
    }

    if (newEmail !== confirmEmail) {
      showAlert("Error", "Emails do not match.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      await updateEmail(user, newEmail.trim());

      showAlert("Success", "Email updated!", [
        { text: "OK", onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/settings');
          }
        }},
      ]);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to update email.");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Update Email",
          headerTintColor: "#fff",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#000" },
        }}
      />

      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* HEADER WITH SPACING */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Update Email</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>Change your email address</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? colors.border : "#e0ebff" }]}>
            <Ionicons name="mail-outline" size={24} color={colors.primary} />
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Current Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            value={user?.email || ""}
            editable={false}
            placeholderTextColor={colors.placeholderText}
          />

          <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter your current password"
            placeholderTextColor={colors.placeholderText}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Text style={[styles.label, { color: colors.text }]}>New Email Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter new email"
            placeholderTextColor={colors.placeholderText}
            autoCapitalize="none"
            keyboardType="email-address"
            value={newEmail}
            onChangeText={setNewEmail}
          />

          <Text style={[styles.label, { color: colors.text }]}>Confirm New Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Confirm new email"
            placeholderTextColor={colors.placeholderText}
            autoCapitalize="none"
            keyboardType="email-address"
            value={confirmEmail}
            onChangeText={setConfirmEmail}
          />

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleUpdateEmail}>
            <Text style={styles.buttonText}>Update Email Address</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.note, { color: colors.subtitle }]}>
          <Text style={{ fontWeight: "700" }}>Note:</Text> You may need to
          verify your current email before updating.
        </Text>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  /* 🔥 NEW header padding wrapper */
  headerContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  card: {
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    marginBottom: 20,
  },

  iconCircle: {
    alignSelf: "center",
    padding: 14,
    borderRadius: 50,
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },

  button: {
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 18,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  note: {
    paddingHorizontal: 20,
    marginTop: 8,
    fontSize: 13,
  },
});
