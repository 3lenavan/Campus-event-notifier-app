import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type BuzzUpMascotProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

const mascotSource = require("../../assets/images/buzzup-mascot.png");

export function BuzzUpMascot({
  size = 140,
  style,
  imageStyle,
  accessibilityLabel = "BuzzUp bee mascot holding a megaphone",
}: BuzzUpMascotProps) {
  return (
    <View style={[styles.frame, { width: size, height: size }, style]}>
      <Image
        accessibilityLabel={accessibilityLabel}
        resizeMode="contain"
        source={mascotSource}
        style={[styles.image, imageStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexShrink: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
