import { useState } from "react";
import { ScrollView, Text, View, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

const STATUS_STYLES: Record<string, { chip: string; text: string; label: string }> = {
  requested: { chip: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", label: "Requested" },
  approved: { chip: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Approved" },
  paid: { chip: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Paid" },
  rejected: { chip: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Rejected" },
};

export default function AdminPayoutsScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: payouts, isLoading, refetch, isRefetching } = trpc.admin.listPayouts.useQuery();
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const updateStatus = trpc.admin.updatePayoutStatus.useMutation({
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      utils.admin.listPayouts.invalidate();
    },
    onError: (e) => Alert.alert("Could not update payout", e.message),
  });

  const act = (payoutId: number, status: "approved" | "rejected" | "paid") => {
    const note = noteDrafts[payoutId]?.trim() || undefined;
    if (status === "rejected" && !note) {
      Alert.alert("Add a reason", "Give the tutor a short reason before rejecting.");
      return;
    }
    updateStatus.mutate({ payoutId, status, note });
  };

  const open = (payouts ?? []).filter((p: any) => p.status === "requested" || p.status === "approved");
  const closed = (payouts ?? []).filter((p: any) => p.status === "paid" || p.status === "rejected");

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-6 pt-8 pb-6 gap-2 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary text-lg">←</Text>
          </TouchableOpacity>
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">Payouts</Text>
            <Text className="text-sm text-muted">Approve, pay, or decline tutor payout requests</Text>
          </View>
        </View>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : (
          <View className="px-6 pb-12 gap-6">
            <View className="gap-3">
              <Text className="text-xs font-semibold text-muted">NEEDS ACTION ({open.length})</Text>
              {open.length === 0 && (
                <View className="bg-surface border border-border rounded-xl p-6 items-center">
                  <Text className="text-sm text-muted">No open payout requests.</Text>
                </View>
              )}
              {open.map((p: any) => {
                const s = STATUS_STYLES[p.status];
                return (
                  <View key={p.id} className="bg-surface border border-border rounded-xl p-4 gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-bold text-foreground">৳{parseFloat(p.amount).toFixed(0)}</Text>
                      <View className={`px-3 py-1 rounded-full ${s.chip}`}>
                        <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
                      </View>
                    </View>
                    <Text className="text-xs text-muted">
                      Tutor #{p.tutorId} · {p.method} · {p.accountNumber}
                    </Text>
                    <Text className="text-xs text-muted">
                      Requested {new Date(p.requestedAt).toLocaleDateString()}
                    </Text>
                    <TextInput
                      value={noteDrafts[p.id] ?? ""}
                      onChangeText={(t) => setNoteDrafts((d) => ({ ...d, [p.id]: t }))}
                      placeholder={p.status === "requested" ? "Note (required to reject)" : "Payment reference (optional)"}
                      placeholderTextColor="#6B6F76"
                      className="border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                    />
                    <View className="flex-row gap-2">
                      {p.status === "requested" && (
                        <TouchableOpacity
                          onPress={() => act(p.id, "approved")}
                          disabled={updateStatus.isPending}
                          className="flex-1 bg-primary rounded-lg py-3 items-center active:opacity-80"
                        >
                          <Text className="text-white font-bold text-sm">Approve</Text>
                        </TouchableOpacity>
                      )}
                      {p.status === "approved" && (
                        <TouchableOpacity
                          onPress={() => act(p.id, "paid")}
                          disabled={updateStatus.isPending}
                          className="flex-1 bg-primary rounded-lg py-3 items-center active:opacity-80"
                        >
                          <Text className="text-white font-bold text-sm">Mark Paid</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => act(p.id, "rejected")}
                        disabled={updateStatus.isPending}
                        className="flex-1 border border-error rounded-lg py-3 items-center active:opacity-80"
                      >
                        <Text className="text-error font-bold text-sm">Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="gap-3">
              <Text className="text-xs font-semibold text-muted">HISTORY ({closed.length})</Text>
              {closed.map((p: any) => {
                const s = STATUS_STYLES[p.status];
                return (
                  <View key={p.id} className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
                    <View className="gap-1">
                      <Text className="text-sm font-semibold text-foreground">
                        ৳{parseFloat(p.amount).toFixed(0)} · {p.method}
                      </Text>
                      <Text className="text-xs text-muted">
                        Tutor #{p.tutorId}
                        {p.adminNote ? ` · ${p.adminNote}` : ""}
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${s.chip}`}>
                      <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
                    </View>
                  </View>
                );
              })}
              {closed.length === 0 && (
                <View className="bg-surface border border-border rounded-xl p-4">
                  <Text className="text-sm text-muted text-center">Nothing resolved yet.</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
