import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { BenchLoader } from "@/components/bench-loader";
import { CampusView } from "@/components/campus-view";

interface Uni {
  name: string;
  shortName: string;
  location: string;
  type: string;
  programs?: string[];
}

const CINE = {
  bg: "#04140B",
  panel: "rgba(5,16,10,.7)",
  border: "rgba(0,200,83,.22)",
  green: "#00C853",
  brightGreen: "#00E676",
  amber: "#FFB300",
  dim: "rgba(234,244,236,.6)",
};

export default function UniversitiesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [openCampus, setOpenCampus] = useState<string | null>(null);

  const universitiesQuery = trpc.university.getAll.useQuery();
  const universities = (universitiesQuery.data || []) as unknown as Uni[];
  const directory = [...universities].sort((a, b) => a.name.localeCompare(b.name));

  const prepareQuestions = (uni: Uni) => {
    router.push({
      pathname: "/ai-guidance",
      params: {
        guide: "fahim",
        q: `What should I verify when researching ${uni.name}?`,
      },
    });
  };

  return (
    <ScreenContainer className="p-0" style={{ backgroundColor: CINE.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-8 pb-4 gap-1">
          <Text style={{ color: CINE.brightGreen, letterSpacing: 3 }} className="text-[10px] font-bold">
            DISCOVER — {universities.length} CAMPUSES
          </Text>
          <Text style={{ fontFamily: "Anton_400Regular", letterSpacing: 1 }} className="text-3xl text-white">
            CHOOSE YOUR CITY.
          </Text>
          <Text style={{ color: CINE.dim }} className="text-sm leading-relaxed">
            Explore names, locations, and broad study areas. Verify current programmes, fees, and entry
            requirements with official sources before applying.
          </Text>
        </View>

        {universitiesQuery.isLoading ? (
          <BenchLoader />
        ) : universitiesQuery.isError ? (
          <View className="mx-4 rounded-2xl p-6 gap-3" style={{ backgroundColor: CINE.panel, borderWidth: 1, borderColor: CINE.border }}>
            <Text className="text-white text-base font-bold">Directory unavailable</Text>
            <Text style={{ color: CINE.dim }} className="text-sm leading-relaxed">
              We could not load the university directory. Check your connection and try again.
            </Text>
            <TouchableOpacity
              onPress={() => void universitiesQuery.refetch()}
              className="self-start rounded-full px-5 py-3"
              style={{ backgroundColor: CINE.green }}
            >
              <Text style={{ color: "#04140b" }} className="font-bold text-sm">
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-4 gap-4">
            {directory.map((uni) => {
              const isOpen = openCampus === uni.shortName;
              return (
                <View
                  key={uni.shortName}
                  className="rounded-2xl p-5 gap-3"
                  style={{ backgroundColor: CINE.panel, borderWidth: 1, borderColor: isOpen ? CINE.brightGreen : CINE.border }}
                >
                  <View className="flex-row justify-between items-start gap-2">
                    <Text
                      style={{ fontFamily: "Anton_400Regular", color: "#04140b", backgroundColor: CINE.brightGreen }}
                      className="text-base rounded-lg px-2.5 py-1.5"
                    >
                      {uni.shortName}
                    </Text>
                    <Text style={{ color: CINE.amber, letterSpacing: 2 }} className="text-[8px] font-bold">
                      DIRECTORY OVERVIEW
                    </Text>
                  </View>

                  <View>
                    <Text className="text-base font-bold text-white leading-tight">{uni.name}</Text>
                    <Text style={{ color: CINE.dim, letterSpacing: 1 }} className="text-[11px] mt-1">
                      {uni.location} · {uni.type?.toUpperCase()}
                    </Text>
                  </View>

                  {uni.programs && uni.programs.length > 0 && (
                    <Text style={{ color: CINE.dim }} className="text-[11px] leading-relaxed">
                      Study areas listed in our directory: {uni.programs.slice(0, 4).join(" · ")}
                    </Text>
                  )}

                  <View className="flex-row gap-2 flex-wrap">
                    <TouchableOpacity
                      onPress={() => setOpenCampus(isOpen ? null : uni.shortName)}
                      className="flex-1 rounded-full py-2.5 items-center"
                      style={{ minWidth: 110, backgroundColor: "rgba(0,200,83,.12)", borderWidth: 1, borderColor: "rgba(0,200,83,.4)" }}
                    >
                      <Text style={{ color: CINE.brightGreen }} className="text-[11.5px] font-bold">
                        Campus map
                      </Text>
                    </TouchableOpacity>
                    {user && (
                      <TouchableOpacity
                        onPress={() => prepareQuestions(uni)}
                        className="flex-1 rounded-full py-2.5 items-center"
                        style={{ minWidth: 110, borderWidth: 1, borderColor: "rgba(255,255,255,.25)" }}
                      >
                        <Text className="text-white text-[11.5px] font-bold">Prepare questions</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {isOpen && (
                    <CampusView
                      query={`${uni.name}, ${uni.location}`}
                      title={uni.name}
                      onClose={() => setOpenCampus(null)}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
