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
  gpaRequirement: { min: string; typical: string; outOf: string };
  sscHscGrade: string;
  estimatedCostBDT: { tuitionPerYear: number; livingPerYear: number; totalPerYear: number };
  visaSuccessRateBD: string;
  averageProcessingWeeks: string;
  ieltsRequired: string;
  intakeMonths: string[];
  ranking: string;
  scholarshipAvailable: boolean;
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
  const { data: universities, isLoading } = trpc.university.getAll.useQuery();
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

  if (isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
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

        {picked.length < 2 ? (
          <View className="px-6 pt-10 items-center gap-2">
            <Text className="text-4xl">⚖️</Text>
            <Text className="text-sm text-muted text-center">
              Select at least two universities above to compare costs, requirements, and visa success rates.
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
              <CompareRow label="Ranking" values={picked.map((u) => u.ranking)} />
              <CompareRow
                label="Total cost / year"
                values={picked.map((u) => `৳${(u.estimatedCostBDT.totalPerYear / 100000).toFixed(1)} lakh`)}
              />
              <CompareRow
                label="Tuition / year"
                values={picked.map((u) => `৳${(u.estimatedCostBDT.tuitionPerYear / 100000).toFixed(1)} lakh`)}
              />
              <CompareRow label="Min GPA (of 5.0)" values={picked.map((u) => `${u.gpaRequirement.min} (typical ${u.gpaRequirement.typical})`)} />
              <CompareRow label="SSC/HSC" values={picked.map((u) => u.sscHscGrade)} />
              <CompareRow label="IELTS" values={picked.map((u) => u.ieltsRequired)} />
              <CompareRow label="Visa success (BD)" values={picked.map((u) => u.visaSuccessRateBD)} />
              <CompareRow label="Processing" values={picked.map((u) => `${u.averageProcessingWeeks} weeks`)} />
              <CompareRow label="Intakes" values={picked.map((u) => u.intakeMonths.join(", "))} />
              <CompareRow label="Scholarships" values={picked.map((u) => (u.scholarshipAvailable ? "Available" : "—"))} />
              <CompareRow label="Programs" values={picked.map((u) => u.programs.slice(0, 4).join(", ") + (u.programs.length > 4 ? "…" : ""))} />
            </View>
            <Text className="text-[10px] text-muted pt-3 leading-relaxed">
              Figures come from Last Bench&apos;s verified database — the same one the AI advisor cites. Costs are estimates; confirm with a
              mentor before applying.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
