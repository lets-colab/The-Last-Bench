import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BenchLoader } from "@/components/bench-loader";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface University {
  name: string;
  shortName: string;
  location: string;
  type: string;
  programs?: string[];
}

const TYPE_FILTERS = ["all", "public", "private"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

export default function UniversitiesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [filter, setFilter] = useState<TypeFilter>("all");

  const universitiesQuery = trpc.university.getAll.useQuery();
  const universities = (universitiesQuery.data ?? []) as unknown as University[];
  const directory = [...universities]
    .filter((university) => filter === "all" || university.type?.toLowerCase() === filter)
    .sort((left, right) => left.name.localeCompare(right.name));

  const prepareQuestions = (university: University) => {
    router.push({
      pathname: "/ai-guidance",
      params: {
        guide: "fahim",
        q: `What should I verify when researching ${university.name}?`,
      },
    });
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <View className="gap-2 px-5 pb-5 pt-6">
          <Text className="text-xs font-bold uppercase tracking-widest text-primary">Research first</Text>
          <Text className="text-3xl font-bold leading-10 text-foreground">Explore universities</Text>
          <Text className="text-base leading-6 text-muted">
            Use this directory to build a shortlist, then verify programmes, fees, intakes, and entry rules with official sources.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          {TYPE_FILTERS.map((type) => {
            const selected = filter === type;
            return (
              <TouchableOpacity
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Show ${type === "all" ? "all" : type} universities`}
                onPress={() => setFilter(type)}
                className={`min-h-11 justify-center rounded-full border px-5 py-2 ${
                  selected ? "border-primary bg-primary" : "border-border bg-surface"
                }`}
              >
                <Text className={`text-sm font-bold capitalize ${selected ? "text-background" : "text-foreground"}`}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {universitiesQuery.isLoading ? (
          <View className="items-center py-16">
            <BenchLoader />
          </View>
        ) : universitiesQuery.isError ? (
          <View className="mx-5 items-center gap-5 rounded-2xl border border-border bg-surface p-6">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <IconSymbol name="graduationcap.fill" size={24} color={colors.primary} />
            </View>
            <View className="gap-2">
              <Text className="text-center text-xl font-bold text-foreground">Directory unavailable</Text>
              <Text className="text-center text-base leading-6 text-muted">
                We could not load the university directory. Check your connection and try again.
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void universitiesQuery.refetch()}
              className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
            >
              <Text className="text-base font-bold text-background">Reload directory</Text>
            </TouchableOpacity>
          </View>
        ) : directory.length === 0 ? (
          <View className="mx-5 items-center gap-3 rounded-2xl border border-border bg-surface p-6">
            <Text className="text-center text-xl font-bold text-foreground">No {filter} universities listed</Text>
            <Text className="text-center text-base leading-6 text-muted">
              Try another filter to continue exploring.
            </Text>
          </View>
        ) : (
          <View className="gap-3 px-5">
            <Text className="text-sm font-bold text-foreground">
              {directory.length} {directory.length === 1 ? "university" : "universities"}
            </Text>
            {directory.map((university) => (
              <View
                key={university.shortName}
                className="gap-4 rounded-2xl border border-border bg-surface p-5"
              >
                <View className="flex-row items-start gap-3">
                  <View className="min-h-11 min-w-11 items-center justify-center rounded-xl bg-primary/10 px-2">
                    <Text className="text-sm font-bold text-primary">{university.shortName}</Text>
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-lg font-bold leading-6 text-foreground">{university.name}</Text>
                    <Text className="text-sm leading-5 text-muted">{university.location}</Text>
                  </View>
                  <View className="rounded-full border border-border px-2.5 py-1.5">
                    <Text className="text-xs font-bold capitalize text-muted">{university.type}</Text>
                  </View>
                </View>

                {university.programs?.length ? (
                  <View className="gap-2 border-t border-border pt-4">
                    <Text className="text-xs font-bold uppercase tracking-widest text-muted">Study areas</Text>
                    <Text className="text-sm leading-6 text-foreground">
                      {university.programs.slice(0, 4).join(" · ")}
                    </Text>
                  </View>
                ) : null}

                <Text className="text-xs leading-5 text-muted">
                  Directory overview only. Confirm all current details before making a decision.
                </Text>

                {user ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Prepare research questions for ${university.name}`}
                    onPress={() => prepareQuestions(university)}
                    className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3"
                  >
                    <Text className="text-base font-bold text-background">Prepare questions</Text>
                    <IconSymbol name="arrow.right" size={18} color={colors.background} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
