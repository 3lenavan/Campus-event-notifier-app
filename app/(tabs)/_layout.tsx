import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useAuthUser } from "../../src/hooks/useAuthUser";
import { useAppTheme, LightThemeColors } from "../../src/ThemeContext";

export default function Layout() {
  const { profile } = useAuthUser();
  const hasMemberships = profile?.memberships && profile.memberships.length > 0;
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtitle,
        tabBarStyle: {
          backgroundColor: isDark ? colors.card : "#FFF4BF",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          shadowColor: "#4A2D00",
          shadowOpacity: isDark ? 0.35 : 0.1,
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
          title: "Hive",
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
          title: "Explore",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "search" : "search-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create-event"
        options={{
          title: "Buzz",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "add-circle" : "add-circle-outline"} 
              size={size} 
              color={color} 
            />
          ),
          href: hasMemberships ? "/create-event" : null, // Hide tab if no memberships
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
      <Tabs.Screen
        name="index" // this is your redirect file
        options={{
          href: null, //  hides it from the tab bar
        }}
      />
    </Tabs>
  );
}
