import { useState } from "react";
import { ScrollView, Text, View, TouchableOpacity, Alert, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { MIN_PAYOUT_BDT, PAYOUT_METHODS, validatePayoutRequest, type PayoutMethod } from "@/shared/payout";
import * as Haptics from "expo-haptics";

const PAYOUT_STATUS_STYLES: Record<string, { chip: string; text: string; label: string }> = {
  requested: { chip: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", label: "Requested" },
  approved: { chip: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Approved" },
  paid: { chip: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Paid" },
  rejected: { chip: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Rejected" },
};

export default function CommissionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: tutorProfile } = trpc.tutor.getProfile.useQuery();
  const { data: commission, isLoading } = trpc.tutor.getCommissionSummary.useQuery(undefined, { enabled: !!tutorProfile });
  const { data: referredStudents } = trpc.tutor.getReferredStudents.useQuery(undefined, { enabled: !!tutorProfile });
  const { data: myPayouts } = trpc.tutor.getMyPayouts.useQuery(undefined, { enabled: !!tutorProfile });

  const [formOpen, setFormOpen] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>("bKash");
  const [accountNumber, setAccountNumber] = useState("");
  const [amountText, setAmountText] = useState("");

  const pendingAmount = parseFloat((commission?.pendingCommission as string) ?? "0");
  const totalEarned = parseFloat((tutorProfile?.totalEarned as string) ?? "0");
  const availableForPayout = parseFloat((commission?.availableForPayout as string) ?? "0");

  const requestPayout = trpc.tutor.requestPayout.useMutation({
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFormOpen(false);
      setAmountText("");
      utils.tutor.getMyPayouts.invalidate();
      utils.tutor.getCommissionSummary.invalidate();
      Alert.alert("Payout requested", "We'll review it and send the money within 3-5 working days.");
    },
    onError: (e) => Alert.alert("Could not request payout", e.message),
  });

  const submitPayout = async () => {
    const amount = parseFloat(amountText);
    const check = validatePayoutRequest({
      amountBdt: amount,
      availableBdt: availableForPayout,
      method,
      accountNumber,
    });
    if (!check.ok) {
      Alert.alert("Check your request", check.error);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestPayout.mutate({ amount, method, accountNumber });
  };

  if (isLoading || !tutorProfile) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  const earnedReferrals = referredStudents?.filter((r: any) => r.commissionStatus === "earned") ?? [];
  const paidReferrals = referredStudents?.filter((r: any) => r.commissionStatus === "paid") ?? [];
  const pendingReferrals = referredStudents?.filter((r: any) => r.commissionStatus === "pending") ?? [];

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-8 pb-6 gap-2 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary text-lg">←</Text>
          </TouchableOpacity>
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">Commission</Text>
            <Text className="text-sm text-muted">{tutorProfile.centerName}</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View className="px-6 pb-6 gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
              <Text className="text-xs text-muted font-semibold">LIFETIME EARNED</Text>
              <Text className="text-2xl font-bold text-foreground">৳{totalEarned.toFixed(0)}</Text>
            </View>
            <View className="flex-1 bg-primary/10 border border-primary/20 rounded-xl p-4 gap-1">
              <Text className="text-xs text-primary font-semibold">PENDING</Text>
              <Text className="text-2xl font-bold text-primary">৳{pendingAmount.toFixed(0)}</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
              <Text className="text-xs text-muted font-semibold">PAID OUT</Text>
              <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
                ৳{paidReferrals.reduce((sum: number, r: any) => sum + parseFloat(r.commissionAmount ?? "0"), 0).toFixed(0)}
              </Text>
            </View>
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
              <Text className="text-xs text-muted font-semibold">STUDENTS</Text>
              <Text className="text-2xl font-bold text-foreground">{tutorProfile.totalReferred ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Breakdown */}
        <View className="px-6 pb-6 gap-3">
          <Text className="text-lg font-bold text-foreground">Breakdown</Text>

          {earnedReferrals.length > 0 && (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-muted">READY TO COLLECT</Text>
              {earnedReferrals.map((r: any) => (
                <View key={r.id} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-foreground">Student #{r.studentId}</Text>
                  <Text className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    ৳{parseFloat(r.commissionAmount ?? "0").toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {pendingReferrals.length > 0 && (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-muted">PENDING ENROLLMENT</Text>
              {pendingReferrals.map((r: any) => (
                <View key={r.id} className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-foreground">Student #{r.studentId}</Text>
                  <View className="bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
                    <Text className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">Pending</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {paidReferrals.length > 0 && (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-muted">PAID</Text>
              {paidReferrals.map((r: any) => (
                <View key={r.id} className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-foreground">Student #{r.studentId}</Text>
                  <Text className="text-sm font-bold text-green-600 dark:text-green-400">
                    ৳{parseFloat(r.commissionAmount ?? "0").toFixed(0)} paid
                  </Text>
                </View>
              ))}
            </View>
          )}

          {(referredStudents ?? []).length === 0 && (
            <View className="bg-surface border border-border rounded-xl p-6 items-center gap-2">
              <Text className="text-sm text-muted text-center">No commission data yet. Refer students to start earning.</Text>
            </View>
          )}
        </View>

        {/* Payout history */}
        {(myPayouts ?? []).length > 0 && (
          <View className="px-6 pb-6 gap-3">
            <Text className="text-lg font-bold text-foreground">Payouts</Text>
            {(myPayouts ?? []).map((p: any) => {
              const s = PAYOUT_STATUS_STYLES[p.status] ?? PAYOUT_STATUS_STYLES.requested;
              return (
                <View key={p.id} className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between">
                  <View className="gap-1">
                    <Text className="text-sm font-semibold text-foreground">
                      ৳{parseFloat(p.amount).toFixed(0)} · {p.method}
                    </Text>
                    <Text className="text-xs text-muted">
                      {new Date(p.requestedAt).toLocaleDateString()}
                      {p.adminNote ? ` · ${p.adminNote}` : ""}
                    </Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${s.chip}`}>
                    <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Payout request */}
        <View className="px-6 pb-12 gap-3">
          {formOpen ? (
            <View className="bg-surface border border-border rounded-xl p-4 gap-3">
              <Text className="text-sm font-bold text-foreground">Request a payout</Text>
              <Text className="text-xs text-muted">
                Available: ৳{availableForPayout.toFixed(0)} · minimum ৳{MIN_PAYOUT_BDT}. Sent via mobile wallet in 3-5 working days.
              </Text>
              <View className="flex-row gap-2">
                {PAYOUT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMethod(m)}
                    className={`flex-1 rounded-lg py-3 items-center border ${method === m ? "bg-primary/10 border-primary" : "border-border"}`}
                  >
                    <Text className={`text-sm font-semibold ${method === m ? "text-primary" : "text-muted"}`}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder={`${method} number (01XXXXXXXXX)`}
                placeholderTextColor="#6B6F76"
                keyboardType="phone-pad"
                className="border border-border rounded-lg px-3 py-3 text-sm text-foreground"
              />
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                placeholder={`Amount in ৳ (max ${availableForPayout.toFixed(0)})`}
                placeholderTextColor="#6B6F76"
                keyboardType="numeric"
                className="border border-border rounded-lg px-3 py-3 text-sm text-foreground"
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={submitPayout}
                  disabled={requestPayout.isPending}
                  className="flex-1 bg-primary rounded-lg py-3 items-center active:opacity-80"
                >
                  {requestPayout.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold text-sm">Submit request</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFormOpen(false)} className="flex-1 border border-border rounded-lg py-3 items-center">
                  <Text className="text-muted font-semibold text-sm">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (availableForPayout < MIN_PAYOUT_BDT) {
                  Alert.alert(
                    "Not enough earned commission",
                    `You need at least ৳${MIN_PAYOUT_BDT} in earned commission to request a payout. Commission becomes payable once a referred student enrolls.`
                  );
                  return;
                }
                setFormOpen(true);
              }}
              className={`rounded-xl py-4 items-center active:opacity-80 ${availableForPayout >= MIN_PAYOUT_BDT ? "bg-primary" : "bg-muted/30"}`}
            >
              <Text className={`font-bold text-base ${availableForPayout >= MIN_PAYOUT_BDT ? "text-white" : "text-muted"}`}>
                {availableForPayout >= MIN_PAYOUT_BDT
                  ? `Request Payout — ৳${availableForPayout.toFixed(0)} available`
                  : "No payable commission yet"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
