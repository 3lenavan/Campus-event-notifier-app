import React from "react";
import { StyleSheet, View } from "react-native";
import { LightThemeColors, useAppTheme } from "../ThemeContext";

type HoneycombBackgroundProps = {
  variant?: "soft" | "dense";
};

const CELL_POSITIONS = [
  { top: 8, left: -18 },
  { top: 28, left: 34 },
  { top: 68, left: -4 },
  { top: 112, left: 48 },
  { top: 154, left: 4 },
  { top: 196, left: 66 },
  { top: 236, left: 20 },
  { top: 18, right: 20 },
  { top: 58, right: -18 },
  { top: 102, right: 42 },
  { top: 146, right: 0 },
  { top: 190, right: 54 },
  { top: 232, right: 8 },
];

export function HoneycombBackground({ variant = "soft" }: HoneycombBackgroundProps) {
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;
  const opacity = variant === "dense" ? 0.22 : 0.14;
  const cellColor = isDark ? colors.secondary : colors.primary;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {CELL_POSITIONS.map((position, index) => (
        <View
          key={`${position.top}-${index}`}
          style={[
            styles.cell,
            position,
            {
              borderColor: cellColor,
              backgroundColor: index % 3 === 0 ? colors.honey : "transparent",
              opacity,
            },
          ]}
        />
      ))}
      <View
        style={[
          styles.waxGlow,
          {
            backgroundColor: isDark ? "rgba(251, 191, 36, 0.12)" : "rgba(251, 191, 36, 0.24)",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: "absolute",
    width: 48,
    height: 42,
    borderWidth: 2,
    borderRadius: 8,
    transform: [{ rotate: "30deg" }, { skewX: "-18deg" }],
  },
  waxGlow: {
    position: "absolute",
    top: -90,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
});
