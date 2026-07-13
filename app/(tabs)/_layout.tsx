import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { useAppTheme, LightThemeColors } from "../../src/ThemeContext";

export default function Layout() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#3B2618",
        tabBarStyle: {
          display: desktop ? "none" : "flex",
          backgroundColor: colors.card,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "compass" : "compass-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create-event"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "add-circle" : "add-circle-outline"} 
              size={size} 
              color={color} 
            />
          ),
          href: "/create-event",
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "bookmark" : "bookmark-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
