import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { useState, useEffect, useRef } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { BenchLoader } from "@/components/bench-loader";

type GuideKey = "sayem" | "fahim" | "erfan";

// Display copy only — the real system prompts/grounding rules live server-side
// in server/routers.ts (AI_GUIDES). Real people: co-founders of Last Bench.
const GUIDES: Record<GuideKey, { name: string; tag: string; duty: string; placeholder: string }> = {
  sayem: {
    name: "Sayem Ahmed",
    tag: "THE MAIN AI · CEO",
    duty: "Runs your whole journey. Tracks every file, every update.",
    placeholder: "Ask about your journey, your tracker, anything…",
  },
  fahim: {
    name: "Fahim Shahbaz",
    tag: "CAREER GUIDE AI",
    duty: "Matches you to the right university and career path.",
    placeholder: "Ask which university fits you and why…",
  },
  erfan: {
    name: "Erfan Uddin",
    tag: "COMMUNITY AI",
    duty: "Connects you to the room — knowledge, innovation, people.",
    placeholder: "Ask who to meet, what to join, where to start…",
  },
};

const CINE = {
  bg: "#04140B",
  panel: "rgba(5,16,10,.7)",
  border: "rgba(0,200,83,.25)",
  borderActive: "#00E676",
  green: "#00C853",
  brightGreen: "#00E676",
  amber: "#FFB300",
  text: "#EAF4EC",
  dim: "rgba(234,244,236,.6)",
};

export default function AIGuidesScreen() {
  const { user } = useAuth();
  const [activeGuide, setActiveGuide] = useState<GuideKey>("sayem");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const historyQuery = trpc.aiGuidance.getChatHistory.useQuery(
    { guide: activeGuide },
    { enabled: !!user }
  );
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

  return (
    <ScreenContainer className="p-0" style={{ backgroundColor: CINE.bg }}>
      <View className="px-6 pt-8 pb-4 gap-1">
        <Text style={{ fontFamily: "Anton_400Regular", letterSpacing: 1 }} className="text-3xl text-white">
          THREE GUIDES, ONE BENCH.
        </Text>
        <Text style={{ color: CINE.dim }} className="text-sm">
          Sayem, Fahim and Erfan each trained an AI on everything they know. Pick one and ask.
        </Text>
      </View>

      {/* Guide selector */}
      <View className="flex-row px-4 gap-2 pb-3">
        {(Object.keys(GUIDES) as GuideKey[]).map((key) => {
          const g = GUIDES[key];
          const active = key === activeGuide;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveGuide(key)}
              className="flex-1 rounded-2xl p-3 gap-1"
              style={{
                backgroundColor: active ? "rgba(0,200,83,.12)" : CINE.panel,
                borderWidth: 1,
                borderColor: active ? CINE.borderActive : CINE.border,
              }}
            >
              <Text className="text-white font-bold text-xs" numberOfLines={1}>
                {g.name}
              </Text>
              <Text style={{ color: CINE.brightGreen, letterSpacing: 1 }} className="text-[8px] font-bold" numberOfLines={1}>
                {g.tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active guide's duty line */}
      <View className="px-6 pb-3">
        <Text style={{ color: CINE.dim }} className="text-xs leading-relaxed">
          {guide.duty}
        </Text>
      </View>

      {/* Chat */}
      <View
        className="flex-1 mx-4 mb-4 rounded-2xl overflow-hidden"
        style={{ borderWidth: 1, borderColor: CINE.border, backgroundColor: CINE.panel }}
      >
        {historyQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <BenchLoader />
          </View>
        ) : (
          <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
            {messages.length === 0 && (
              <Text style={{ color: CINE.dim }} className="text-sm text-center py-8">
                Say hello to {guide.name.split(" ")[0]}'s AI.
              </Text>
            )}
            {messages.map((m) => {
              const isYou = m.role === "user";
              return (
                <View key={m.id} style={{ alignSelf: isYou ? "flex-end" : "flex-start", maxWidth: "82%", gap: 4 }}>
                  <Text
                    style={{ color: "rgba(234,244,236,.4)", letterSpacing: 1.5, alignSelf: isYou ? "flex-end" : "flex-start" }}
                    className="text-[8px] font-bold"
                  >
                    {isYou ? "YOU" : guide.tag}
                  </Text>
                  <View
                    className="rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor: isYou ? CINE.green : "rgba(255,255,255,.05)",
                      borderWidth: 1,
                      borderColor: isYou ? CINE.green : CINE.border,
                    }}
                  >
                    <Text
                      style={{ color: isYou ? "#04140b" : "rgba(234,244,236,.9)" }}
                      className="text-sm leading-relaxed"
                    >
                      {m.content}
                    </Text>
                  </View>
                </View>
              );
            })}
            {chatMutation.isPending && (
              <View style={{ alignSelf: "flex-start" }}>
                <View
                  className="rounded-2xl px-4 py-3"
                  style={{ backgroundColor: "rgba(255,255,255,.05)", borderWidth: 1, borderColor: CINE.border }}
                >
                  <Text style={{ color: CINE.brightGreen, letterSpacing: 4 }} className="text-sm">
                    •••
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input */}
        <View
          className="flex-row items-center gap-2 px-4 py-3"
          style={{ borderTopWidth: 1, borderTopColor: CINE.border }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={guide.placeholder}
            placeholderTextColor="rgba(234,244,236,.38)"
            editable={!chatMutation.isPending}
            onSubmitEditing={handleSend}
            className="flex-1 rounded-full px-4 py-3 text-white text-sm"
            style={{ backgroundColor: "rgba(255,255,255,.06)", borderWidth: 1, borderColor: "rgba(255,255,255,.16)" }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!draft.trim() || chatMutation.isPending}
            className="rounded-full px-5 py-3"
            style={{ backgroundColor: draft.trim() && !chatMutation.isPending ? CINE.green : "rgba(255,255,255,.1)" }}
          >
            <Text style={{ color: draft.trim() && !chatMutation.isPending ? "#04140b" : CINE.dim }} className="font-bold text-sm">
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
