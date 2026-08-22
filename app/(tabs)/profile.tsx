import { ScrollView, Text, View, TouchableOpacity, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { BenchLoader } from "@/components/bench-loader";

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
  const {
    user,
    loading: authLoading,
    error: authError,
    refresh: refreshAuth,
    logout,
  } = useAuth();
  const router = useRouter();

  const studentQuery = trpc.student.getProfile.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: notifications } = trpc.notification.getForUser.useQuery(undefined, { enabled: !!user });
  const { data: applications } = trpc.application.getByStudent.useQuery(undefined, { enabled: !!user });
  const { data: conversations } = trpc.message.getConversations.useQuery(undefined, { enabled: !!user });
  const unreadCount = (notifications ?? []).filter((n: any) => !n.isRead).length;
  const unreadMessages = (conversations ?? []).reduce(
    (total: number, conversation: { unreadCount: number }) => total + conversation.unreadCount,
    0,
  );
  const mentorsAssigned = new Set(
    (applications ?? []).map((application) => application.mentorAssigned).filter(Boolean),
  ).size;
  const isAdmin = (user as any)?.role === "admin";

  if (authLoading) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  if (authError) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-xl font-bold text-foreground text-center">Student services are unavailable</Text>
        <Text className="text-sm text-muted text-center">
          Your workspace could not connect to Last Bench services. Please try again in a moment.
        </Text>
        <TouchableOpacity
          onPress={() => void refreshAuth()}
          className="bg-primary rounded-lg px-5 py-3 active:opacity-80"
        >
          <Text className="text-background font-bold">Retry connection</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  const student = studentQuery.data;

  if (studentQuery.isLoading) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  if (studentQuery.isError) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-xl font-bold text-foreground text-center">Profile unavailable</Text>
        <Text className="text-sm text-muted text-center">
          We could not load your study profile. Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => void studentQuery.refetch()}
          className="bg-primary rounded-lg px-5 py-3 active:opacity-80"
        >
          <Text className="text-background font-bold">Retry</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Sign Out",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          void logout();
        },
        style: "destructive",
      },
    ]);
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
              <Text className="text-xl font-bold text-white">{applications?.length ?? 0}</Text>
            </View>
            <View className="flex-1 bg-white/20 rounded-xl p-3 items-center gap-1">
              <Text className="text-xs text-white/80">Mentors</Text>
              <Text className="text-xl font-bold text-white">{mentorsAssigned}</Text>
            </View>
            <View className="flex-1 bg-white/20 rounded-xl p-3 items-center gap-1">
              <Text className="text-xs text-white/80">Unread</Text>
              <Text className="text-xl font-bold text-white">{unreadMessages}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="px-6 pt-6 pb-12 gap-6">
          {/* Messages Section */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Messages</Text>
            <TouchableOpacity
              onPress={() => router.push("/messages")}
              className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
            >
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold text-foreground">💬 All Messages</Text>
                <Text className="text-sm text-muted">
                  {unreadMessages > 0 ? `${unreadMessages} unread` : "No unread messages"}
                </Text>
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

                <TouchableOpacity
                  onPress={() => router.push("/onboarding")}
                  className="bg-primary rounded-lg py-3 mt-2 active:opacity-80"
                >
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
              <TouchableOpacity
                onPress={() => router.push("/onboarding")}
                className="bg-amber-500 rounded-lg py-2.5 mt-2 active:opacity-80"
              >
                <Text className="text-white font-bold text-center text-sm">Create Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Portal Access */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Quick Access</Text>

            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/notifications"); }}
              className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
            >
              <View className="gap-1">
                <Text className="text-base font-semibold text-foreground">🔔 Notifications</Text>
                <Text className="text-sm text-muted">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</Text>
              </View>
              {unreadCount > 0 && (
                <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                  <Text className="text-white text-xs font-bold">{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/tutor"); }}
              className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
            >
              <View className="gap-1">
                <Text className="text-base font-semibold text-foreground">🤝 Partner Portal</Text>
                <Text className="text-sm text-muted">Refer students and earn commission</Text>
              </View>
              <Text className="text-lg text-muted">→</Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/admin"); }}
                className="bg-surface border border-primary/20 rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
              >
                <View className="gap-1">
                  <Text className="text-base font-semibold text-foreground">⚙️ Admin Dashboard</Text>
                  <Text className="text-sm text-muted">Manage students, applications & tutors</Text>
                </View>
                <Text className="text-lg text-muted">→</Text>
              </TouchableOpacity>
            )}
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
            <Text className="text-xs text-muted">last bench v1.0.0</Text>
            <Text className="text-xs text-muted">Beyond marks. Beyond limits.</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
