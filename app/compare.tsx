import { useState } from "react";
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

type University = {
  name: string;
  shortName: string;
  location: string;
  type: string;
  programs: string[];
};

const MAX_COMPARE = 3;

function CompareRow({ label, values }: { label: string; values: (string | number)[] }) {
  return (
    <View className="border-b border-border">
      <View className="px-4 pt-3 pb-1">
        <Text className="text-[10px] font-semibold text-muted uppercase">{label}</Text>
      </View>
      <View className="flex-row px-4 pb-3 gap-3">
        {values.map((v, i) => (
          <Text key={i} className="flex-1 text-sm text-foreground leading-snug">
            {v}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  const universitiesQuery = trpc.university.getAll.useQuery();
  const universities = universitiesQuery.data;
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = async (shortName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((current) =>
      current.includes(shortName)
        ? current.filter((s) => s !== shortName)
        : current.length >= MAX_COMPARE
          ? current
          : [...current, shortName]
    );
  };

  if (universitiesQuery.isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  if (universitiesQuery.isError) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-4xl">↻</Text>
        <Text className="text-xl font-bold text-foreground">Comparison unavailable</Text>
        <Text className="text-sm text-muted text-center">
          We could not load the university directory. Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => void universitiesQuery.refetch()}
          className="bg-primary rounded-lg px-5 py-3"
        >
          <Text className="text-background font-bold">Retry</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const all = (universities ?? []) as University[];
  const picked = all.filter((u) => selected.includes(u.shortName));

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-8 pb-4 gap-2 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary text-lg">←</Text>
          </TouchableOpacity>
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">Compare</Text>
            <Text className="text-sm text-muted">Pick up to {MAX_COMPARE} universities, side by side</Text>
          </View>
        </View>

        {/* Picker chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6" contentContainerStyle={{ paddingRight: 24, gap: 8 }}>
          {all.map((u) => {
            const active = selected.includes(u.shortName);
            return (
              <TouchableOpacity
                key={u.shortName}
                onPress={() => toggle(u.shortName)}
                className={`px-4 py-2 rounded-full border ${active ? "bg-primary border-primary" : "border-border bg-surface"}`}
              >
                <Text className={`text-sm font-semibold ${active ? "text-white" : "text-foreground"}`}>{u.shortName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {all.length === 0 ? (
          <View className="px-6 pt-10 items-center gap-2">
            <Text className="text-4xl">🏫</Text>
            <Text className="text-base font-semibold text-foreground">No universities available</Text>
            <Text className="text-sm text-muted text-center">
              The comparison directory has no published entries yet.
            </Text>
          </View>
        ) : picked.length < 2 ? (
          <View className="px-6 pt-10 items-center gap-2">
            <Text className="text-4xl">⚖️</Text>
            <Text className="text-sm text-muted text-center">
              Select at least two universities to compare their locations and broad study areas.
            </Text>
          </View>
        ) : (
          <View className="px-6 pt-6">
            <View className="bg-surface border border-border rounded-xl overflow-hidden">
              {/* Header row */}
              <View className="flex-row px-4 py-3 gap-3 bg-primary/5 border-b border-border">
                {picked.map((u) => (
                  <View key={u.shortName} className="flex-1 gap-0.5">
                    <Text className="text-sm font-bold text-foreground">{u.shortName}</Text>
                    <Text className="text-[10px] text-muted">{u.location}</Text>
                  </View>
                ))}
              </View>
              <CompareRow label="Type" values={picked.map((u) => u.type)} />
              <CompareRow label="Location" values={picked.map((u) => u.location)} />
              <CompareRow
                label="Study areas"
                values={picked.map(
                  (u) => u.programs.slice(0, 5).join(", ") + (u.programs.length > 5 ? "…" : ""),
                )}
              />
            </View>
            <Text className="text-[10px] text-muted pt-3 leading-relaxed">
              This is a discovery view, not an eligibility or outcome prediction. Check current programmes,
              fees, entry requirements, and deadlines on each university&apos;s official website.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
