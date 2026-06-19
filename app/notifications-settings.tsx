import { ScrollView, Text, View, TouchableOpacity, Switch, Alert } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationPreference {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: string;
}

/**
 * Push Notifications Settings - Premium Notification Management
 * 
 * Features:
 * - Granular notification preferences
 * - Do-not-disturb scheduling
 * - Notification history
 * - Test notifications
 */
export default function NotificationsSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: "messages",
      title: "Messages",
      description: "New messages from mentors and peers",
      enabled: true,
      icon: "💬",
    },
    {
      id: "applications",
      title: "Application Updates",
      description: "Status changes on your applications",
      enabled: true,
      icon: "📋",
    },
    {
      id: "deadlines",
      title: "Deadlines",
      description: "Reminders for upcoming deadlines",
      enabled: true,
      icon: "⏰",
    },
    {
      id: "recommendations",
      title: "AI Recommendations",
      description: "Personalized university suggestions",
      enabled: true,
      icon: "🤖",
    },
    {
      id: "community",
      title: "Community Activity",
      description: "Updates from your cohort",
      enabled: false,
      icon: "👥",
    },
    {
      id: "marketing",
      title: "Tips & Updates",
      description: "Study tips and platform updates",
      enabled: false,
      icon: "💡",
    },
  ]);

  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState("22:00");
  const [dndEnd, setDndEnd] = useState("08:00");

  const handleTogglePreference = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreferences(
      preferences.map((pref) =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const handleToggleDnd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDndEnabled(!dndEnabled);
  };

  const handleTestNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body: "This is a test notification from The Last Bench",
          sound: "default",
        },
        trigger: null,
      });
      Alert.alert("Success", "Test notification sent!");
    } catch (error) {
      Alert.alert("Error", "Failed to send test notification");
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Clear",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "All notifications cleared");
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-6 pb-4 border-b border-border">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2 mb-4">
            <Text className="text-2xl">←</Text>
            <Text className="text-sm font-semibold text-primary">Back</Text>
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-foreground">Notifications</Text>
          <Text className="text-sm text-muted mt-1">Manage your notification preferences</Text>
        </View>

        {/* Main Toggle */}
        <View className="px-6 pt-6 pb-6 gap-4 border-b border-border">
          <View className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-base font-semibold text-foreground">🔔 All Notifications</Text>
              <Text className="text-sm text-muted">Enable/disable all notifications</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* Notification Preferences */}
        <View className="px-6 pt-6 pb-6 gap-3 border-b border-border">
          <Text className="text-lg font-bold text-foreground mb-2">Notification Types</Text>

          {preferences.map((pref) => (
            <View
              key={pref.id}
              className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg">{pref.icon}</Text>
                  <Text className="text-base font-semibold text-foreground">{pref.title}</Text>
                </View>
                <Text className="text-sm text-muted">{pref.description}</Text>
              </View>
              <Switch
                value={pref.enabled}
                onValueChange={() => handleTogglePreference(pref.id)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          ))}
        </View>

        {/* Do Not Disturb */}
        <View className="px-6 pt-6 pb-6 gap-4 border-b border-border">
          <Text className="text-lg font-bold text-foreground">Do Not Disturb</Text>

          <View className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-base font-semibold text-foreground">🌙 Quiet Hours</Text>
              <Text className="text-sm text-muted">Pause notifications during sleep</Text>
            </View>
            <Switch
              value={dndEnabled}
              onValueChange={handleToggleDnd}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {dndEnabled && (
            <View className="bg-primary/10 border border-primary/20 rounded-xl p-4 gap-3">
              <View className="flex-row gap-3">
                <View className="flex-1 gap-2">
                  <Text className="text-xs text-muted font-semibold">Start Time</Text>
                  <TouchableOpacity className="bg-surface border border-border rounded-lg px-4 py-3">
                    <Text className="text-foreground font-semibold text-center">{dndStart}</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-1 gap-2">
                  <Text className="text-xs text-muted font-semibold">End Time</Text>
                  <TouchableOpacity className="bg-surface border border-border rounded-lg px-4 py-3">
                    <Text className="text-foreground font-semibold text-center">{dndEnd}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-xs text-muted">
                Notifications will be silenced from {dndStart} to {dndEnd}
              </Text>
            </View>
          )}
        </View>

        {/* Sound & Vibration */}
        <View className="px-6 pt-6 pb-6 gap-3 border-b border-border">
          <Text className="text-lg font-bold text-foreground mb-1">Sound & Vibration</Text>

          <View className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-base font-semibold text-foreground">🔊 Sound</Text>
              <Text className="text-sm text-muted">Play sound for notifications</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-base font-semibold text-foreground">📳 Vibration</Text>
              <Text className="text-sm text-muted">Vibrate for notifications</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* Testing & Management */}
        <View className="px-6 pt-6 pb-12 gap-3">
          <Text className="text-lg font-bold text-foreground mb-1">Testing & Management</Text>

          <TouchableOpacity
            onPress={handleTestNotification}
            className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
          >
            <View className="gap-1">
              <Text className="text-base font-semibold text-foreground">📤 Send Test Notification</Text>
              <Text className="text-sm text-muted">Verify notifications are working</Text>
            </View>
            <Text className="text-lg text-primary">→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClearAll}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
          >
            <View className="gap-1">
              <Text className="text-base font-semibold text-red-600 dark:text-red-400">
                🗑️ Clear All Notifications
              </Text>
              <Text className="text-sm text-red-600/70 dark:text-red-400/70">Remove all notification history</Text>
            </View>
            <Text className="text-lg text-red-600 dark:text-red-400">→</Text>
          </TouchableOpacity>

          {/* Info Box */}
          <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 gap-2 mt-4">
            <Text className="text-sm font-semibold text-blue-900 dark:text-blue-100">💡 Tip</Text>
            <Text className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              Keep important notifications like application updates and messages enabled to stay on top of your
              study-abroad journey.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
