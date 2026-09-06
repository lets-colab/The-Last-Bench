import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { BenchLoader } from "@/components/bench-loader";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { APP_ID, OAUTH_PORTAL_URL, startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

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

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  documents_received: "Documents received",
  profile_analyzed: "Profile analysed",
  shortlisted: "Shortlisted",
  application_drafted: "Application drafted",
  submitted_to_university: "Submitted to university",
  under_review: "Under review",
  offer_received: "Offer received",
  visa_application_filed: "Visa application filed",
  visa_decision: "Visa decision",
  pre_departure: "Pre-departure",
  rejected: "Closed",
};

function statusRank(status: string): number {
  const index = STATUS_ORDER.indexOf(status);
  return index >= 0 ? index : 0;
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

type DashboardStateCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  icon: IconSymbolName;
  actionLabel?: string;
  onAction?: () => void;
  helper?: string;
};

function DashboardStateCard({
  eyebrow,
  title,
  body,
  icon,
  actionLabel,
  onAction,
  helper,
}: DashboardStateCardProps) {
  const colors = useColors();

  return (
    <View className="mx-5 rounded-2xl border border-border bg-surface p-5 gap-4">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
        <IconSymbol name={icon} size={23} color={colors.primary} />
      </View>
      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</Text>
        <Text className="text-2xl font-bold leading-8 text-foreground">{title}</Text>
        <Text className="text-base leading-6 text-muted">{body}</Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          activeOpacity={0.82}
          onPress={onAction}
          className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3"
        >
          <Text className="text-base font-bold text-background">{actionLabel}</Text>
          <IconSymbol name="arrow.right" size={19} color={colors.background} />
        </TouchableOpacity>
      ) : null}
      {helper ? <Text className="text-sm leading-5 text-muted">{helper}</Text> : null}
    </View>
  );
}

export default function HomeScreen() {
  const { user, loading: authLoading, error: authError, refresh: refreshAuth } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const applicationsQuery = trpc.application.getByStudent.useQuery(undefined, { enabled: !!user });
  const notificationsQuery = trpc.notification.getForUser.useQuery(undefined, { enabled: !!user });
  const studentQuery = trpc.student.getProfile.useQuery(undefined, { enabled: !!user });
  const recommendationsQuery = trpc.aiGuidance.getRecommendations.useQuery(undefined, {
    enabled: !!user && !!studentQuery.data,
    retry: false,
  });

  const applications = applicationsQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const isLoading =
    applicationsQuery.isLoading || notificationsQuery.isLoading || studentQuery.isLoading;
  const dashboardError =
    applicationsQuery.error || notificationsQuery.error || studentQuery.error;
  const canStartSignIn = Boolean(APP_ID && OAUTH_PORTAL_URL);

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await refreshAuth();
    if (user) {
      await Promise.all([
        applicationsQuery.refetch(),
        notificationsQuery.refetch(),
        studentQuery.refetch(),
      ]);
    }
    setRefreshing(false);
  };

  const firstName = user?.name?.trim().split(/\s+/)[0] || "Student";
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const headerTitle = user ? `Good ${timeOfDay}, ${firstName}` : "Student workspace";
  const headerBody = user
    ? "Know what changed. Know what comes next."
    : "Applications, guidance, and people—with every next step visible.";

  const leadApplication = applications.reduce<(typeof applications)[number] | null>((best, item) => {
    if (!best || statusRank(item.applicationStatus) > statusRank(best.applicationStatus)) return item;
    return best;
  }, null);
  const journeyStage = leadApplication ? statusRank(leadApplication.applicationStatus) + 1 : 0;
  const journeyBarWidth: `${number}%` = `${Math.round(
    (journeyStage / STATUS_ORDER.length) * 100,
  )}%`;
  const submittedCount = applications.filter(
    (item) =>
      statusRank(item.applicationStatus) >= statusRank("submitted_to_university") &&
      item.applicationStatus !== "rejected",
  ).length;
  const offersCount = applications.filter(
    (item) => statusRank(item.applicationStatus) >= statusRank("offer_received"),
  ).length;
  const unreadNotifications = notifications.filter((item) => !item.isRead);
  const recentActivity = notifications.slice(0, 3);
  const draftApplication = applications.find((item) => item.applicationStatus === "draft");
  const needsTranscript = !studentQuery.data?.transcriptUrl;
  const recommendation = recommendationsQuery.data?.recommendations?.[0];

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View className="px-5 pt-5 pb-6">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-primary">
                The Last Bench
              </Text>
              <Text className="text-3xl font-bold leading-10 text-foreground">{headerTitle}</Text>
              <Text className="text-base leading-6 text-muted">{headerBody}</Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface">
              <Image
                source={require("@/landing/assets/logo-icon.png")}
                accessibilityLabel="Last Bench"
                resizeMode="contain"
                style={{ width: 34, height: 24 }}
              />
            </View>
          </View>
        </View>

        {authLoading ? (
          <View className="py-14 items-center">
            <BenchLoader />
          </View>
        ) : authError ? (
          <DashboardStateCard
            eyebrow="Connection needed"
            title="Student services are unavailable"
            body="We could not reach the private student service. Your records have not been changed."
            icon="gearshape.fill"
            actionLabel="Try again"
            onAction={() => void refreshAuth()}
          />
        ) : !user ? (
          <DashboardStateCard
            eyebrow="Private by design"
            title="Pick up where you left off"
            body="Sign in to see your applications, saved universities, documents, and guidance."
            icon="person.fill"
            actionLabel={canStartSignIn ? "Sign in securely" : undefined}
            onAction={canStartSignIn ? () => void startOAuthLogin() : undefined}
            helper={
              canStartSignIn
                ? "Your account data stays separate from the public website."
                : "Sign-in is not connected on this deployment yet."
            }
          />
        ) : dashboardError ? (
          <DashboardStateCard
            eyebrow="Nothing was changed"
            title="Your dashboard could not load"
            body="Check your connection and try once more. If the problem continues, your mentor can help."
            icon="gearshape.fill"
            actionLabel="Reload dashboard"
            onAction={() =>
              void Promise.all([
                applicationsQuery.refetch(),
                notificationsQuery.refetch(),
                studentQuery.refetch(),
              ])
            }
          />
        ) : isLoading ? (
          <View className="py-14 items-center">
            <BenchLoader />
          </View>
        ) : !studentQuery.data ? (
          <DashboardStateCard
            eyebrow="First step"
            title="Build your starting profile"
            body="Add your study stage, destination, and field so every recommendation begins with your real situation."
            icon="chevron.left.forwardslash.chevron.right"
            actionLabel="Set up my profile"
            onAction={() => router.push("/onboarding")}
            helper="About two minutes. GPA is optional."
          />
        ) : applications.length === 0 ? (
          <View className="gap-4">
            <DashboardStateCard
              eyebrow="Profile ready"
              title="Choose the first path worth exploring"
              body="Start with guided research, then verify fees, entry rules, and intake dates with the university or a mentor."
              icon="graduationcap.fill"
              actionLabel="Find my first matches"
              onAction={() => router.push("/ai-guidance")}
            />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/universities")}
              className="mx-5 min-h-12 flex-row items-center justify-between rounded-xl border border-border bg-surface px-5 py-3"
            >
              <Text className="text-base font-bold text-foreground">Browse universities</Text>
              <IconSymbol name="arrow.right" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-5 px-5">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open application journey"
              activeOpacity={0.84}
              onPress={() => router.push("/applications")}
              className="rounded-2xl border border-border bg-surface p-5 gap-5"
            >
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-2">
                  <Text className="text-xs font-bold uppercase tracking-widest text-primary">
                    Your journey
                  </Text>
                  <Text className="text-2xl font-bold leading-8 text-foreground">
                    {leadApplication ? statusLabel(leadApplication.applicationStatus) : "Starting"}
                  </Text>
                  {leadApplication ? (
                    <Text className="text-sm leading-5 text-muted" numberOfLines={2}>
                      {leadApplication.universityName} · {leadApplication.programName}
                    </Text>
                  ) : null}
                </View>
                <View className="rounded-full bg-primary/10 px-3 py-2">
                  <Text className="text-sm font-bold text-primary">
                    {journeyStage}/{STATUS_ORDER.length}
                  </Text>
                </View>
              </View>
              <View className="gap-2">
                <View className="h-2 overflow-hidden rounded-full bg-border">
                  <View
                    style={{ width: journeyBarWidth, backgroundColor: colors.primary }}
                    className="h-full rounded-full"
                  />
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-muted">Recorded pipeline stage</Text>
                  <IconSymbol name="arrow.right" size={18} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>

            <View className="rounded-2xl border border-border bg-surface px-4 py-5">
              <View className="flex-row">
                {[
                  ["Applications", applications.length],
                  ["Submitted", submittedCount],
                  ["Offers", offersCount],
                ].map(([label, value], index) => (
                  <View
                    key={String(label)}
                    className={`flex-1 items-center gap-1 ${index > 0 ? "border-l border-border" : ""}`}
                  >
                    <Text className="text-2xl font-bold text-foreground">{value}</Text>
                    <Text className="text-xs font-semibold text-muted">{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {(draftApplication || (needsTranscript && leadApplication)) ? (
              <View className="gap-3">
                <Text className="text-xl font-bold text-foreground">Next move</Text>
                {draftApplication ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => router.push(`/application-detail?id=${draftApplication.id}`)}
                    className="min-h-14 flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <IconSymbol name="doc.text.fill" size={21} color={colors.primary} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-bold text-foreground">Continue application</Text>
                      <Text className="text-sm text-muted" numberOfLines={1}>
                        {draftApplication.universityName}
                      </Text>
                    </View>
                    <IconSymbol name="arrow.right" size={20} color={colors.muted} />
                  </TouchableOpacity>
                ) : null}
                {needsTranscript && leadApplication ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => router.push(`/application-detail?id=${leadApplication.id}`)}
                    className="min-h-14 flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <IconSymbol name="folder.fill" size={21} color={colors.primary} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-bold text-foreground">Review document needs</Text>
                      <Text className="text-sm text-muted">Confirm the checklist with your mentor</Text>
                    </View>
                    <IconSymbol name="arrow.right" size={20} color={colors.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {recommendation ? (
          <View className="px-5 pt-5 gap-3">
            <Text className="text-xl font-bold text-foreground">One match to review</Text>
            <View className="rounded-2xl border border-border bg-surface p-5 gap-4">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <IconSymbol name="sparkles" size={21} color={colors.primary} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-base font-bold leading-6 text-foreground">
                    {recommendation.universityName} · {recommendation.programName}
                  </Text>
                  <Text className="text-sm leading-5 text-muted">{recommendation.whyGoodFit}</Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.push("/universities")}
                className="min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3"
              >
                <Text className="text-base font-bold text-background">Review the university</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {user ? (
          <View className="px-5 pt-5 gap-3">
            <View className="flex-row items-end justify-between">
              <Text className="text-xl font-bold text-foreground">Recent activity</Text>
              {unreadNotifications.length > 0 ? (
                <Text className="text-xs font-bold text-primary">
                  {unreadNotifications.length} unread
                </Text>
              ) : null}
            </View>
            {recentActivity.length === 0 ? (
              <View className="rounded-xl border border-border bg-surface p-4">
                <Text className="text-sm leading-5 text-muted">
                  No updates yet. Recorded changes will appear here.
                </Text>
              </View>
            ) : (
              <View className="overflow-hidden rounded-xl border border-border bg-surface">
                {recentActivity.map((item, index) => (
                  <View
                    key={item.id}
                    className={`flex-row items-center gap-3 p-4 ${index > 0 ? "border-t border-border" : ""}`}
                  >
                    <View
                      className={`h-2 w-2 rounded-full ${item.isRead ? "bg-border" : "bg-primary"}`}
                    />
                    <Text className="flex-1 text-sm font-semibold text-foreground">{item.title}</Text>
                    <Text className="text-xs text-muted">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
