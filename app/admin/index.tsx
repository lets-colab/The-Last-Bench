import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import * as Haptics from "expo-haptics";

function NavCard({ emoji, title, subtitle, onPress }: { emoji: string; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.7}
      className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2 active:opacity-80"
    >
      <Text className="text-2xl">{emoji}</Text>
      <Text className="text-sm font-bold text-foreground">{title}</Text>
      <Text className="text-xs text-muted">{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: allApplications, isLoading: loadingApps, refetch, isRefetching } = trpc.admin.getAllApplications.useQuery();
  const { data: allStudents, isLoading: loadingStudents } = trpc.admin.getAllStudents.useQuery();
  const { data: allTutors, isLoading: loadingTutors } = trpc.admin.getAllTutors.useQuery();

  if (!user) return null;

  const isLoading = loadingApps || loadingStudents || loadingTutors;

  const appsByStage = (allApplications ?? []).reduce((acc: Record<string, number>, app: any) => {
    const s = app.applicationStatus ?? "unknown";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const activeApps = (allApplications ?? []).filter((a: any) => !["enrolled", "rejected"].includes(a.applicationStatus)).length;

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-6 pt-8 pb-6 gap-1">
          <Text className="text-sm font-semibold text-muted">ADMIN</Text>
          <Text className="text-4xl font-bold text-foreground">Operations</Text>
          <Text className="text-sm text-muted">Welcome back, {user.name?.split(" ")[0]}</Text>
        </View>

        {/* Overview Stats */}
        <View className="px-6 pb-6 gap-3">
          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
                  <Text className="text-xs text-muted font-semibold">STUDENTS</Text>
                  <Text className="text-3xl font-bold text-foreground">{allStudents?.length ?? 0}</Text>
                  <Text className="text-xs text-muted">total enrolled</Text>
                </View>
                <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
                  <Text className="text-xs text-muted font-semibold">APPLICATIONS</Text>
                  <Text className="text-3xl font-bold text-foreground">{allApplications?.length ?? 0}</Text>
                  <Text className="text-xs text-primary text-xs">{activeApps} active</Text>
                </View>
                <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-1">
                  <Text className="text-xs text-muted font-semibold">TUTORS</Text>
                  <Text className="text-3xl font-bold text-foreground">{allTutors?.length ?? 0}</Text>
                  <Text className="text-xs text-muted">partners</Text>
                </View>
              </View>

              {/* Stage breakdown */}
              {Object.keys(appsByStage).length > 0 && (
                <View className="bg-surface border border-border rounded-xl p-4 gap-3">
                  <Text className="text-sm font-bold text-foreground">Pipeline Breakdown</Text>
                  {Object.entries(appsByStage)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([stage, count]) => (
                      <View key={stage} className="flex-row items-center gap-3">
                        <View className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                          <View
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, ((count as number) / (allApplications?.length ?? 1)) * 100)}%` }}
                          />
                        </View>
                        <Text className="text-xs text-muted w-5 text-right">{count as number}</Text>
                        <Text className="text-xs text-foreground w-32 capitalize">{stage.replace(/_/g, " ")}</Text>
                      </View>
                    ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Nav Cards */}
        <View className="px-6 pb-6 gap-3">
          <Text className="text-lg font-bold text-foreground">Manage</Text>
          <View className="flex-row gap-3">
            <NavCard emoji="📋" title="Applications" subtitle="Update statuses" onPress={() => router.push("/admin/applications")} />
            <NavCard emoji="👤" title="Students" subtitle="Manage profiles" onPress={() => router.push("/admin/students")} />
          </View>
          <View className="flex-row gap-3">
            <NavCard emoji="🤝" title="Tutors" subtitle="Commission & payouts" onPress={() => router.push("/admin/tutors")} />
            <NavCard emoji="📚" title="Skills" subtitle="Create lessons" onPress={() => router.push("/admin/skills")} />
          </View>
        </View>

        {/* Recent Applications needing action */}
        <View className="px-6 pb-12 gap-3">
          <Text className="text-lg font-bold text-foreground">Needs Attention</Text>
          {(allApplications ?? [])
            .filter((a: any) => a.applicationStatus === "inquiry" || a.applicationStatus === "document_collection")
            .slice(0, 3)
            .map((app: any) => (
              <TouchableOpacity
                key={app.id}
                onPress={() => router.push("/admin/applications")}
                activeOpacity={0.7}
                className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
              >
                <View className="gap-1">
                  <Text className="text-sm font-semibold text-foreground">{app.universityName}</Text>
                  <Text className="text-xs text-muted capitalize">{(app.applicationStatus ?? "").replace(/_/g, " ")}</Text>
                </View>
                <Text className="text-primary">→</Text>
              </TouchableOpacity>
            ))}
          {(allApplications ?? []).filter((a: any) => a.applicationStatus === "inquiry" || a.applicationStatus === "document_collection").length === 0 && (
            <View className="bg-surface border border-border rounded-xl p-4">
              <Text className="text-sm text-muted text-center">All caught up!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
