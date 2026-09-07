import { Alert, Image, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { BenchLoader } from "@/components/bench-loader";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { trpc } from "@/lib/trpc";

type ProfileLinkProps = {
  title: string;
  body: string;
  icon: IconSymbolName;
  onPress: () => void;
  badge?: number;
};

function ProfileLink({ title, body, icon, onPress, badge }: ProfileLinkProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      activeOpacity={0.82}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 border-t border-border bg-surface p-4 first:border-t-0"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <IconSymbol name={icon} size={21} color={colors.primary} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        <Text className="text-sm leading-5 text-muted">{body}</Text>
      </View>
      {badge && badge > 0 ? (
        <View className="min-w-6 h-6 items-center justify-center rounded-full bg-primary px-1.5">
          <Text className="text-xs font-bold text-background">{badge}</Text>
        </View>
      ) : (
        <IconSymbol name="arrow.right" size={20} color={colors.muted} />
      )}
    </TouchableOpacity>
  );
}

function hapticPress(action: () => void) {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  action();
}

export default function ProfileScreen() {
  const {
    user,
    loading: authLoading,
    error: authError,
    refresh: refreshAuth,
    logout,
  } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const { colorScheme, setColorScheme } = useThemeContext();

  const studentQuery = trpc.student.getProfile.useQuery(undefined, { enabled: !!user });
  const { data: notifications } = trpc.notification.getForUser.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: applications } = trpc.application.getByStudent.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: conversations } = trpc.message.getConversations.useQuery(undefined, {
    enabled: !!user,
  });

  const unreadCount = (notifications ?? []).filter((item) => !item.isRead).length;
  const unreadMessages = (conversations ?? []).reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );
  const mentorsAssigned = new Set(
    (applications ?? []).map((application) => application.mentorAssigned).filter(Boolean),
  ).size;
  const isAdmin = (user as { role?: string } | null)?.role === "admin";

  if (authLoading) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  if (authError) {
    return (
      <ScreenContainer className="items-center justify-center gap-5 p-6">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <IconSymbol name="gearshape.fill" size={24} color={colors.primary} />
        </View>
        <View className="gap-2">
          <Text className="text-center text-2xl font-bold text-foreground">Profile unavailable</Text>
          <Text className="text-center text-base leading-6 text-muted">
            We could not reach the private student service. Nothing has been changed.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => void refreshAuth()}
          className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
        >
          <Text className="text-base font-bold text-background">Try again</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer className="items-center justify-center gap-4 p-6">
        <Text className="text-center text-2xl font-bold text-foreground">Sign in to view your profile</Text>
        <Text className="text-center text-base leading-6 text-muted">
          Account details, messages, and documents stay private.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)")}
          className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
        >
          <Text className="text-base font-bold text-background">Return home</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (studentQuery.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  if (studentQuery.isError) {
    return (
      <ScreenContainer className="items-center justify-center gap-5 p-6">
        <Text className="text-center text-2xl font-bold text-foreground">Profile could not load</Text>
        <Text className="text-center text-base leading-6 text-muted">
          Check your connection and try once more.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => void studentQuery.refetch()}
          className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
        >
          <Text className="text-base font-bold text-background">Reload profile</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const student = studentQuery.data;

  const handleLogout = () => {
    Alert.alert("Sign out", "Sign out of this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          if (Platform.OS !== "web") {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          void logout();
        },
      },
    ]);
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-5 pb-6 gap-5">
          <View className="flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
              <Image
                source={require("@/landing/assets/logo-icon.png")}
                accessibilityLabel="Last Bench"
                resizeMode="contain"
                style={{ width: 46, height: 32 }}
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-xs font-bold uppercase tracking-widest text-primary">Your profile</Text>
              <Text className="text-2xl font-bold leading-8 text-foreground">
                {user.name || "Student"}
              </Text>
              <Text className="text-sm text-muted" numberOfLines={1}>
                {user.email || "Signed-in account"}
              </Text>
            </View>
          </View>

          <View className="rounded-2xl border border-border bg-surface px-3 py-4">
            <View className="flex-row">
              {[
                ["Applications", applications?.length ?? 0],
                ["Mentors", mentorsAssigned],
                ["Unread", unreadMessages],
              ].map(([label, value], index) => (
                <View
                  key={String(label)}
                  className={`flex-1 items-center gap-1 ${index > 0 ? "border-l border-border" : ""}`}
                >
                  <Text className="text-xl font-bold text-foreground">{value}</Text>
                  <Text className="text-xs font-semibold text-muted">{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="px-5 gap-6">
          <View className="gap-3">
            <View className="flex-row items-end justify-between">
              <Text className="text-xl font-bold text-foreground">Study profile</Text>
              {student ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => router.push("/onboarding")}
                  className="min-h-11 justify-center px-1"
                >
                  <Text className="text-sm font-bold text-primary">Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {student ? (
              <View className="overflow-hidden rounded-2xl border border-border bg-surface">
                {[
                  ["Study stage", student.class || "Not set"],
                  ...(student.gpa ? [["GPA", student.gpa]] : []),
                  ["Field", student.fieldOfInterest || "Not set"],
                  ["Destination", student.destinationPreference || "Not set"],
                ].map(([label, value], index) => (
                  <View
                    key={label}
                    className={`gap-1 p-4 ${index > 0 ? "border-t border-border" : ""}`}
                  >
                    <Text className="text-xs font-bold uppercase tracking-widest text-muted">{label}</Text>
                    <Text className="text-base font-bold text-foreground">{value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="rounded-2xl border border-border bg-surface p-5 gap-4">
                <View className="gap-2">
                  <Text className="text-lg font-bold text-foreground">Build your starting profile</Text>
                  <Text className="text-sm leading-5 text-muted">
                    Add your study stage, destination, and field to improve your guidance.
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => router.push("/onboarding")}
                  className="min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3"
                >
                  <Text className="text-base font-bold text-background">Set up profile</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View className="gap-3">
            <Text className="text-xl font-bold text-foreground">Quick access</Text>
            <View className="overflow-hidden rounded-2xl border border-border bg-surface">
              <ProfileLink
                title="Messages"
                body={unreadMessages > 0 ? `${unreadMessages} waiting for you` : "Your mentor conversations"}
                icon="bubble.left.and.bubble.right.fill"
                badge={unreadMessages}
                onPress={() => hapticPress(() => router.push("/messages"))}
              />
              <ProfileLink
                title="Applications & documents"
                body="Timelines, reviewed files, and next steps"
                icon="folder.fill"
                onPress={() => hapticPress(() => router.push("/applications"))}
              />
              <ProfileLink
                title="Community"
                body="Join peers on the same journey"
                icon="person.2.fill"
                onPress={() => hapticPress(() => router.push("/community"))}
              />
              <ProfileLink
                title="Notifications"
                body={unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "All caught up"}
                icon="bell.fill"
                badge={unreadCount}
                onPress={() => hapticPress(() => router.push("/notifications"))}
              />
              <ProfileLink
                title="Partner portal"
                body="Tutor and coaching-centre tools"
                icon="person.2.fill"
                onPress={() => hapticPress(() => router.push("/tutor"))}
              />
              {isAdmin ? (
                <ProfileLink
                  title="Admin dashboard"
                  body="Manage students, applications, and partners"
                  icon="gearshape.fill"
                  onPress={() => hapticPress(() => router.push("/admin"))}
                />
              ) : null}
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-xl font-bold text-foreground">Appearance</Text>
            <View className="flex-row gap-2 rounded-2xl border border-border bg-surface p-2">
              {[
                ["light", "Day", "sun.max.fill"],
                ["dark", "Night", "moon.fill"],
              ].map(([scheme, label, icon]) => {
                const selected = colorScheme === scheme;
                return (
                  <TouchableOpacity
                    key={scheme}
                    accessibilityRole="radio"
                    accessibilityLabel={`${label} appearance`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => hapticPress(() => setColorScheme(scheme as "light" | "dark"))}
                    className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-3 ${
                      selected ? "bg-primary" : "bg-transparent"
                    }`}
                  >
                    <IconSymbol
                      name={icon as IconSymbolName}
                      size={20}
                      color={selected ? colors.background : colors.muted}
                    />
                    <Text className={`text-sm font-bold ${selected ? "text-background" : "text-muted"}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-sm leading-5 text-muted">
              Your choice is remembered on this device.
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleLogout}
            className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3"
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={colors.error} />
            <Text className="text-base font-bold text-error">Sign out</Text>
          </TouchableOpacity>

          <View className="items-center gap-1 border-t border-border pt-5">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted">Last Bench v1.0</Text>
            <Text className="text-sm text-muted">Beyond marks. Beyond limits.</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
