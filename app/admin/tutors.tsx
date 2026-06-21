import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

export default function AdminTutorsScreen() {
  const router = useRouter();
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "earned" | "paid">("paid");

  const { data: allTutors, isLoading, refetch, isRefetching } = trpc.admin.getAllTutors.useQuery();
  const utils = trpc.useUtils();

  const updateCommission = trpc.admin.updateCommissionStatus.useMutation({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedReferral(null);
      utils.admin.getAllTutors.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

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
            <Text className="text-3xl font-bold text-foreground">Tutor Partners</Text>
            <Text className="text-sm text-muted">{allTutors?.length ?? 0} partners</Text>
          </View>
        </View>

        <View className="px-6 pb-12 gap-3">
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator />
            </View>
          ) : (allTutors ?? []).length === 0 ? (
            <View className="bg-surface border border-border rounded-xl p-6 items-center">
              <Text className="text-sm text-muted">No tutor partners yet</Text>
            </View>
          ) : (
            (allTutors ?? []).map((tutor: any) => {
              const earned = parseFloat(tutor.totalEarned ?? "0");
              return (
                <View key={tutor.id} className="bg-surface border border-border rounded-xl p-4 gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="gap-0.5">
                      <Text className="text-base font-bold text-foreground">{tutor.centerName}</Text>
                      <Text className="text-xs text-muted">{tutor.location} · {tutor.referralCode}</Text>
                    </View>
                    <View className="items-end gap-0.5">
                      <Text className="text-base font-bold text-foreground">৳{earned.toFixed(0)}</Text>
                      <Text className="text-xs text-muted">total earned</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 bg-background border border-border rounded-lg p-2 items-center">
                      <Text className="text-lg font-bold text-foreground">{tutor.totalReferred ?? 0}</Text>
                      <Text className="text-xs text-muted">referred</Text>
                    </View>
                    <View className="flex-1 bg-background border border-border rounded-lg p-2 items-center">
                      <Text className="text-lg font-bold text-foreground">{tutor.expertiseAreas ?? "—"}</Text>
                      <Text className="text-xs text-muted">expertise</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedReferral(tutor); setSelectedStatus("paid"); }}
                      className="flex-1 bg-primary rounded-lg p-2 items-center active:opacity-80"
                    >
                      <Text className="text-xs font-bold text-white">Mark Paid</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={!!selectedReferral} transparent animationType="slide" onRequestClose={() => setSelectedReferral(null)}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setSelectedReferral(null)}
        >
          <TouchableOpacity activeOpacity={1} className="bg-background rounded-t-3xl p-6 gap-4" style={{ paddingBottom: 40 }}>
            <View className="w-12 h-1 rounded-full bg-border self-center mb-2" />

            <Text className="text-xl font-bold text-foreground">Update Commission</Text>
            {selectedReferral && (
              <Text className="text-sm text-muted">{selectedReferral.centerName} · {selectedReferral.referralCode}</Text>
            )}

            <View className="gap-2">
              {(["pending", "earned", "paid"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedStatus(s); }}
                  className={`px-4 py-3 rounded-xl border ${selectedStatus === s ? "bg-primary border-primary" : "bg-surface border-border"}`}
                >
                  <Text className={`text-sm font-semibold capitalize ${selectedStatus === s ? "text-white" : "text-foreground"}`}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => {
                if (!selectedReferral) return;
                updateCommission.mutate({ referralId: selectedReferral.id, status: selectedStatus });
              }}
              disabled={updateCommission.isPending}
              className="bg-primary rounded-xl py-4 items-center active:opacity-80"
            >
              {updateCommission.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold">Update Commission Status</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
