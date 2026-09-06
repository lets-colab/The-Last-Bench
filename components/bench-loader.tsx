import { Animated, Easing, Image, Platform, View } from "react-native";
import { useEffect, useRef } from "react";

/**
 * BenchLoader — the brand loading indicator.
 *
 * The bench icon floats and gently sways wherever the app is waiting on data.
 * Use this instead of a bare ActivityIndicator on any full-section or
 * full-screen loading state (small inline spinners inside buttons may stay).
 */
export function BenchLoader({ size = 64 }: { size?: number }) {
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  const translateY = phase.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = phase.interpolate({ inputRange: [0, 1], outputRange: ["-5deg", "5deg"] });

  return (
    <View className="items-center justify-center py-6" accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Animated.View style={{ transform: [{ translateY }, { rotate }] }}>
        <Image
          source={require("@/landing/assets/logo-icon.png")}
          style={{ width: size, height: size * 0.48 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}
