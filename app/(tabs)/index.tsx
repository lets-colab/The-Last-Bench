import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
} from "react-native";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { BenchLoader } from "@/components/bench-loader";
import { APP_ID, OAUTH_PORTAL_URL, startOAuthLogin } from "@/constants/oauth";

// Ordered pipeline stages — mirrors app/(tabs)/applications.tsx. Position in
// this list is shown as a stage, never as a claim of percent completion.
const STATUS_ORDER = [
  "draft",
  "documents_received",
  "profile_analyzed",
  "shortlisted",
  "application_drafted",
  "submitted_to_university",
  "under_review",
  "offer_received",
  "visa_application_filed",
  "visa_decision",
  "pre_departure",
];

function statusRank(status: string): number {
  const i = STATUS_ORDER.indexOf(status);
  return i >= 0 ? i : 0;
}

/**
 * Home Screen - Elegant Dashboard
 *
 * Design Principles:
 * - Simplicity: One primary action per section
 * - Hierarchy: Clear visual distinction between content
 * - Delight: Smooth animations and thoughtful details
 * - Focus: Personalized insights and next steps
 *
 * Every number on this screen comes from the student's real data — no
 * placeholder content, per the platform's "Trust Through Transparency"
 * principle in design.md. New/empty states are shown honestly.
 */
export default function HomeScreen() {
  const { user, loading: authLoading, error: authError, refresh: refreshAuth } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const applicationsQuery = trpc.application.getByStudent.useQuery(undefined, { enabled: !!user });
  const notificationsQuery = trpc.notification.getForUser.useQuery(undefined, { enabled: !!user });
  const studentQuery = trpc.student.getProfile.useQuery(undefined, { enabled: !!user });
  const recommendationsQuery = trpc.aiGuidance.getRecommendations.useQuery(undefined, {
    enabled: !!user && !!studentQuery.data,
    retry: false,
  });

  const applications = applicationsQuery.data || [];
  const notifications = notificationsQuery.data || [];
  const isLoading =
    applicationsQuery.isLoading || notificationsQuery.isLoading || studentQuery.isLoading;
  const dashboardError =
    applicationsQuery.error || notificationsQuery.error || studentQuery.error;
  const canStartSignIn = Boolean(APP_ID && OAUTH_PORTAL_URL);

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshAuth();
    if (user) {
      await Promise.all([applicationsQuery.refetch(), notificationsQuery.refetch()]);
    }
    setRefreshing(false);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const firstName = user?.name?.split(" ")[0] || "Student";
  const timeOfDay = new Date().getHours() < 12 ? "morning" : "afternoon";

  // Journey stage = the single most-advanced application's pipeline position.
  const leadApplication = applications.reduce<(typeof applications)[number] | null>((best, app) => {
    if (!best || statusRank(app.applicationStatus) > statusRank(best.applicationStatus)) return app;
    return best;
  }, null);
  const journeyStage = leadApplication ? statusRank(leadApplication.applicationStatus) + 1 : 0;
  const journeyBarWidth: `${number}%` =
    `${Math.round((journeyStage / STATUS_ORDER.length) * 100)}%`;

  const submittedCount = applications.filter((a) => statusRank(a.applicationStatus) >= statusRank("submitted_to_university")).length;
  const pendingVisaCount = applications.filter((a) => a.applicationStatus === "visa_application_filed").length;
  const offersCount = applications.filter((a) => statusRank(a.applicationStatus) >= statusRank("offer_received")).length;
  const mentorsAssigned = new Set(applications.map((a) => a.mentorAssigned).filter((id): id is number => !!id)).size;

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const recentActivity = notifications.slice(0, 3);

  const draftApplication = applications.find((a) => a.applicationStatus === "draft");
  const needsTranscript = !studentQuery.data?.transcriptUrl;

  const recommendation = recommendationsQuery.data?.recommendations?.[0];

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header with Greeting */}
        <View className="px-6 pt-8 pb-6 gap-2">
          <Text className="text-sm font-semibold text-muted">Good {timeOfDay}</Text>
          <Text className="text-4xl font-bold text-foreground">
            {firstName}
          </Text>
          <Text className="text-base text-muted leading-relaxed">
            Let&apos;s turn your study-abroad goal into a clear plan
          </Text>
        </View>

        {authLoading ? (
          <View className="py-12 items-center">
            <BenchLoader />
          </View>
        ) : authError ? (
          <View className="px-6 pb-6">
            <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-6 gap-3 items-start">
              <Text className="text-3xl">↻</Text>
              <Text className="text-lg font-bold text-foreground">Student services are unavailable</Text>
              <Text className="text-sm text-muted leading-relaxed">
                Your workspace could not connect to Last Bench services. Please try again in a
                moment.
              </Text>
              <TouchableOpacity
                onPress={() => void refreshAuth()}
                className="bg-primary rounded-lg px-5 py-3 mt-1 active:opacity-80"
              >
                <Text className="text-background font-bold text-sm">Retry connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !user ? (
          <View className="px-6 pb-6">
            <View className="bg-surface border border-border rounded-2xl p-6 gap-3 items-start">
              <Text className="text-3xl">👋</Text>
              <Text className="text-lg font-bold text-foreground">Your student workspace</Text>
              <Text className="text-sm text-muted leading-relaxed">
                Sign in to see applications, messages, documents, and guidance tied to your account.
              </Text>
              {canStartSignIn ? (
                <TouchableOpacity
                  onPress={() => void startOAuthLogin()}
                  className="bg-primary rounded-lg px-5 py-3 mt-1 active:opacity-80"
                >
                  <Text className="text-background font-bold text-sm">Sign in securely</Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-xs text-amber-700 dark:text-amber-300">
                  Sign-in is not connected on this deployment yet.
                </Text>
              )}
            </View>
          </View>
        ) : dashboardError ? (
          <View className="px-6 pb-6">
            <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-6 gap-3 items-start">
              <Text className="text-3xl">↻</Text>
              <Text className="text-lg font-bold text-foreground">Dashboard unavailable</Text>
              <Text className="text-sm text-muted leading-relaxed">
                We could not load your current student records. Check your connection and try again.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  void Promise.all([
                    applicationsQuery.refetch(),
                    notificationsQuery.refetch(),
                    studentQuery.refetch(),
                  ])
                }
                className="bg-primary rounded-lg px-5 py-3 mt-1 active:opacity-80"
              >
                <Text className="text-background font-bold text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isLoading ? (
          <View className="py-12 items-center">
            <BenchLoader />
          </View>
        ) : !studentQuery.data ? (
          <View className="px-6 pb-6">
            <View className="bg-surface border border-border rounded-2xl p-6 gap-3 items-start">
              <Text className="text-3xl">🧭</Text>
              <Text className="text-lg font-bold text-foreground">Create your starting profile</Text>
              <Text className="text-sm text-muted leading-relaxed">
                Add your current study stage, field, and destination preference before using
                personalized guidance.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/onboarding")}
                className="bg-primary rounded-lg px-5 py-3 mt-1 active:opacity-80"
              >
                <Text className="text-background font-bold text-sm">Set up profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : applications.length === 0 ? (
          /* Empty state for brand-new students — no fabricated progress */
          <View className="px-6 pb-6">
            <View className="bg-surface border border-border rounded-2xl p-6 gap-3 items-start">
              <Text className="text-3xl">🎓</Text>
              <Text className="text-lg font-bold text-foreground">Start your first application</Text>
              <Text className="text-sm text-muted leading-relaxed">
                You haven&apos;t started an application yet. Chat with an AI guide or browse universities to
                shortlist your first one.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/ai-guidance")}
                className="bg-primary rounded-lg px-5 py-3 mt-1 active:opacity-80"
              >
                <Text className="text-background font-bold text-sm">Get Guidance</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Primary Action Card - Journey Progress (real, from the lead application) */}
            <View className="px-6 pb-6">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/applications")}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                className="bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-6 gap-4"
              >
                <View className="gap-2">
                  <Text className="text-white text-sm font-semibold opacity-90">Your Application Journey</Text>
                  <Text className="text-white text-3xl font-bold">
                    {submittedCount} of {applications.length}
                  </Text>
                  <Text className="text-white text-sm opacity-75">applications submitted</Text>
                </View>
                <View className="h-2 bg-white/30 rounded-full overflow-hidden">
                  <View style={{ width: journeyBarWidth }} className="h-full bg-white rounded-full" />
                </View>
                <View className="flex-row items-center justify-between pt-2">
                  <Text className="text-white text-xs font-semibold opacity-90">
                    Furthest application: stage {journeyStage} of {STATUS_ORDER.length}
                  </Text>
                  <Text className="text-white text-lg">→</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Stats — every number derived from real applications/notifications */}
            <View className="px-6 pb-6 gap-3">
              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-2xl">📋</Text>
                  <Text className="text-sm text-muted font-medium">Pending</Text>
                  <Text className="text-2xl font-bold text-foreground">{pendingVisaCount}</Text>
                  <Text className="text-xs text-muted">visa decision</Text>
                </View>

                <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-2xl">👥</Text>
                  <Text className="text-sm text-muted font-medium">Mentors</Text>
                  <Text className="text-2xl font-bold text-foreground">{mentorsAssigned}</Text>
                  <Text className="text-xs text-muted">assigned</Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-2xl">💬</Text>
                  <Text className="text-sm text-muted font-medium">Updates</Text>
                  <Text className="text-2xl font-bold text-foreground">{unreadNotifications.length}</Text>
                  <Text className="text-xs text-muted">unread</Text>
                </View>

                <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-2xl">🎉</Text>
                  <Text className="text-sm text-muted font-medium">Offers</Text>
                  <Text className="text-2xl font-bold text-foreground">{offersCount}</Text>
                  <Text className="text-xs text-muted">received</Text>
                </View>
              </View>
            </View>

            {/* Next Steps — derived from real profile/application state, not scripted copy */}
            {(needsTranscript || draftApplication) && (
              <View className="px-6 pb-6 gap-3">
                <Text className="text-lg font-bold text-foreground">Next Steps</Text>

                {needsTranscript && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      leadApplication && router.push(`/application-detail?id=${leadApplication.id}`)
                    }
                    className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
                  >
                    <View className="flex-1 gap-1">
                      <Text className="text-sm font-semibold text-foreground">Review document needs</Text>
                      <Text className="text-xs text-muted">
                        Confirm the current checklist with your mentor
                      </Text>
                    </View>
                    <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                      <Text className="text-primary font-bold">→</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {draftApplication && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push(`/application-detail?id=${draftApplication.id}`)}
                    className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
                  >
                    <View className="flex-1 gap-1">
                      <Text className="text-sm font-semibold text-foreground">Continue Application</Text>
                      <Text className="text-xs text-muted">{draftApplication.universityName}</Text>
                    </View>
                    <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                      <Text className="text-primary font-bold">→</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* Personalized Insights — real AI recommendation, or hidden if unavailable */}
        {recommendation && (
          <View className="px-6 pb-6 gap-3">
            <Text className="text-lg font-bold text-foreground">Personalized for You</Text>

            <View className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 gap-3">
              <View className="flex-row items-start gap-3">
                <Text className="text-2xl">🤖</Text>
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {recommendation.universityName} — {recommendation.programName}
                  </Text>
                  <Text className="text-xs text-muted leading-relaxed">{recommendation.whyGoodFit}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/universities")}
                className="bg-primary rounded-lg py-2 px-3 active:opacity-80"
              >
                <Text className="text-white text-xs font-bold text-center">Explore Universities</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent Activity — real notifications, honestly empty when there are none */}
        {user && (
          <View className="px-6 pb-12 gap-3">
            <Text className="text-lg font-bold text-foreground">Recent Activity</Text>

            {recentActivity.length === 0 ? (
              <Text className="text-sm text-muted">No activity yet — updates will appear here.</Text>
            ) : (
              <View className="gap-2">
                {recentActivity.map((n) => (
                  <View key={n.id} className="flex-row items-center gap-3">
                    <View className={`w-2 h-2 rounded-full ${n.isRead ? "bg-border" : "bg-primary"}`} />
                    <Text className="text-sm text-foreground flex-1">{n.title}</Text>
                    <Text className="text-xs text-muted">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
