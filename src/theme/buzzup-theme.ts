export const buzzup = {
  colors: {
    primary: "#F7C928",
    primaryPressed: "#E8B816",
    cocoa: "#3B2618",
    cocoaSoft: "#6D5647",
    background: "#FFF9E8",
    surface: "#FFFEF9",
    surfaceMuted: "#FFF4D1",
    border: "#E9D9B8",
    green: "#5B922F",
    blue: "#356FD6",
    coral: "#EF765F",
    red: "#E9574F",
    white: "#FFFFFF",
    shadow: "rgba(59, 38, 24, 0.10)",
  },
  radius: { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  type: {
    display: { fontSize: 34, lineHeight: 40, fontWeight: "800" as const, letterSpacing: -1 },
    h1: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const, letterSpacing: -0.6 },
    h2: { fontSize: 22, lineHeight: 28, fontWeight: "800" as const, letterSpacing: -0.3 },
    title: { fontSize: 18, lineHeight: 23, fontWeight: "800" as const },
    body: { fontSize: 15, lineHeight: 22, fontWeight: "500" as const },
    meta: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const },
  },
} as const;

export type BuzzUpColors = typeof buzzup.colors;
