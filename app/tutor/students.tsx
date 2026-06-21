import { ScrollView, Text, View, ActivityIndicator, RefreshControl } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  profile_assessment: "Profile Assessment",
  document_collection: "Documents",
  application_submitted: "Applied",
  under_review: "Under Review",
  conditional_offer: "Conditional Offer",
  offer_received: "Offer Received",
  visa_preparation: "Visa Prep",
  visa_applied: "Visa Applied",
  visa_approved: "Visa Approved",
  enrolled: "Enrolled",
};

function stageColor(status: string) {
  if (status === "enrolled" || status === "visa_approved") return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
  if (status === "offer_received" || status === "conditional_offer") return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
  if (status === "visa_preparation" || status === "visa_applied") return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300";
  return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
}

export default function TutorStudentsScreen() {
  const router = useRouter();
  const { data: referredStudents, isLoading, refetch, isRefetching } = trpc.tutor.getReferredStudents.useQuery();

  if (isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

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
            <Text className="text-3xl font-bold text-foreground">Referred Students</Text>
            <Text className="text-sm text-muted">{referredStudents?.length ?? 0} total referrals</Text>
          </View>
        </View>

        <View className="px-6 pb-12 gap-3">
          {!referredStudents || referredStudents.length === 0 ? (
            <View className="bg-surface border border-border rounded-xl p-8 items-center gap-3">
              <Text className="text-4xl">🎓</Text>
              <Text className="text-base font-bold text-foreground">No referrals yet</Text>
              <Text className="text-sm text-muted text-center leading-relaxed">
                Share your referral code with students to see them here
              </Text>
            </View>
          ) : (
            referredStudents.map((referral: any, index: number) => {
              const colorClass = stageColor(referral.commissionStatus);
              return (
                <View key={referral.id} className="bg-surface border border-border rounded-xl p-4 gap-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                      <Text className="text-primary font-bold text-base">#{index + 1}</Text>
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-base font-semibold text-foreground">Student {referral.studentId}</Text>
                      <Text className="text-xs text-muted">
                        Referred {referral.createdAt ? new Date(referral.createdAt).toLocaleDateString() : "—"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="gap-1">
                      <Text className="text-xs text-muted font-semibold">COMMISSION STATUS</Text>
                      <View className={`self-start px-3 py-1 rounded-full ${colorClass.split(" ").slice(0, 2).join(" ")}`}>
                        <Text className={`text-xs font-bold capitalize ${colorClass.split(" ").slice(2).join(" ")}`}>
                          {referral.commissionStatus}
                        </Text>
                      </View>
                    </View>
                    {referral.commissionAmount && parseFloat(referral.commissionAmount) > 0 && (
                      <View className="items-end gap-1">
                        <Text className="text-xs text-muted font-semibold">COMMISSION</Text>
                        <Text className="text-base font-bold text-foreground">৳{parseFloat(referral.commissionAmount).toFixed(0)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
