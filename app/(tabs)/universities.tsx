import { ScrollView, Text, View, TouchableOpacity, Modal, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
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

/**
 * The design shows a qualitative fit band rather than a raw percentage. The
 * band is derived from the same deterministic score (40–99) computed by
 * scoreUniversityMatch() — a label is honest about precision in a way a
 * two-digit number is not, especially before a student has filled in a GPA.
 */
function fitBand(score: number): { label: string; strong: boolean } {
  if (score >= 85) return { label: "STRONG FIT", strong: true };
  if (score >= 70) return { label: "GOOD FIT", strong: false };
  return { label: "WORTH EXPLORING", strong: false };
}

const TYPE_FILTERS = ["all", "public", "private"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

export default function UniversitiesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [openCampus, setOpenCampus] = useState<string | null>(null);

  const universitiesQuery = trpc.university.getAll.useQuery();
  const studentQuery = trpc.student.getProfile.useQuery(undefined, { enabled: !!user });

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  const student = studentQuery.data;
  const universities = (universitiesQuery.data || []) as unknown as Uni[];

  // Real, deterministic match score per university, best fit first.
  const ranked = universities
    .map((u) => ({ uni: u, match: scoreUniversityMatch({ gpa: student?.gpa, fieldOfInterest: student?.fieldOfInterest }, u) }))
    .sort((a, b) => b.match.score - a.match.score)
    .filter(({ uni }) => filter === "all" || (uni.type || "").toLowerCase() === filter);

  const open = ranked.find(({ uni }) => uni.shortName === openCampus);

  const askFahim = (uni: Uni) => {
    router.push({
      pathname: "/ai-guidance",
      params: { guide: "fahim", q: `Why is ${uni.name} a good match for me?` },
    });
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 }}>
          <Text
            style={{ fontSize: 32, fontWeight: "700", letterSpacing: -0.6, lineHeight: 35, color: colors.foreground }}
          >
            Universities
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 7 }}>
            {universities.length} campuses, ranked against your profile
          </Text>
        </View>

        {/* Type filter — mirrors the design's pill row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingBottom: 16 }}
        >
          {TYPE_FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 18,
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: active ? colors.primary : "transparent",
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? colors.background : colors.muted,
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {universitiesQuery.isLoading ? (
          <BenchLoader />
        ) : (
          <View style={{ paddingHorizontal: 22, paddingBottom: 26, gap: 12 }}>
            {ranked.map(({ uni, match }) => {
              const fit = fitBand(match.score);
              return (
                <TouchableOpacity
                  key={uni.shortName}
                  activeOpacity={0.85}
                  onPress={() => setOpenCampus(uni.shortName)}
                  accessibilityRole="button"
                  accessibilityLabel={`${uni.name}, ${uni.location}. ${fit.label}. View campus.`}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 17,
                    gap: 9,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>{uni.shortName}</Text>
                    <Text style={{ fontSize: 11.5, fontWeight: "600", letterSpacing: 1.1, color: colors.muted }}>
                      {(uni.type || "").toUpperCase()}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors.foreground, lineHeight: 18 }}>
                      {uni.name}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: 3 }}>{uni.location}</Text>
                  </View>

                  {!!uni.programs?.length && (
                    <Text style={{ fontSize: 12.5, lineHeight: 19, color: colors.muted }}>
                      {uni.programs.slice(0, 4).join(" · ")}
                    </Text>
                  )}

                  {/* The one real, explainable line from the match computation. */}
                  {match.reasons[0] && (
                    <Text style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}>{match.reasons[0]}</Text>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingTop: 11,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: "600",
                        letterSpacing: 0.9,
                        color: fit.strong ? colors.foreground : colors.muted,
                      }}
                    >
                      {fit.label}
                    </Text>
                    <Text style={{ fontSize: 11.5, fontWeight: "700", color: colors.foreground }}>
                      {CAMPUS_COORDS[uni.shortName] ? "VIEW 360 →" : "VIEW MAP →"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                padding: 15,
              }}
            >
              <Text style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>
                Programme lists come from Last Bench&apos;s own research. Confirm current intakes, fees and entry
                requirements with each university directly.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Campus sheet — the design promotes this from an inline expand to a bottom sheet */}
      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpenCampus(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(17,17,17,.55)", justifyContent: "flex-end" }}
          onPress={() => setOpenCampus(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              maxHeight: "88%",
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 22,
              paddingTop: 18,
              paddingBottom: 32,
            }}
          >
            <View
              style={{
                width: 42,
                height: 4,
                borderRadius: 999,
                backgroundColor: colors.border,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            {open && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 11.5, fontWeight: "700", letterSpacing: 1.6, color: colors.muted, marginBottom: 8 }}>
                  {CAMPUS_COORDS[open.uni.shortName] ? "CAMPUS 360" : "CAMPUS MAP"}
                </Text>
                <Text style={{ fontSize: 21, fontWeight: "700", color: colors.foreground, lineHeight: 26 }}>
                  {open.uni.name}
                </Text>
                <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: 5 }}>
                  {open.uni.location} · {open.uni.type}
                </Text>

                <View style={{ marginTop: 15 }}>
                  <CampusView
                    streetView={CAMPUS_COORDS[open.uni.shortName]}
                    query={`${open.uni.name}, ${open.uni.location}`}
                    title={open.uni.name}
                    onClose={() => setOpenCampus(null)}
                  />
                </View>

                {!CAMPUS_COORDS[open.uni.shortName] && (
                  <Text style={{ fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 11 }}>
                    No verified Street View position for this campus yet, so this is a satellite map of the area rather
                    than a walkable 360° view.
                  </Text>
                )}

                {!!open.uni.programs?.length && (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 14,
                      padding: 15,
                      marginTop: 15,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: "600", letterSpacing: 1.1, color: colors.muted, marginBottom: 7 }}>
                      PROGRAMMES
                    </Text>
                    <Text style={{ fontSize: 13.5, lineHeight: 21, color: colors.foreground }}>
                      {open.uni.programs.join(" · ")}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 10, marginTop: 15, flexWrap: "wrap" }}>
                  <TouchableOpacity
                    onPress={() => {
                      setOpenCampus(null);
                      askFahim(open.uni);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 130,
                      minHeight: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 10,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.background }}>Ask Fahim why</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setOpenCampus(null)}
                    style={{
                      flex: 1,
                      minWidth: 130,
                      minHeight: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 10,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.foreground }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
