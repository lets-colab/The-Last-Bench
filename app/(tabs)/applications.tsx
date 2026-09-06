import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { BenchLoader } from "@/components/bench-loader";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
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

const STATUS_CONFIG: Record<string, { label: string; icon: IconSymbolName }> = {
  draft: { label: "Draft", icon: "doc.text.fill" },
  documents_received: { label: "Documents received", icon: "folder.fill" },
  profile_analyzed: { label: "Profile analysed", icon: "person.fill" },
  shortlisted: { label: "Shortlisted", icon: "sparkles" },
  application_drafted: { label: "Application drafted", icon: "doc.text.fill" },
  submitted_to_university: { label: "Submitted", icon: "paperplane.fill" },
  under_review: { label: "Under review", icon: "gearshape.fill" },
  offer_received: { label: "Offer received", icon: "checkmark.circle.fill" },
  visa_application_filed: { label: "Visa filed", icon: "folder.fill" },
  visa_decision: { label: "Visa decision", icon: "checkmark.circle.fill" },
  pre_departure: { label: "Pre-departure", icon: "graduationcap.fill" },
  rejected: { label: "Closed", icon: "doc.text.fill" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { label: status.replaceAll("_", " "), icon: "doc.text.fill" as const };
}

function hapticSelect() {
  if (Platform.OS !== "web") {
    void Haptics.selectionAsync();
  }
}

export default function ApplicationsScreen() {
  const { user, loading: authLoading, error: authError, refresh: refreshAuth } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const applicationsQuery = trpc.application.getByStudent.useQuery(undefined, {
    enabled: !!user,
  });

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
          <Text className="text-center text-2xl font-bold text-foreground">Applications unavailable</Text>
          <Text className="text-center text-base leading-6 text-muted">
            We could not reach the private student service. Your application data has not changed.
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
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <IconSymbol name="folder.fill" size={24} color={colors.primary} />
        </View>
        <Text className="text-center text-2xl font-bold text-foreground">Sign in to view applications</Text>
        <Text className="text-center text-base leading-6 text-muted">
          Timelines, documents, and university decisions stay inside your private workspace.
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

  const applications = applicationsQuery.data ?? [];
  const statuses = Array.from(new Set(applications.map((application) => application.applicationStatus)));
  const filteredApplications = selectedStatus
    ? applications.filter((application) => application.applicationStatus === selectedStatus)
    : applications;

  const selectStatus = (status: string | null) => {
    hapticSelect();
    setSelectedStatus((current) => (current === status ? null : status));
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2 px-5 pb-5 pt-6">
          <Text className="text-xs font-bold uppercase tracking-widest text-primary">Your journey</Text>
          <Text className="text-3xl font-bold leading-10 text-foreground">Applications</Text>
          <Text className="text-base leading-6 text-muted">
            Follow each verified step from draft to departure.
          </Text>
        </View>

        {statuses.length > 0 ? (
          <View className="gap-3 pb-5">
            <Text className="px-5 text-sm font-bold text-foreground">Filter by stage</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: selectedStatus === null }}
                accessibilityLabel={`Show all ${applications.length} applications`}
                onPress={() => selectStatus(null)}
                className={`min-h-11 justify-center rounded-full border px-4 py-2 ${
                  selectedStatus === null ? "border-primary bg-primary" : "border-border bg-surface"
                }`}
              >
                <Text className={`text-sm font-bold ${selectedStatus === null ? "text-background" : "text-foreground"}`}>
                  All · {applications.length}
                </Text>
              </TouchableOpacity>
              {statuses.map((status) => {
                const config = getStatusConfig(status);
                const count = applications.filter(
                  (application) => application.applicationStatus === status,
                ).length;
                const selected = selectedStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${config.label}, ${count} application${count === 1 ? "" : "s"}`}
                    onPress={() => selectStatus(status)}
                    className={`min-h-11 justify-center rounded-full border px-4 py-2 ${
                      selected ? "border-primary bg-primary" : "border-border bg-surface"
                    }`}
                  >
                    <Text className={`text-sm font-bold ${selected ? "text-background" : "text-foreground"}`}>
                      {config.label} · {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {applicationsQuery.isLoading ? (
          <View className="flex-1 items-center justify-center p-6">
            <BenchLoader />
          </View>
        ) : applicationsQuery.isError ? (
          <View className="flex-1 items-center justify-center gap-5 px-6 pb-12">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <IconSymbol name="gearshape.fill" size={24} color={colors.primary} />
            </View>
            <View className="gap-2">
              <Text className="text-center text-2xl font-bold text-foreground">Timeline could not load</Text>
              <Text className="text-center text-base leading-6 text-muted">
                Check your connection, then reload your applications.
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void applicationsQuery.refetch()}
              className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
            >
              <Text className="text-base font-bold text-background">Reload applications</Text>
            </TouchableOpacity>
          </View>
        ) : filteredApplications.length > 0 ? (
          <View className="gap-3 px-5 pb-6">
            {filteredApplications.map((application) => {
              const config = getStatusConfig(application.applicationStatus);
              const stageIndex = STATUS_ORDER.indexOf(application.applicationStatus);
              const stagePosition = stageIndex >= 0 ? stageIndex + 1 : null;
              const pipelineWidth: `${number}%` = stagePosition
                ? `${Math.round((stagePosition / STATUS_ORDER.length) * 100)}%`
                : "0%";

              return (
                <TouchableOpacity
                  key={application.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${application.universityName} application, ${config.label}`}
                  activeOpacity={0.82}
                  onPress={() => router.push(`/application-detail?id=${application.id}`)}
                  className="gap-5 rounded-2xl border border-border bg-surface p-5"
                >
                  <View className="flex-row items-start gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                      <IconSymbol name={config.icon} size={21} color={colors.primary} />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-lg font-bold leading-6 text-foreground">
                        {application.universityName}
                      </Text>
                      <Text className="text-sm leading-5 text-muted">{application.programName}</Text>
                      {application.country ? (
                        <Text className="text-sm text-muted">{application.country}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View className="gap-2">
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-sm font-bold text-foreground">{config.label}</Text>
                      <Text className="text-xs font-bold uppercase tracking-wider text-muted">
                        {stagePosition ? `Stage ${stagePosition} of ${STATUS_ORDER.length}` : "Closed"}
                      </Text>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-border">
                      <View className="h-full rounded-full bg-primary" style={{ width: pipelineWidth }} />
                    </View>
                    <Text className="text-xs leading-5 text-muted">
                      Pipeline position only — your mentor confirms every milestone.
                    </Text>
                  </View>

                  <View className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3">
                    <Text className="text-base font-bold text-background">
                      {application.applicationStatus === "draft" ? "Review draft" : "View timeline"}
                    </Text>
                    <IconSymbol name="arrow.right" size={18} color={colors.background} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-5 px-6 pb-12">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <IconSymbol name="folder.fill" size={24} color={colors.primary} />
            </View>
            <View className="gap-2">
              <Text className="text-center text-2xl font-bold text-foreground">
                {selectedStatus ? "Nothing in this stage" : "No applications yet"}
              </Text>
              <Text className="text-center text-base leading-6 text-muted">
                {selectedStatus
                  ? "Choose another filter to see the rest of your journey."
                  : "Explore verified university options when you are ready to begin."}
              </Text>
            </View>
            {selectedStatus ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => selectStatus(null)}
                className="min-h-12 w-full items-center justify-center rounded-xl border border-border bg-surface px-5 py-3"
              >
                <Text className="text-base font-bold text-foreground">Show all applications</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.push("/universities")}
                className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
              >
                <Text className="text-base font-bold text-background">Explore universities</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
