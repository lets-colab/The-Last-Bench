import { ScrollView, Text, View, TouchableOpacity, Alert, ActivityIndicator, Share, Linking } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import * as Haptics from "expo-haptics";

export default function CommissionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: tutorProfile } = trpc.tutor.getProfile.useQuery();
  const { data: commission, isLoading } = trpc.tutor.getCommissionSummary.useQuery(undefined, { enabled: !!tutorProfile });
  const { data: referredStudents } = trpc.tutor.getReferredStudents.useQuery(undefined, { enabled: !!tutorProfile });

  const pendingAmount = parseFloat((commission?.pendingCommission as string) ?? "0");
  const totalEarned = parseFloat((tutorProfile?.totalEarned as string) ?? "0");

  const handleRequestPayout = async () => {
    if (pendingAmount <= 0) {
      Alert.alert("No pending commission", "You have no pending commission to request a payout for.");
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const whatsappMsg = encodeURIComponent(
      `Hi! I'm ${user?.name} (${tutorProfile?.centerName}), a Last Bench partner. I'd like to request my pending commission payout of ৳${pendingAmount.toFixed(0)}. My referral code is: ${tutorProfile?.referralCode}. Please process via bKash/Nagad. Thank you!`
    );
    const url = `https://wa.me/+8801XXXXXXXXX?text=${whatsappMsg}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      await Share.share({
        message: `Payout request: ${user?.name}, ৳${pendingAmount.toFixed(0)}, Code: ${tutorProfile?.referralCode}`,
      });
    }
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

        {/* Payout Info */}
        <View className="px-6 pb-6">
          <View className="bg-surface border border-border rounded-xl p-4 gap-2">
            <Text className="text-sm font-bold text-foreground">Payout Methods</Text>
            <Text className="text-xs text-muted leading-relaxed">Payouts are processed within 3-5 working days via bKash or Nagad. Add your payment number in your profile settings before requesting.</Text>
          </View>
        </View>

        {/* CTA */}
        <View className="px-6 pb-12">
          <TouchableOpacity
            onPress={handleRequestPayout}
            disabled={pendingAmount <= 0}
            className={`rounded-xl py-4 items-center active:opacity-80 ${pendingAmount > 0 ? "bg-primary" : "bg-muted/30"}`}
          >
            <Text className={`font-bold text-base ${pendingAmount > 0 ? "text-white" : "text-muted"}`}>
              {pendingAmount > 0 ? `Request Payout — ৳${pendingAmount.toFixed(0)}` : "No pending commission"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
