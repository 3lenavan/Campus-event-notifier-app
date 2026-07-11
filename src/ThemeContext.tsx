import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark";

export const LightThemeColors = {
  primary: "#D97706",
  secondary: "#FBBF24",
  accent: "#111827",
  honey: "#FDE68A",
  nectar: "#FFF7D6",
  background: "#FFF8E1",
  card: "#FFFFFF",
  text: "#1F1300",
  border: "#F2C94C",
  safeArea: "#FFF8E1",
  subtitle: "#7A5A18",
  inputBackground: "#FFFCF2",
  placeholderText: "#A9802B",
};

export const DarkThemeColors = {
  primary: "#FBBF24",
  secondary: "#D97706",
  accent: "#FFF7D6",
  honey: "#92400E",
  nectar: "#261A05",
  background: "#120D05",
  card: "#211804",
  text: "#FFF7D6",
  border: "#5F420D",
  safeArea: "#120D05",
  subtitle: "#D6B25E",
  inputBackground: "#2B2109",
  placeholderText: "#A9802B",
};

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: typeof LightThemeColors;
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
