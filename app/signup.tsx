import { router } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HoneycombBackground } from "../src/components";
import { auth } from "../src/lib/firebase";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";

export default function Signup() {
  // Store form inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  const isValidEmail = (value: string) => /.+@.+\..+/.test(value);

  const signUp = async () => {
    try {
      const emailTrimmed = email.trim();
      const passwordTrimmed = password.trim();

      if (!firstName.trim() || !lastName.trim()) {
        alert("Please enter both first and last name");
        return;
      }

      if (!isValidEmail(emailTrimmed)) {
        alert("Please enter a valid email address");
        return;
      }
      if (passwordTrimmed.length < 6) {
        alert("Password must be at least 6 characters long");
        return;
      }

      // Create user with email & password
      const userCredential = await createUserWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);

      // ✅ Save full name into displayName
      await updateProfile(userCredential.user, {
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });

      console.log("User registered:", userCredential.user);
      alert("Account created successfully!");

      // Redirect to home (inside tabs)
      router.replace("/(tabs)/home");
    } catch (error: any) {
      console.error(error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Account creation failed';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please sign in instead.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters long.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = error.message || 'Account creation failed';
        }
      }
      
      alert(errorMessage);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={styles.container}>
        <HoneycombBackground variant="dense" />
        <View style={[styles.card, styles.glassCard, { backgroundColor: isDark ? colors.card : 'rgba(255, 252, 242, 0.94)', borderColor: colors.border }]}> 
          <View style={[styles.mark, { backgroundColor: colors.accent }]}>
            <Ionicons name="person-add-outline" size={26} color={colors.secondary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Join the Hive</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>Create your BuzzUp account.</Text>

          {/* First Name Input */}
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            placeholder="First Name"
            placeholderTextColor={colors.placeholderText}
            value={firstName}
            onChangeText={setFirstName}
          />

          {/* Last Name Input */}
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            placeholder="Last Name"
            placeholderTextColor={colors.placeholderText}
            value={lastName}
            onChangeText={setLastName}
          />

          {/* Email Input */}
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            placeholder="Email"
            placeholderTextColor={colors.placeholderText}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password Input */}
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
            placeholder="Password"
            placeholderTextColor={colors.placeholderText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Submit button */}
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={signUp}>
            <Text style={styles.primaryBtnText}>Sign Up</Text>
          </TouchableOpacity>

          {/* Back to login */}
          <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: isDark ? colors.border : colors.honey, borderColor: 'transparent' }]} onPress={() => router.replace("/")}>
            <Text style={[styles.secondaryBtnText, { color: isDark ? colors.text : colors.accent }]}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1.5,
    shadowColor: '#4A2D00',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    fontSize: 16,
  },
  primaryBtn: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#4A2D00",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D6E4FF",
  },
  secondaryBtnText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
