import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

const ALL_STATUSES = [
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
  "rejected",
] as const;
type ApplicationStatus = (typeof ALL_STATUSES)[number];
const FILTER_STATUSES = ["all", ...ALL_STATUSES] as const;

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return ALL_STATUSES.includes(value as ApplicationStatus);
}

function StatusBadge({ status }: { status: string }) {
  const needsAction = ["draft", "documents_received"].includes(status);
  const isGood = ["offer_received", "pre_departure"].includes(status);
  const isRejected = status === "rejected";
  const bgClass = isRejected
    ? "bg-red-100 dark:bg-red-900/30"
    : isGood
    ? "bg-green-100 dark:bg-green-900/30"
    : needsAction ? "bg-yellow-100 dark:bg-yellow-900/30"
    : "bg-surface";
  const textClass = isRejected
    ? "text-red-700 dark:text-red-300"
    : isGood
    ? "text-green-700 dark:text-green-300"
    : needsAction ? "text-yellow-700 dark:text-yellow-300"
    : "text-muted";
  return (
    <View className={`px-2 py-1 rounded-full border border-border ${bgClass}`}>
      <Text className={`text-xs font-semibold capitalize ${textClass}`}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

export default function AdminApplicationsScreen() {
  const router = useRouter();
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus | "">("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");

  const { data: allApplications, isLoading, refetch, isRefetching } = trpc.admin.getAllApplications.useQuery();
  const utils = trpc.useUtils();

  const updateStatus = trpc.admin.updateApplicationStatus.useMutation({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedApp(null);
      setNewStatus("");
      setNotes("");
      utils.admin.getAllApplications.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const filtered = filter === "all"
    ? (allApplications ?? [])
    : (allApplications ?? []).filter((a: any) => a.applicationStatus === filter);

  const handleUpdateStatus = () => {
    if (!newStatus) { Alert.alert("Select a status"); return; }
    updateStatus.mutate({ applicationId: selectedApp.id, status: newStatus, notes });
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-6 pt-8 pb-4 gap-2 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary text-lg">←</Text>
          </TouchableOpacity>
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">Applications</Text>
            <Text className="text-sm text-muted">{allApplications?.length ?? 0} total</Text>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 pb-4" contentContainerStyle={{ gap: 8, paddingRight: 24 }}>
          {FILTER_STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setFilter(s)}
              className={`px-3 py-2 rounded-full border ${filter === s ? "bg-primary border-primary" : "bg-surface border-border"}`}
            >
              <Text className={`text-xs font-semibold capitalize ${filter === s ? "text-white" : "text-foreground"}`}>
                {s.replace(/_/g, " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="px-6 pb-12 gap-3">
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator />
            </View>
          ) : filtered.length === 0 ? (
            <View className="bg-surface border border-border rounded-xl p-6 items-center">
              <Text className="text-sm text-muted">No applications found</Text>
            </View>
          ) : (
            filtered.map((app: any) => (
              <TouchableOpacity
                key={app.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedApp(app);
                  setNewStatus(
                    isApplicationStatus(app.applicationStatus) ? app.applicationStatus : "",
                  );
                }}
                activeOpacity={0.7}
                className="bg-surface border border-border rounded-xl p-4 gap-3 active:opacity-80"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-foreground">{app.universityName}</Text>
                    <Text className="text-xs text-muted">{app.programName} · Student #{app.studentId}</Text>
                  </View>
                  <StatusBadge status={app.applicationStatus ?? "inquiry"} />
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted">
                    {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "Not submitted"}
                  </Text>
                  <Text className="text-xs text-primary font-semibold">Tap to update →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Status update modal */}
      <Modal visible={!!selectedApp} transparent animationType="slide" onRequestClose={() => setSelectedApp(null)}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setSelectedApp(null)}
        >
          <TouchableOpacity activeOpacity={1} className="bg-background rounded-t-3xl p-6 gap-4" style={{ paddingBottom: 40 }}>
            <View className="w-12 h-1 rounded-full bg-border self-center mb-2" />

            <Text className="text-xl font-bold text-foreground">Update Status</Text>
            {selectedApp && (
              <Text className="text-sm text-muted">{selectedApp.universityName} · {selectedApp.programName}</Text>
            )}

            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              <View className="gap-2">
                {ALL_STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNewStatus(s); }}
                    className={`px-4 py-3 rounded-xl border ${newStatus === s ? "bg-primary border-primary" : "bg-surface border-border"}`}
                  >
                    <Text className={`text-sm font-semibold capitalize ${newStatus === s ? "text-white" : "text-foreground"}`}>
                      {s.replace(/_/g, " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes (optional)"
              placeholderTextColor="#687076"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-sm"
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              onPress={handleUpdateStatus}
              disabled={updateStatus.isPending}
              className="bg-primary rounded-xl py-4 items-center active:opacity-80"
            >
              {updateStatus.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold">Update Status</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
