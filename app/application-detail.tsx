import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { BenchLoader } from "@/components/bench-loader";

// Ordered pipeline stages — must match app/(tabs)/applications.tsx and the
// applicationStatus enum in drizzle/schema.ts.
const STAGES: { key: string; title: string; description: string; icon: string }[] = [
  { key: "draft", title: "Draft", description: "Application started", icon: "📝" },
  { key: "documents_received", title: "Documents Received", description: "Your documents are in", icon: "📄" },
  { key: "profile_analyzed", title: "Profile Analyzed", description: "Your academic profile has been reviewed", icon: "🔍" },
  { key: "shortlisted", title: "Shortlisted", description: "University confirmed on your shortlist", icon: "⭐" },
  { key: "application_drafted", title: "Application Drafted", description: "Essays and statements completed", icon: "✍️" },
  { key: "submitted_to_university", title: "Submitted", description: "Application sent to admissions", icon: "📮" },
  { key: "under_review", title: "Under Review", description: "Admissions team is reviewing", icon: "⏳" },
  { key: "offer_received", title: "Offer Received", description: "Congratulations — you have an offer", icon: "🎉" },
  { key: "visa_application_filed", title: "Visa Filed", description: "EMGS visa application submitted", icon: "📋" },
  { key: "visa_decision", title: "Visa Decision", description: "Visa outcome received", icon: "✈️" },
  { key: "pre_departure", title: "Pre-Departure", description: "Preparing for Malaysia", icon: "🚀" },
];

/**
 * Application Detail Screen
 *
 * Every field on this screen is the student's real application data —
 * no placeholder content (design.md: Trust Through Transparency).
 */
export default function ApplicationDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const applicationId = Number(params.id) || 0;

  const applicationQuery = trpc.application.getById.useQuery(
    { id: applicationId },
    { enabled: applicationId > 0 }
  );
  const documentsQuery = trpc.document.getByApplication.useQuery(
    { applicationId },
    { enabled: applicationId > 0 }
  );

  const app = applicationQuery.data;
  const documents = documentsQuery.data || [];

  if (applicationQuery.isLoading) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  if (applicationQuery.isError) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-4xl">↻</Text>
        <Text className="text-xl font-bold text-foreground">Application unavailable</Text>
        <Text className="text-sm text-muted text-center leading-relaxed">
          We could not load this application. Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => void applicationQuery.refetch()}
          className="bg-primary rounded-lg px-6 py-3 active:opacity-80"
        >
          <Text className="text-background font-bold">Retry</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (!app) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-4xl">📭</Text>
        <Text className="text-xl font-bold text-foreground">Application not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary rounded-lg px-6 py-3 active:opacity-80"
        >
          <Text className="text-background font-bold">Go back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const currentIndex = Math.max(
    STAGES.findIndex((s) => s.key === app.applicationStatus),
    0
  );
  const isRejected = app.applicationStatus === "rejected";
  const stagePosition = currentIndex + 1;
  const pipelineWidth: `${number}%` = isRejected
    ? "0%"
    : `${Math.round((stagePosition / STAGES.length) * 100)}%`;
  const currentStage = isRejected
    ? { title: "Not Successful", icon: "✗", description: "This application was not successful" }
    : STAGES[currentIndex];

  const lastUpdated = app.lastUpdatedAt
    ? new Date(app.lastUpdatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleScheduleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Mentor calls are arranged over WhatsApp today — honest, working path.
    Linking.openURL("https://wa.me/8801300801785").catch(() =>
      Alert.alert("Schedule Call", "Reach your mentor on WhatsApp: 01300 801785")
    );
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-6 pb-4 gap-2 border-b border-border">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2 mb-2">
            <Text className="text-2xl">←</Text>
            <Text className="text-sm font-semibold text-primary">Back</Text>
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-foreground">{app.universityName}</Text>
          <Text className="text-base text-muted">{app.programName}</Text>
          {app.country && <Text className="text-xs text-muted">📍 {app.country}</Text>}
        </View>

        {/* Status Card */}
        <View className="px-6 pt-6 pb-4">
          <View className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-2xl p-6 gap-4">
            <View className="flex-row items-center justify-between">
              <View className="gap-1">
                <Text className="text-sm text-muted font-semibold">Current Status</Text>
                <Text className="text-2xl font-bold text-primary">{currentStage.title}</Text>
              </View>
              <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center">
                <Text className="text-3xl">{currentStage.icon}</Text>
              </View>
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-muted">Pipeline position</Text>
                <Text className="text-xs font-bold text-foreground">
                  {isRejected ? "Closed" : `Stage ${stagePosition} of ${STAGES.length}`}
                </Text>
              </View>
              <View className="h-2 bg-border rounded-full overflow-hidden">
                <View style={{ width: pipelineWidth }} className="h-full bg-primary rounded-full" />
              </View>
            </View>

            {lastUpdated && (
              <View className="gap-1 pt-2">
                <Text className="text-xs text-muted">Last updated</Text>
                <Text className="text-sm font-bold text-foreground">{lastUpdated}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Timeline — derived from the real pipeline stage */}
        {!isRejected && (
          <View className="px-6 pb-6 gap-4">
            <Text className="text-lg font-bold text-foreground">Application Timeline</Text>

            <View className="gap-4">
              {STAGES.map((stage, index) => {
                const status =
                  index < currentIndex ? "completed" : index === currentIndex ? "in-progress" : "pending";
                return (
                  <View key={stage.key} className="flex-row gap-4">
                    <View className="items-center">
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
                          status === "completed"
                            ? "bg-primary border-primary"
                            : status === "in-progress"
                              ? "bg-warning/20 border-warning"
                              : "bg-surface border-border"
                        }`}
                      >
                        <Text className="text-lg">{status === "completed" ? "✓" : stage.icon}</Text>
                      </View>
                      {index < STAGES.length - 1 && (
                        <View
                          className={`w-1 h-8 mt-2 ${status === "completed" ? "bg-primary" : "bg-border"}`}
                        />
                      )}
                    </View>

                    <View className="flex-1 pt-1 pb-2">
                      <Text
                        className={`text-base font-bold ${
                          status === "pending" ? "text-muted" : "text-foreground"
                        }`}
                      >
                        {stage.title}
                      </Text>
                      <Text className="text-sm text-muted mt-1">{stage.description}</Text>
                      {status === "in-progress" && lastUpdated && (
                        <Text className="text-xs text-muted mt-2">Since {lastUpdated}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Documents — real records; uploads arrive via your mentor for now */}
        <View className="px-6 pb-6 gap-4">
          <Text className="text-lg font-bold text-foreground">Documents</Text>

          {documentsQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : documentsQuery.isError ? (
            <View className="bg-surface border border-border rounded-xl p-4 gap-3">
              <Text className="text-sm font-semibold text-foreground">Documents unavailable</Text>
              <Text className="text-xs text-muted leading-relaxed">
                We could not load the reviewed documents for this application.
              </Text>
              <TouchableOpacity
                onPress={() => void documentsQuery.refetch()}
                className="self-start bg-primary rounded-lg px-4 py-2 active:opacity-80"
              >
                <Text className="text-background text-xs font-bold">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : documents.length > 0 ? (
            <View className="gap-2">
              {documents.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  onPress={() =>
                    doc.fileUrl &&
                    Linking.openURL(doc.fileUrl).catch(() =>
                      Alert.alert("Document unavailable", "This document link could not be opened."),
                    )
                  }
                  className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
                >
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground">📄 {doc.fileName}</Text>
                    <Text className="text-xs text-muted">
                      {doc.documentType}
                      {doc.createdAt
                        ? ` • ${new Date(doc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                        : ""}
                    </Text>
                  </View>
                  <Text className="text-lg text-primary">↓</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="bg-surface border border-border rounded-xl p-4 gap-1">
              <Text className="text-sm font-semibold text-foreground">No documents yet</Text>
              <Text className="text-xs text-muted leading-relaxed">
                Send your transcript and certificates to your mentor on WhatsApp — they&apos;ll be attached
                here after review. In-app upload is coming soon.
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="px-6 pb-12 gap-3">
          <TouchableOpacity
            onPress={handleScheduleCall}
            className="bg-primary rounded-xl py-4 active:opacity-80"
          >
            <Text className="text-white font-bold text-center">📞 Talk to your mentor</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
