import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { BenchLoader } from "@/components/bench-loader";
import { CampusView } from "@/components/campus-view";
import { scoreUniversityMatch } from "@/shared/university-match";

// Verified Street View coordinates (lat, lng, heading). Only campuses listed
// here get a true 360° walk; every other university falls back to a satellite
// map by place name — no fabricated locations.
const CAMPUS_COORDS: Record<string, { lat: number; lng: number; heading: number }> = {
  UM: { lat: 3.1213, lng: 101.6559, heading: 40 },
  UTM: { lat: 1.5594, lng: 103.6381, heading: 200 },
  APU: { lat: 3.0498, lng: 101.7005, heading: 120 },
  "Taylor's": { lat: 3.0641, lng: 101.6168, heading: 90 },
  UCSI: { lat: 3.0837, lng: 101.7333, heading: 60 },
};

interface Uni {
  name: string;
  shortName: string;
  location: string;
  type: string;
  programs?: string[];
  gpaRequirement?: { min?: string; typical?: string; outOf?: string };
  estimatedCostUSD?: { tuitionPerYear?: number; totalPerYear?: number };
  visaSuccessRateBD?: number;
  ieltsRequired?: string | number;
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
  const studentQuery = trpc.student.getProfile.useQuery(undefined, { enabled: !!user });

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center" style={{ backgroundColor: CINE.bg }}>
        <Text className="text-xl font-bold text-white">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  const student = studentQuery.data;
  const universities = (universitiesQuery.data || []) as unknown as Uni[];

  // Real, deterministic match score per university, best fit first.
  const ranked = universities
    .map((u) => ({ uni: u, match: scoreUniversityMatch({ gpa: student?.gpa, fieldOfInterest: student?.fieldOfInterest }, u) }))
    .sort((a, b) => b.match.score - a.match.score);

  const askFahim = (uni: Uni) => {
    router.push({
      pathname: "/ai-guidance",
      params: { guide: "fahim", q: `Why is ${uni.name} a good match for me?` },
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
            Scored against your grades and field. Walk any campus in 360° before you decide.
          </Text>
        </View>

        {universitiesQuery.isLoading ? (
          <BenchLoader />
        ) : (
          <View className="px-4 gap-4">
            {ranked.map(({ uni, match }) => {
              const coords = CAMPUS_COORDS[uni.shortName];
              const tuition = uni.estimatedCostUSD?.tuitionPerYear;
              const matchColor = match.score >= 90 ? CINE.brightGreen : CINE.amber;
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
                    <View className="items-end">
                      <Text style={{ fontFamily: "Anton_400Regular", color: matchColor }} className="text-2xl leading-none">
                        {match.score}%
                      </Text>
                      <Text style={{ color: "rgba(234,244,236,.45)", letterSpacing: 2 }} className="text-[8px] font-bold">
                        FAHIM'S MATCH
                      </Text>
                    </View>
                  </View>

                  <View>
                    <Text className="text-base font-bold text-white leading-tight">{uni.name}</Text>
                    <Text style={{ color: CINE.dim, letterSpacing: 1 }} className="text-[11px] mt-1">
                      {uni.location} · {uni.type?.toUpperCase()}
                    </Text>
                  </View>

                  <View className="flex-row gap-4 flex-wrap">
                    {tuition != null && (
                      <Text style={{ color: "rgba(234,244,236,.7)" }} className="text-[11px]">
                        <Text className="text-white font-bold">${tuition.toLocaleString()}</Text>/yr
                      </Text>
                    )}
                    {uni.visaSuccessRateBD != null && (
                      <Text style={{ color: "rgba(234,244,236,.7)" }} className="text-[11px]">
                        VISA <Text className="text-white font-bold">{uni.visaSuccessRateBD}%</Text>
                      </Text>
                    )}
                    {uni.ieltsRequired != null && (
                      <Text style={{ color: "rgba(234,244,236,.7)" }} className="text-[11px]">
                        IELTS <Text className="text-white font-bold">{String(uni.ieltsRequired)}</Text>
                      </Text>
                    )}
                  </View>

                  {/* Top reason from the real match computation */}
                  {match.reasons[0] && (
                    <Text style={{ color: CINE.dim }} className="text-[11px] leading-relaxed">
                      {match.reasons[0]}
                    </Text>
                  )}

                  <View className="flex-row gap-2 flex-wrap">
                    <TouchableOpacity
                      onPress={() => setOpenCampus(isOpen ? null : uni.shortName)}
                      className="flex-1 rounded-full py-2.5 items-center"
                      style={{ minWidth: 110, backgroundColor: "rgba(0,200,83,.12)", borderWidth: 1, borderColor: "rgba(0,200,83,.4)" }}
                    >
                      <Text style={{ color: CINE.brightGreen }} className="text-[11.5px] font-bold">
                        {coords ? "Campus 360°" : "Campus map"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => askFahim(uni)}
                      className="flex-1 rounded-full py-2.5 items-center"
                      style={{ minWidth: 110, borderWidth: 1, borderColor: "rgba(255,255,255,.25)" }}
                    >
                      <Text className="text-white text-[11.5px] font-bold">Ask Fahim why</Text>
                    </TouchableOpacity>
                  </View>

                  {isOpen && (
                    <CampusView
                      streetView={coords}
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
