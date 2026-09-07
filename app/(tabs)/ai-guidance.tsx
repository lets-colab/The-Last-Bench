import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BenchLoader } from "@/components/bench-loader";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type GuideKey = "sayem" | "fahim" | "erfan";

const GUIDES: Record<
  GuideKey,
  { name: string; focus: string; initials: string; duty: string; placeholder: string }
> = {
  sayem: {
    name: "Sayem Ahmed",
    focus: "Journey",
    initials: "SA",
    duty: "Prepare questions about your application journey, tracker, and documents.",
    placeholder: "Ask about your journey…",
  },
  fahim: {
    name: "Fahim Shahbaz",
    focus: "Study & career",
    initials: "FS",
    duty: "Research study areas, universities, comparisons, and career directions.",
    placeholder: "Ask what to research…",
  },
  erfan: {
    name: "Erfan Uddin",
    focus: "Community",
    initials: "EU",
    duty: "Think through peer support, skills, communities, and who to learn from.",
    placeholder: "Ask where to connect…",
  },
};

export default function AIGuidesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ guide?: string; q?: string }>();
  const [activeGuide, setActiveGuide] = useState<GuideKey>("sayem");
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (params.guide === "sayem" || params.guide === "fahim" || params.guide === "erfan") {
      setActiveGuide(params.guide);
    }
    if (params.q) setDraft(String(params.q));
  }, [params.guide, params.q]);

  const historyQuery = trpc.aiGuidance.getChatHistory.useQuery(
    { guide: activeGuide },
    { enabled: !!user },
  );
  const chatMutation = trpc.aiGuidance.chat.useMutation();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [historyQuery.data, chatMutation.isPending]);

  if (!user) {
    return (
      <ScreenContainer className="items-center justify-center gap-5 p-6">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <IconSymbol name="sparkles" size={24} color={colors.primary} />
        </View>
        <View className="gap-2">
          <Text className="text-center text-2xl font-bold text-foreground">Sign in to use AI Guides</Text>
          <Text className="text-center text-base leading-6 text-muted">
            Your questions and study context stay attached to your private workspace.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)")}
          className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
        >
          <Text className="text-base font-bold text-background">Return home</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const guide = GUIDES[activeGuide];
  const messages = historyQuery.data ?? [];
  const canSend = Boolean(draft.trim()) && !chatMutation.isPending;

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || chatMutation.isPending) return;
    setDraft("");
    setSendError(null);
    try {
      await chatMutation.mutateAsync({ message, guide: activeGuide });
      await historyQuery.refetch();
    } catch {
      setDraft(message);
      setSendError("The guide could not respond. Check your connection and try again.");
    }
  };

  return (
    <ScreenContainer className="p-0">
      <View className="gap-2 px-5 pb-4 pt-6">
        <Text className="text-xs font-bold uppercase tracking-widest text-primary">Prepare, then verify</Text>
        <Text className="text-3xl font-bold leading-10 text-foreground">AI Guides</Text>
        <Text className="text-base leading-6 text-muted">
          Three AI perspectives based on the founders&apos; focus areas. They are not the founders and can be wrong.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 14 }}
      >
        {(Object.keys(GUIDES) as GuideKey[]).map((key) => {
          const option = GUIDES[key];
          const selected = key === activeGuide;
          return (
            <TouchableOpacity
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.name}, ${option.focus} AI guide`}
              onPress={() => {
                setActiveGuide(key);
                setSendError(null);
              }}
              className={`min-h-14 flex-row items-center gap-2 rounded-full border py-2 pl-2 pr-4 ${
                selected ? "border-primary bg-primary" : "border-border bg-surface"
              }`}
            >
              <View className={`h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-background/20" : "bg-primary/10"}`}>
                <Text className={`text-xs font-bold ${selected ? "text-background" : "text-primary"}`}>
                  {option.initials}
                </Text>
              </View>
              <View className="gap-0.5">
                <Text className={`text-sm font-bold ${selected ? "text-background" : "text-foreground"}`}>
                  {option.name}
                </Text>
                <Text className={`text-xs font-semibold ${selected ? "text-background" : "text-muted"}`}>
                  {option.focus}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View className="mx-5 mb-3 rounded-xl border border-border bg-surface p-4">
        <Text className="text-sm leading-5 text-muted">{guide.duty}</Text>
      </View>

      <View className="flex-1">
        {historyQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <BenchLoader />
          </View>
        ) : historyQuery.isError ? (
          <View className="flex-1 items-center justify-center gap-4 px-6">
            <Text className="text-center text-xl font-bold text-foreground">Conversation unavailable</Text>
            <Text className="text-center text-base leading-6 text-muted">
              We could not load this guide. Check your connection and try again.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void historyQuery.refetch()}
              className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
            >
              <Text className="text-base font-bold text-background">Reload conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 16 }}
          >
            {messages.length === 0 ? (
              <View className="items-center gap-3 py-8">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <IconSymbol name="bubble.left.and.bubble.right.fill" size={22} color={colors.primary} />
                </View>
                <Text className="text-center text-base font-bold text-foreground">Start with one question</Text>
                <Text className="text-center text-sm leading-5 text-muted">
                  Use the answer to prepare—not as a substitute for current official information or human review.
                </Text>
              </View>
            ) : null}

            {messages.map((message) => {
              const isStudent = message.role === "user";
              return (
                <View
                  key={message.id}
                  className={`max-w-[84%] gap-1 ${isStudent ? "self-end" : "self-start"}`}
                >
                  <Text className={`text-xs font-bold uppercase tracking-wider text-muted ${isStudent ? "text-right" : ""}`}>
                    {isStudent ? "You" : `${guide.name.split(" ")[0]} AI`}
                  </Text>
                  <View className={`rounded-2xl border px-4 py-3 ${isStudent ? "border-primary bg-primary" : "border-border bg-surface"}`}>
                    <Text className={`text-base leading-6 ${isStudent ? "text-background" : "text-foreground"}`}>
                      {message.content}
                    </Text>
                  </View>
                </View>
              );
            })}

            {chatMutation.isPending ? (
              <View className="self-start rounded-2xl border border-border bg-surface px-4 py-3">
                <Text accessibilityLabel="Guide is responding" className="text-sm font-bold tracking-widest text-primary">
                  • • •
                </Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        {sendError ? (
          <View className="mx-5 mb-2 rounded-xl border border-error/30 bg-error/10 p-3">
            <Text accessibilityRole="alert" className="text-sm leading-5 text-error">{sendError}</Text>
          </View>
        ) : null}

        <View className="flex-row items-center gap-2 border-t border-border bg-background px-5 py-3">
          <TextInput
            accessibilityLabel={`Message ${guide.name.split(" ")[0]} AI`}
            value={draft}
            onChangeText={setDraft}
            placeholder={guide.placeholder}
            placeholderTextColor={colors.muted}
            editable={!chatMutation.isPending && !historyQuery.isError}
            onSubmitEditing={() => void handleSend()}
            returnKeyType="send"
            className="min-h-12 flex-1 rounded-full border border-border bg-surface px-4 py-3 text-base text-foreground"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            onPress={() => void handleSend()}
            disabled={!canSend}
            className={`h-12 w-12 items-center justify-center rounded-full ${canSend ? "bg-primary" : "bg-border"}`}
          >
            <IconSymbol
              name="paperplane.fill"
              size={20}
              color={canSend ? colors.background : colors.muted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
