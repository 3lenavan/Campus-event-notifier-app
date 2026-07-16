import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { checkInAttendee } from "../src/services/checkinService";
import { getEventById } from "../src/services/eventsService";
import { useAuthUser } from "../src/hooks/useAuthUser";
import { useAppTheme, LightThemeColors } from "../src/ThemeContext";
import type { Event } from "../src/types";
import { showAlert } from "../src/lib/alert";

export default function CheckinScanner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const { user } = useAuthUser();

  const [permission, requestPermission] = useCameraPermissions();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      const loaded = await getEventById(id);
      setEvent(loaded);
      setLoading(false);
    };
    loadEvent();
  }, [id]);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || processing || !event || !user?.uid) return;
    setScanned(true);
    setProcessing(true);

    const result = await checkInAttendee(event, user.uid, data);

    setProcessing(false);
    showAlert(result.success ? "Checked In" : "Check-in Failed", result.message, [
      {
        text: "OK",
        onPress: () => {
          if (result.success) {
            router.back();
          } else {
            setScanned(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Event not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="camera-outline" size={48} color={colors.subtitle} />
        <Text style={[styles.permissionText, { color: colors.text }]}>
          We need camera access to scan the event's check-in code.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      <View style={styles.overlay}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.frame} />
        <Text style={styles.instructions}>
          {processing ? "Checking you in…" : `Point your camera at the check-in code for ${event.title}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    alignSelf: "center",
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 16,
  },
  instructions: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
