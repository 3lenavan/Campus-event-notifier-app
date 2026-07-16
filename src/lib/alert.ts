import { Alert, AlertButton, AlertOptions, Platform } from "react-native";

/**
 * Cross-platform replacement for Alert.alert. React Native Web ships Alert as a
 * no-op, so anything reported through it (login errors, verification results,
 * RSVP failures) is silently invisible in the browser. On web this falls back to
 * window.alert/window.confirm; on native it defers to Alert.alert unchanged.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons, options);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Multi-button prompts map to confirm(): OK triggers the first non-cancel
  // button, dismiss triggers the cancel-style one.
  const cancelButton = buttons.find((button) => button.style === "cancel") || buttons[buttons.length - 1];
  const confirmButton = buttons.find((button) => button !== cancelButton) || buttons[0];

  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton.onPress?.();
  }
}
