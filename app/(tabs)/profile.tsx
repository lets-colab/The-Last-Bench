import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Switch, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import * as Haptics from "expo-haptics";

/**
 * Profile Screen - Premium User Hub
 * 
 * Design Excellence:
 * - Beautiful gradient header
 * - Integrated messaging access
 * - Elegant settings management
 * - Smooth interactions
 */
export default function ProfileScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { mutate: logout } = trpc.auth.logout.useMutation();

  const studentQuery = trpc.student.getProfile.useQuery(undefined, {
    enabled: !!user,
  });

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  const student = studentQuery.data;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Sign Out",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          logout();
        },
        style: "destructive",
      },
    ]);
  };

  const handleToggle = (toggle: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle();
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Premium Header */}
        <View className="bg-gradient-to-b from-primary to-blue-600 px-6 pt-8 pb-12">
          {/* Avatar */}
          <View className="items-center gap-4 mb-6">
            <View className="w-24 h-24 rounded-full bg-white/30 items-center justify-center border-2 border-white/50">
              <Text className="text-5xl">👤</Text>
            </View>
            <View className="items-center gap-1">
              <Text className="text-2xl font-bold text-white">{user.name || "Student"}</Text>
              <Text className="text-sm text-white/80">{user.email}</Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white/20 rounded-xl p-3 items-center gap-1">
              <Text className="text-xs text-white/80">Applications</Text>
              <Text className="text-xl font-bold text-white">5</Text>
            </View>
            <View className="flex-1 bg-white/20 rounded-xl p-3 items-center gap-1">
              <Text className="text-xs text-white/80">Mentors</Text>
              <Text className="text-xl font-bold text-white">2</Text>
            </View>
            <View className="flex-1 bg-white/20 rounded-xl p-3 items-center gap-1">
              <Text className="text-xs text-white/80">Messages</Text>
              <Text className="text-xl font-bold text-white">3</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="px-6 pt-6 pb-12 gap-6">
          {/* Messages Section */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Messages</Text>
            <TouchableOpacity className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80">
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold text-foreground">💬 All Messages</Text>
                <Text className="text-sm text-muted">3 unread from mentors</Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                <Text className="text-white font-bold text-sm">→</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Study Profile */}
          {student ? (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">Study Profile</Text>
              <View className="bg-surface border border-border rounded-xl p-5 gap-4">
                <View className="gap-2">
                  <Text className="text-xs text-muted font-semibold">CLASS</Text>
                  <Text className="text-lg font-bold text-foreground">{student.class || "Not set"}</Text>
                </View>

                {student.gpa && (
                  <View className="gap-2 pt-4 border-t border-border">
                    <Text className="text-xs text-muted font-semibold">GPA</Text>
                    <Text className="text-lg font-bold text-foreground">{student.gpa}</Text>
                  </View>
                )}

                {student.fieldOfInterest && (
                  <View className="gap-2 pt-4 border-t border-border">
                    <Text className="text-xs text-muted font-semibold">FIELD OF INTEREST</Text>
                    <Text className="text-lg font-bold text-foreground">{student.fieldOfInterest}</Text>
                  </View>
                )}

                {student.destinationPreference && (
                  <View className="gap-2 pt-4 border-t border-border">
                    <Text className="text-xs text-muted font-semibold">DESTINATION</Text>
                    <Text className="text-lg font-bold text-foreground">{student.destinationPreference}</Text>
                  </View>
                )}

                <TouchableOpacity className="bg-primary rounded-lg py-3 mt-2 active:opacity-80">
                  <Text className="text-white font-bold text-center">Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 gap-3">
              <Text className="text-base font-bold text-amber-900 dark:text-amber-100">Complete Your Profile</Text>
              <Text className="text-sm text-amber-800 dark:text-amber-200">
                Add your academic info and study preferences to get personalized guidance.
              </Text>
              <TouchableOpacity className="bg-amber-500 rounded-lg py-2.5 mt-2 active:opacity-80">
                <Text className="text-white font-bold text-center text-sm">Create Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Preferences */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Preferences</Text>

            <View className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
              <View className="gap-1">
                <Text className="text-base font-semibold text-foreground">🔔 Notifications</Text>
                <Text className="text-sm text-muted">Receive updates and messages</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={() => handleToggle(() => setNotificationsEnabled(!notificationsEnabled))}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </View>

          {/* Support & Legal */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Support & Legal</Text>

            <TouchableOpacity className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80">
              <View className="gap-1">
                <Text className="text-base font-semibold text-foreground">❓ Help & Support</Text>
                <Text className="text-sm text-muted">Get help with your account</Text>
              </View>
              <Text className="text-lg text-muted">→</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80">
              <View className="gap-1">
                <Text className="text-base font-semibold text-foreground">🔒 Privacy Policy</Text>
                <Text className="text-sm text-muted">How we protect your data</Text>
              </View>
              <Text className="text-lg text-muted">→</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80">
              <View className="gap-1">
                <Text className="text-base font-semibold text-foreground">📋 Terms of Service</Text>
                <Text className="text-sm text-muted">Our terms and conditions</Text>
              </View>
              <Text className="text-lg text-muted">→</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 items-center active:opacity-80"
          >
            <Text className="text-red-600 dark:text-red-400 font-bold">Sign Out</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View className="items-center gap-1 pt-4 border-t border-border">
            <Text className="text-xs text-muted">The Last Bench v1.0.0</Text>
            <Text className="text-xs text-muted">For Those Who Last, To Create a Benchmark</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
