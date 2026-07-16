import { auth } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
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

export default function UpdatePassword() {
  const user = auth.currentUser;
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!user || !user.email) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert("Error", "Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Error", "Passwords do not match.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      showAlert("Password Updated!", "Your password has been updated.", [
        { text: "OK", onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/settings');
          }
        }},
      ]);
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to update password.");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Update Password",
          headerTintColor: "#fff",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#000" },
        }}
      />

      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* Matching header spacing */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Update Password</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>Change your account password</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? colors.border : "#f3e8ff" }]}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Enter current password"
              placeholderTextColor={colors.placeholderText}
              secureTextEntry={!showPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.subtitle}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Enter new password"
              placeholderTextColor={colors.placeholderText}
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.subtitle}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
          <View style={styles.passwordField}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.placeholderText}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.subtitle}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleUpdatePassword}>
            <Text style={styles.buttonText}>Update Password</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.note, { color: colors.subtitle }]}>
          <Text style={{ fontWeight: "700" }}>Note:</Text> Password must be at
          least 6 characters and different from your current password.
        </Text>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  /* same as update email */
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

  passwordField: {
    marginTop: 4,
    position: "relative",
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingRight: 40,
  },

  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 14,
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
