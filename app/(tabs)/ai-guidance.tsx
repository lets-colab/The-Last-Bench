import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { BenchLoader } from "@/components/bench-loader";

type GuideKey = "sayem" | "fahim" | "erfan";

// Display copy only — the real system prompts/grounding rules live server-side
// in server/routers.ts (AI_GUIDES). Real people: co-founders of Last Bench.
const GUIDES: Record<GuideKey, { name: string; role: string; initials: string; duty: string; placeholder: string }> = {
  sayem: {
    name: "Sayem Ahmed",
    role: "CEO",
    initials: "SA",
    duty: "Runs your whole journey. Tracks every file, every update.",
    placeholder: "Ask about your journey, your tracker, anything…",
  },
  fahim: {
    name: "Fahim Shahbaz",
    role: "COO",
    initials: "FS",
    duty: "Matches you to the right university and career path.",
    placeholder: "Ask which university fits you and why…",
  },
  erfan: {
    name: "Erfan Uddin",
    role: "CBIO",
    initials: "EU",
    duty: "Connects you to the room — knowledge, innovation, people.",
    placeholder: "Ask who to meet, what to join, where to start…",
  },
};

export default function AIGuidesScreen() {
  const { user } = useAuth();
  const colors = useColors();
  // Deep-link handoff: e.g. the Universities screen's "Ask Fahim why" sends
  // { guide: "fahim", q: "Why is <uni> a good match for me?" }.
  const params = useLocalSearchParams<{ guide?: string; q?: string }>();
  const [activeGuide, setActiveGuide] = useState<GuideKey>("sayem");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (params.guide === "sayem" || params.guide === "fahim" || params.guide === "erfan") {
      setActiveGuide(params.guide);
    }
    if (params.q) setDraft(String(params.q));
  }, [params.guide, params.q]);

  const historyQuery = trpc.aiGuidance.getChatHistory.useQuery({ guide: activeGuide }, { enabled: !!user });
  const chatMutation = trpc.aiGuidance.chat.useMutation();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [historyQuery.data, chatMutation.isPending]);

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  const guide = GUIDES[activeGuide];
  const messages = historyQuery.data || [];

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || chatMutation.isPending) return;
    setDraft("");
    await chatMutation.mutateAsync({ message: text, guide: activeGuide });
    void historyQuery.refetch();
  };

  const canSend = !!draft.trim() && !chatMutation.isPending;

  return (
    <ScreenContainer className="p-0">
      <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 16 }}>
        <Text style={{ fontSize: 32, fontWeight: "700", letterSpacing: -0.6, lineHeight: 35, color: colors.foreground }}>
          AI Guides
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 7 }}>
          Three founders. Ask any of them.
        </Text>
      </View>

      {/* Guide selector — avatar pills, per the design */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingBottom: 14 }}
      >
        {(Object.keys(GUIDES) as GuideKey[]).map((key) => {
          const g = GUIDES[key];
          const active = key === activeGuide;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveGuide(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
                minHeight: 44,
                paddingLeft: 7,
                paddingRight: 15,
                borderRadius: 999,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <View
                style={{
                  width: 31,
                  height: 31,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? colors.background : colors.border,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: colors.foreground }}>{g.initials}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: active ? colors.background : colors.foreground }}>
                  {g.name}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    letterSpacing: 0.9,
                    marginTop: 2,
                    color: active ? colors.background : colors.muted,
                  }}
                >
                  {g.role}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* What this guide actually covers */}
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingVertical: 13,
            paddingHorizontal: 15,
          }}
        >
          <Text style={{ fontSize: 12, lineHeight: 19, color: colors.muted }}>{guide.duty}</Text>
        </View>
      </View>

      {/* Chat */}
      <View style={{ flex: 1 }}>
        {historyQuery.isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <BenchLoader />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 16, gap: 11 }}
          >
            {messages.length === 0 && (
              <Text style={{ fontSize: 13.5, color: colors.muted, textAlign: "center", paddingVertical: 28 }}>
                Say hello to {guide.name.split(" ")[0]}&apos;s AI.
              </Text>
            )}
            {messages.map((m) => {
              const isYou = m.role === "user";
              return (
                <View
                  key={m.id}
                  style={{
                    alignSelf: isYou ? "flex-end" : "flex-start",
                    maxWidth: "84%",
                    backgroundColor: isYou ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: isYou ? colors.primary : colors.border,
                    borderRadius: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 15,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 1.1,
                      marginBottom: 6,
                      color: isYou ? colors.background : colors.muted,
                    }}
                  >
                    {isYou ? "YOU" : `${guide.name.split(" ")[0].toUpperCase()} · ${guide.role}`}
                  </Text>
                  <Text
                    style={{ fontSize: 13.5, lineHeight: 21, color: isYou ? colors.background : colors.foreground }}
                  >
                    {m.content}
                  </Text>
                </View>
              );
            })}
            {chatMutation.isPending && (
              <View
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  gap: 5,
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.primary, opacity: 0.3 + i * 0.25 }}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* Composer — pinned, per the design */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 22,
            paddingTop: 12,
            paddingBottom: 14,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={guide.placeholder}
            placeholderTextColor={colors.muted}
            editable={!chatMutation.isPending}
            onSubmitEditing={handleSend}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 999,
              paddingHorizontal: 18,
              fontSize: 13.5,
              color: colors.foreground,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: canSend ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: canSend ? colors.background : colors.muted }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
