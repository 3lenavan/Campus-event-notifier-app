import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  Image,
  Platform,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { buzzup } from "../theme/buzzup-theme";

const mascot = require("../../assets/images/buzzup-mascot.png");

export function BuzzUpLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }} accessibilityLabel="BuzzUp">
      <Text style={{ color: buzzup.colors.cocoa, fontSize: compact ? 25 : 32, fontWeight: "900", letterSpacing: -1.5 }}>Buzz</Text>
      <Text style={{ color: buzzup.colors.primary, fontSize: compact ? 25 : 32, fontWeight: "900", letterSpacing: -1.5 }}>Up</Text>
      <Text style={{ color: buzzup.colors.primary, fontSize: compact ? 13 : 17 }}>✦</Text>
    </View>
  );
}

export function BuzzUpBrandLogo({ compact = false }: { compact?: boolean }) {
  const fontSize = compact ? 27 : 38;
  return (
    <View accessibilityLabel="BuzzUp" style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={{ color: buzzup.colors.cocoa, fontSize, lineHeight: fontSize + 5, fontWeight: "900", letterSpacing: -1.8 }}>Buzz</Text>
      <Text style={{ color: buzzup.colors.primary, fontSize, lineHeight: fontSize + 5, fontWeight: "900", letterSpacing: -1.8 }}>Up</Text>
      <Ionicons name="sparkles" color={buzzup.colors.primary} size={compact ? 14 : 18} style={{ marginLeft: 4 }} />
    </View>
  );
}

export function BeeMascot({ size = 120, style, animated = false }: { size?: number; style?: StyleProp<ViewStyle>; animated?: boolean }) {
  const float = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!animated || reduceMotion) {
      float.stopAnimation();
      float.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -7, duration: 1800, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: Platform.OS !== "web" }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, float, reduceMotion]);

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ translateY: float }] }, style]}>
      <Image source={mascot} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="BuzzUp bee mascot holding a megaphone" />
    </Animated.View>
  );
}

export function NotificationButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Notifications, unread items"
      onPress={onPress || (() => router.push("/(tabs)/profile"))}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? buzzup.colors.surfaceMuted : buzzup.colors.surface,
        borderWidth: 1,
        borderColor: buzzup.colors.border,
        boxShadow: `0 3px 10px ${buzzup.colors.shadow}`,
      })}
    >
      <Ionicons name="notifications" size={21} color={buzzup.colors.cocoa} />
      <View style={{ position: "absolute", right: 5, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: buzzup.colors.red, borderWidth: 2, borderColor: buzzup.colors.surface }} />
    </Pressable>
  );
}

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={{ minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, borderRadius: buzzup.radius.pill, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border, boxShadow: `0 4px 12px ${buzzup.colors.shadow}` }}>
      <Ionicons name="search" size={20} color={buzzup.colors.cocoaSoft} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E7C6D"
        returnKeyType="search"
        style={{ flex: 1, color: buzzup.colors.cocoa, fontSize: 15, outlineStyle: "none" } as any}
      />
      {!!value && (
        <Pressable accessibilityLabel="Clear search" onPress={() => onChangeText("")} hitSlop={10}>
          <Ionicons name="close-circle" size={20} color={buzzup.colors.cocoaSoft} />
        </Pressable>
      )}
    </View>
  );
}

export function FilterPills({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {options.map((option) => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option)}
            style={({ pressed }) => ({ paddingHorizontal: 19, paddingVertical: 9, borderRadius: buzzup.radius.pill, backgroundColor: active ? buzzup.colors.primary : pressed ? buzzup.colors.surfaceMuted : buzzup.colors.surface, borderWidth: 1, borderColor: active ? buzzup.colors.primaryPressed : buzzup.colors.border })}
          >
            <Text style={{ color: buzzup.colors.cocoa, fontWeight: active ? "800" : "600", fontSize: 13 }}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function AvatarGroup({ count = 0 }: { count?: number }) {
  const colors = ["#E4A38E", "#77A8C9", "#9E7EBC", "#79A873"];
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }} accessibilityLabel={`${count} attendees`}>
      {colors.map((color, index) => (
        <View key={color} style={{ width: 28, height: 28, borderRadius: 14, marginLeft: index ? -7 : 0, backgroundColor: color, borderWidth: 2, borderColor: buzzup.colors.surface, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="person" size={14} color={buzzup.colors.white} />
        </View>
      ))}
      <View style={{ height: 28, paddingHorizontal: 8, marginLeft: -4, borderRadius: 14, backgroundColor: buzzup.colors.surfaceMuted, borderWidth: 1, borderColor: buzzup.colors.border, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: buzzup.colors.cocoa, fontSize: 11, fontWeight: "700" }}>+{Math.max(0, count - 4)}</Text>
      </View>
    </View>
  );
}

const navItems = [
  ["Home", "home", "/(tabs)/home"],
  ["Discover", "compass", "/(tabs)/discover"],
  ["Create Event", "add-circle", "/(tabs)/create-event"],
  ["Saved", "bookmark", "/(tabs)/saved"],
  ["My Clubs", "people", "/(tabs)/discover"],
  ["Profile", "person", "/(tabs)/profile"],
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();
  return (
    <View style={{ width: 250, minHeight: "100%", padding: 24, backgroundColor: buzzup.colors.surface, borderRightWidth: 1, borderRightColor: buzzup.colors.border, justifyContent: "space-between" }}>
      <View style={{ gap: 28 }}>
        <BuzzUpBrandLogo />
        <View style={{ gap: 8 }} accessibilityLabel="Desktop navigation">
          {navItems.map(([label, icon, href]) => {
            const active = pathname.includes(href.split("/").pop() || "home");
            return (
              <Pressable key={label} onPress={() => router.push(href as any)} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: active ? buzzup.colors.primary : pressed ? buzzup.colors.surfaceMuted : "transparent" })}>
                <Ionicons name={icon as any} size={22} color={buzzup.colors.cocoa} />
                <Text style={{ color: buzzup.colors.cocoa, fontSize: 15, fontWeight: active ? "800" : "600" }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ padding: 16, gap: 8, borderRadius: 18, backgroundColor: buzzup.colors.surface, borderWidth: 1, borderColor: buzzup.colors.border, boxShadow: `0 5px 16px ${buzzup.colors.shadow}` }}>
        <Text style={{ fontSize: 24 }}>🎉</Text>
        <Text style={{ ...buzzup.type.title, color: buzzup.colors.cocoa, fontSize: 15 }}>Hosting an event?</Text>
        <Text style={{ ...buzzup.type.meta, color: buzzup.colors.cocoaSoft }}>Create and share events with your campus.</Text>
        <Pressable onPress={() => router.push("/(tabs)/create-event")} style={{ minHeight: 42, borderRadius: 12, backgroundColor: buzzup.colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: buzzup.colors.cocoa, fontWeight: "800" }}>Create Event</Text>
        </Pressable>
      </View>
    </View>
  );
}
