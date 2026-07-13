import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buzzup } from "./theme/buzzup-theme";

type ThemeMode = "light" | "dark";

export const LightThemeColors = {
  primary: buzzup.colors.primary,
  background: buzzup.colors.background,
  card: buzzup.colors.surface,
  text: buzzup.colors.cocoa,
  border: buzzup.colors.border,
  safeArea: buzzup.colors.background,
  subtitle: buzzup.colors.cocoaSoft,
  inputBackground: buzzup.colors.surface,
  placeholderText: "#9A8879",
};

export const DarkThemeColors = {
  primary: "#60a5fa",
  background: "#0b0c0e",
  card: "#111214",
  text: "#e5e7eb",
  border: "#1f2937",
  safeArea: "#0b0c0e",
  subtitle: "#9aa0a6",
  inputBackground: "#0f1113",
  placeholderText: "#6b7280",
};

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: Record<keyof typeof LightThemeColors, string>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  colors: LightThemeColors,
  isDark: false,
});

export function ThemeProviderCustom({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem("app-theme").then((stored) => {
      if (stored === "dark" || stored === "light") setTheme(stored);
    });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newMode = prev === "light" ? "dark" : "light";
      AsyncStorage.setItem("app-theme", newMode);
      return newMode;
    });
  };

  const colors = theme === "dark" ? DarkThemeColors : LightThemeColors;
  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  // Ensure we always return valid values, even if context is somehow undefined
  if (!context || !context.colors) {
    return {
      theme: "light" as ThemeMode,
      toggleTheme: () => {},
      colors: LightThemeColors,
      isDark: false,
    };
  }
  return context;
}
