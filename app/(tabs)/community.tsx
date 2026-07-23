import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { BenchLoader } from "@/components/bench-loader";

/**
 * Community Tab - Connect with peers and join cohorts
 */
export default function CommunityScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch cohorts
  const cohortsQuery = trpc.cohort.getAll.useQuery();

  const joinCohort = trpc.cohort.join.useMutation({
    onSuccess: (_data, variables) => {
      utils.cohort.getById.invalidate({ cohortId: variables.cohortId });
      router.push(`/cohort/${variables.cohortId}`);
    },
    onError: (e) => Alert.alert("Could not join cohort", e.message),
  });

  // Fetch skills
  const skillsQuery = trpc.skill.getAll.useQuery();

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  if (cohortsQuery.isLoading || skillsQuery.isLoading) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  const cohorts = cohortsQuery.data || [];
  const skills = skillsQuery.data || [];

  // Group skills by category
  const skillsByCategory: Record<string, typeof skills> = {};
  skills.forEach((skill) => {
    const category = skill.category || "Other";
    if (!skillsByCategory[category]) {
      skillsByCategory[category] = [];
    }
    skillsByCategory[category].push(skill);
  });

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Community</Text>
            <Text className="text-base text-muted">Connect, learn, and grow together</Text>
          </View>

          {/* Cohorts Section */}
          {cohorts.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Join a Cohort</Text>
              <Text className="text-sm text-muted">Connect with peers at similar stages</Text>

              {cohorts.map((cohort) => (
                <TouchableOpacity
                  key={cohort.id}
                  onPress={() => router.push(`/cohort/${cohort.id}`)}
                  className="bg-surface rounded-xl p-4 border border-border active:opacity-80 gap-3"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-2">
                      <Text className="text-base font-bold text-foreground">{cohort.name}</Text>
                      {cohort.destination && (
                        <Text className="text-sm text-muted">Destination: {cohort.destination}</Text>
                      )}
                      {cohort.description && (
                        <Text className="text-sm text-muted mt-1">{cohort.description}</Text>
                      )}
                    </View>
                    <Text className="text-lg text-primary">→</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => joinCohort.mutate({ cohortId: cohort.id })}
                    disabled={joinCohort.isPending}
                    className="bg-primary px-4 py-2 rounded-lg active:opacity-80"
                  >
                    <Text className="text-background font-semibold text-center text-sm">Join Cohort</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Skills Section */}
          {Object.keys(skillsByCategory).length > 0 && (
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-lg font-semibold text-foreground">Learn Skills</Text>
                <Text className="text-sm text-muted">Practical lessons to boost your profile</Text>
              </View>

              {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                <View key={category} className="gap-3">
                  <Text className="text-base font-semibold text-foreground">{category}</Text>

                  {categorySkills.map((skill) => (
                    <TouchableOpacity
                      key={skill.id}
                      className="bg-surface rounded-lg p-4 border border-border active:opacity-80 gap-2"
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1 gap-1">
                          <Text className="text-base font-semibold text-foreground">{skill.title}</Text>
                          {skill.description && (
                            <Text className="text-sm text-muted">{skill.description}</Text>
                          )}
                          <View className="flex-row items-center gap-2 mt-2">
                            {skill.duration && (
                              <Text className="text-xs text-muted">{skill.duration}</Text>
                            )}
                            {skill.difficulty && (
                              <Text className="text-xs text-muted">• {skill.difficulty}</Text>
                            )}
                          </View>
                        </View>
                        <Text className="text-lg text-muted">→</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {cohorts.length === 0 && Object.keys(skillsByCategory).length === 0 && (
            <View className="flex-1 justify-center items-center gap-4">
              <Text className="text-lg font-semibold text-foreground">Community Coming Soon</Text>
              <Text className="text-sm text-muted text-center">
                Cohorts and skills will be available soon. Check back later!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
