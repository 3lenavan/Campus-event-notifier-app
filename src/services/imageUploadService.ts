import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { supabase } from "../../data/supabaseClient";
import { showAlert } from "../lib/alert";

/**
 * Request permission
 */
export const requestImagePermissions = async (): Promise<boolean> => {
  if (Platform.OS !== "web") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission Required",
        "Sorry, we need camera roll permissions to upload images."
      );
      return false;
    }
  }
  return true;
};

/**
 * Pick image (uri + base64)
 */
export const pickImage = async (): Promise<{ uri: string; base64: string } | null> => {
  const hasPermission = await requestImagePermissions();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return null;

    const asset = result.assets[0];

    return {
      uri: asset.uri,
      base64: asset.base64 || "",
    };
  } catch (err) {
    console.error("Error picking image:", err);
    showAlert("Error", "Failed to pick image.");
    return null;
  }
};

/**
 * Upload image to Supabase Storage
 * Works on web, iOS, and Android
 */
export const uploadEventImage = async (
  uri: string,
  base64: string,
  userId: string,
  eventId?: string
): Promise<string | null> => {
  try {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);

    const filename = eventId
      ? `event-${eventId}-${timestamp}.jpg`
      : `event-${timestamp}-${rand}.jpg`;

    const filePath = `${userId}/${filename}`;

    let fileData: Blob | Uint8Array | File;

    if (Platform.OS === 'web') {
      // On web, convert base64 to Blob
      if (base64) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        fileData = new Blob([byteArray], { type: 'image/jpeg' });
      } else {
        // Fallback: fetch from URI
        const response = await fetch(uri);
        fileData = await response.blob();
      }
    } else {
      // On mobile (iOS/Android), convert base64 to Uint8Array
      if (base64) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        fileData = new Uint8Array(byteNumbers);
      } else {
        // Fallback: fetch from URI and convert to Uint8Array
        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        fileData = new Uint8Array(arrayBuffer);
      }
    }

    const { error } = await supabase.storage
      .from("event-images")
      .upload(filePath, fileData, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    // Get public URL
    const { data } = supabase.storage
      .from("event-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err: any) {
    console.error("Upload error:", err);
    showAlert("Upload Error", err.message || "Failed to upload image.");
    return null;
  }
};

/**
 * Delete image
 */
export const deleteEventImage = async (imageUrl: string): Promise<void> => {
  try {
    if (!imageUrl.includes("event-images")) return;

    // Extract actual path: event-images/userId/file.jpg
    const urlParts = imageUrl.split("/event-images/");
    if (urlParts.length < 2) return;
    
    const filePath = `event-images/${urlParts[1]}`;

    await supabase.storage.from("event-images").remove([filePath]);
  } catch (err) {
    console.error("Error deleting image:", err);
  }
};
