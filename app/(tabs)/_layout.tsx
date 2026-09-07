import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 62 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          paddingTop: 7,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          minHeight: 50,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          lineHeight: 12,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: "Applications",
          tabBarLabel: "Apply",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="universities"
        options={{
          title: "Universities",
          tabBarLabel: "Explore",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="graduationcap.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-guidance"
        options={{
          title: "AI Guides",
          tabBarLabel: "Guides",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bubble.left.and.bubble.right.fill" color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      {/* Hidden from tab bar — accessible via deep links */}
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
    </Tabs>
  );
}
