import { ScrollView, Text, View, TouchableOpacity, Share, Alert, ActivityIndicator, RefreshControl, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

export default function TutorDashboardScreen() {
  const router = useRouter();

  const { data: tutorProfile, isLoading, refetch, isRefetching } = trpc.tutor.getProfile.useQuery();
  const { data: commission } = trpc.tutor.getCommissionSummary.useQuery(undefined, { enabled: !!tutorProfile });
  const { data: referredStudents } = trpc.tutor.getReferredStudents.useQuery(undefined, { enabled: !!tutorProfile });

  const handleCopyCode = async () => {
    if (!tutorProfile?.referralCode) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === "web" && navigator?.clipboard) {
      await navigator.clipboard.writeText(tutorProfile.referralCode);
      Alert.alert("Copied!", "Referral code copied to clipboard.");
    } else {
      await Share.share({ message: tutorProfile.referralCode });
    }
  };

  const handleShare = async () => {
    if (!tutorProfile?.referralCode) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Share.share({
      message: `Join The Last Bench and get expert guidance for your study abroad journey! Use my referral code: ${tutorProfile.referralCode}\n\nDownload the app and enter this code during sign-up.`,
    });
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  if (!tutorProfile) {
    return (
      <ScreenContainer className="p-0">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-8 pb-6 gap-2">
            <Text className="text-4xl font-bold text-foreground">Partner Portal</Text>
            <Text className="text-base text-muted">Help students reach their dreams — and earn doing it</Text>
          </View>

          <View className="px-6 pb-12 gap-6">
            <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 gap-4">
              <Text className="text-2xl font-bold text-green-900 dark:text-green-100">💰 Earn with Every Student</Text>
              <Text className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                Earn 5% commission for every student you refer who successfully enrolls in a program. Share your unique code with students — no cap on earnings.
              </Text>
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <View className="w-2 h-2 rounded-full bg-green-600" />
                  <Text className="text-sm text-green-800 dark:text-green-200">Free to join, no setup fees</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="w-2 h-2 rounded-full bg-green-600" />
                  <Text className="text-sm text-green-800 dark:text-green-200">Real-time tracking of referrals</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="w-2 h-2 rounded-full bg-green-600" />
                  <Text className="text-sm text-green-800 dark:text-green-200">Payout via bKash or Nagad</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/tutor/onboard")}
              className="bg-primary rounded-xl py-4 items-center active:opacity-80"
            >
              <Text className="text-white font-bold text-base">Become a Partner</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  const totalEarned = parseFloat(tutorProfile.totalEarned ?? "0");
  const pending = parseFloat((commission?.pendingCommission as string) ?? "0");

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-6 pt-8 pb-4 gap-1">
          <Text className="text-sm font-semibold text-muted">PARTNER DASHBOARD</Text>
          <Text className="text-3xl font-bold text-foreground">{tutorProfile.centerName}</Text>
          <Text className="text-sm text-muted">{tutorProfile.location}</Text>
        </View>

        {/* Stats Row */}
        <View className="px-6 pb-6 gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
              <Text className="text-xs text-muted font-semibold">REFERRED</Text>
              <Text className="text-3xl font-bold text-foreground">{tutorProfile.totalReferred ?? 0}</Text>
              <Text className="text-xs text-muted">students</Text>
            </View>
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
              <Text className="text-xs text-muted font-semibold">TOTAL EARNED</Text>
              <Text className="text-3xl font-bold text-foreground">৳{totalEarned.toFixed(0)}</Text>
              <Text className="text-xs text-muted">lifetime</Text>
            </View>
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
              <Text className="text-xs text-muted font-semibold">PENDING</Text>
              <Text className="text-3xl font-bold text-primary">৳{pending.toFixed(0)}</Text>
              <Text className="text-xs text-muted">to collect</Text>
            </View>
          </View>
        </View>

        {/* Referral Code Card */}
        <View className="px-6 pb-6">
          <View className="bg-surface border border-border rounded-2xl p-5 gap-4">
            <Text className="text-sm font-semibold text-muted">YOUR REFERRAL CODE</Text>
            <View className="bg-background border border-border rounded-xl px-5 py-4 items-center">
              <Text className="text-2xl font-bold text-primary tracking-widest">
                {tutorProfile.referralCode}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCopyCode}
                className="flex-1 border border-border rounded-xl py-3 items-center active:opacity-70"
              >
                <Text className="text-foreground font-semibold text-sm">Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                className="flex-1 bg-primary rounded-xl py-3 items-center active:opacity-80"
              >
                <Text className="text-white font-semibold text-sm">Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Referred Students */}
        <View className="px-6 pb-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Referred Students</Text>
            <TouchableOpacity onPress={() => router.push("/tutor/students")}>
              <Text className="text-sm text-primary font-semibold">See all →</Text>
            </TouchableOpacity>
          </View>

          {!referredStudents || referredStudents.length === 0 ? (
            <View className="bg-surface border border-border rounded-xl p-6 items-center gap-2">
              <Text className="text-2xl">🎓</Text>
              <Text className="text-sm font-semibold text-foreground">No referrals yet</Text>
              <Text className="text-xs text-muted text-center">Share your code with students to start earning</Text>
            </View>
          ) : (
            referredStudents.slice(0, 3).map((referral: any) => (
              <View key={referral.id} className="bg-surface border border-border rounded-xl p-4 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-primary font-bold text-sm">S</Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-semibold text-foreground">Student #{referral.studentId}</Text>
                  <Text className="text-xs text-muted capitalize">{referral.commissionStatus}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${
                  referral.commissionStatus === "paid" ? "bg-green-100 dark:bg-green-900/30" :
                  referral.commissionStatus === "earned" ? "bg-blue-100 dark:bg-blue-900/30" :
                  "bg-yellow-100 dark:bg-yellow-900/30"
                }`}>
                  <Text className={`text-xs font-semibold capitalize ${
                    referral.commissionStatus === "paid" ? "text-green-700 dark:text-green-300" :
                    referral.commissionStatus === "earned" ? "text-blue-700 dark:text-blue-300" :
                    "text-yellow-700 dark:text-yellow-300"
                  }`}>
                    {referral.commissionStatus}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Commission CTA */}
        {pending > 0 && (
          <View className="px-6 pb-12">
            <TouchableOpacity
              onPress={() => router.push("/tutor/commission")}
              className="bg-green-600 rounded-xl py-4 items-center active:opacity-80"
            >
              <Text className="text-white font-bold text-base">Request Payout — ৳{pending.toFixed(0)}</Text>
            </TouchableOpacity>
          </View>
        )}
        {pending === 0 && <View className="pb-12" />}
      </ScrollView>
    </ScreenContainer>
  );
}
