import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { BenchLoader } from "@/components/bench-loader";

interface ChatMsg { id: string; role: "user" | "assistant"; content: string }

const WELCOME: ChatMsg = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm your study-abroad advisor with memory — I'll remember what we discuss across sessions. Ask me about universities, visas, or your application.",
};

export default function DiscoverScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"ai" | "community">("ai");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Sayem's AI (the main journey advisor) — see the AI Guides tab for Fahim/Erfan.
  const chatMutation = trpc.aiGuidance.chat.useMutation();
  const historyQuery = trpc.aiGuidance.getChatHistory.useQuery({ guide: "sayem" }, { enabled: !!user });
  const cohortsQuery = trpc.cohort.getAll.useQuery();
  const skillsQuery = trpc.skill.getAll.useQuery();
  const joinCohort = trpc.cohort.join.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.cohort.getById.invalidate({ cohortId: variables.cohortId });
      router.push(`/cohort/${variables.cohortId}`);
    },
    onError: (error) => Alert.alert("Could not join cohort", error.message),
  });

  // Load persistent history from server on mount
  useEffect(() => {
    if (historyQuery.data && historyQuery.data.length > 0) {
      setMessages(
        historyQuery.data.map((m) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    }
  }, [historyQuery.data]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    const userMsg: ChatMsg = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);
    try {
      const response = await chatMutation.mutateAsync({ message: text, guide: "sayem" });
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: response.message },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I couldn't connect. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const cohorts = cohortsQuery.data || [];
  const skills = skillsQuery.data || [];
  const skillsByCategory: Record<string, typeof skills> = {};
  skills.forEach((skill) => {
    const cat = skill.category || "Other";
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(skill);
  });

  return (
    <ScreenContainer className="p-0">
      {/* Header */}
      <View className="px-6 pt-8 pb-4 gap-1">
        <Text className="text-3xl font-bold text-foreground">Discover</Text>
        <Text className="text-sm text-muted">AI advisor with memory · Cohorts · Skills</Text>
      </View>

      {/* Segment Control */}
      <View className="mx-6 mb-4 flex-row bg-surface rounded-xl p-1 border border-border">
        <TouchableOpacity
          onPress={() => setActiveTab("ai")}
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === "ai" ? "bg-primary" : ""}`}
        >
          <Text className={`text-sm font-semibold ${activeTab === "ai" ? "text-white" : "text-muted"}`}>
            AI Advisor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("community")}
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === "community" ? "bg-primary" : ""}`}
        >
          <Text className={`text-sm font-semibold ${activeTab === "community" ? "text-white" : "text-muted"}`}>
            Community
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Advisor Tab */}
      {activeTab === "ai" && (
        <View className="flex-1">
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {historyQuery.isLoading && (
              <ActivityIndicator size="small" color="#16a34a" className="mt-4 mb-2" />
            )}
            {historyQuery.isError && (
              <View className="bg-surface border border-border rounded-xl p-4 gap-3 mb-3">
                <Text className="text-sm font-semibold text-foreground">Conversation history unavailable</Text>
                <Text className="text-xs text-muted leading-relaxed">
                  Your saved conversation could not be loaded. New messages may still work, but verify
                  important advice with your mentor and official sources.
                </Text>
                <TouchableOpacity
                  onPress={() => void historyQuery.refetch()}
                  className="self-start bg-primary rounded-lg px-4 py-2 active:opacity-80"
                >
                  <Text className="text-background text-xs font-bold">Retry history</Text>
                </TouchableOpacity>
              </View>
            )}
            {messages.map((msg) => (
              <View
                key={msg.id}
                className={`mb-3 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <View
                  className={`rounded-2xl px-4 py-3 max-w-xs ${
                    msg.role === "user" ? "bg-primary" : "bg-surface border border-border"
                  }`}
                >
                  <Text className={`text-sm leading-relaxed ${msg.role === "user" ? "text-white" : "text-foreground"}`}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}
            {isLoading && (
              <View className="items-start mb-3">
                <View className="bg-surface border border-border rounded-2xl px-4 py-3">
                  <ActivityIndicator size="small" color="#16a34a" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View className="px-4 pb-4 pt-2 flex-row gap-2 border-t border-border">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about universities, visas..."
              placeholderTextColor="#9BA1A6"
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground"
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className="bg-primary rounded-xl px-4 items-center justify-center"
            >
              <Text className="text-white font-bold text-sm">Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Community Tab */}
      {activeTab === "community" && (
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          {cohortsQuery.isLoading || skillsQuery.isLoading ? (
            <BenchLoader />
          ) : cohortsQuery.isError || skillsQuery.isError ? (
            <View className="items-center pt-12 gap-3">
              <Text className="text-4xl">↻</Text>
              <Text className="text-base font-semibold text-foreground">Community unavailable</Text>
              <Text className="text-sm text-muted text-center">
                We could not load cohorts and learning resources. Check your connection and try again.
              </Text>
              <TouchableOpacity
                onPress={() => void Promise.all([cohortsQuery.refetch(), skillsQuery.refetch()])}
                className="bg-primary rounded-lg px-5 py-3 active:opacity-80"
              >
                <Text className="text-background font-bold">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-6">
              {cohorts.length > 0 && (
                <View className="gap-3">
                  <Text className="text-lg font-bold text-foreground">Cohorts</Text>
                  <Text className="text-sm text-muted">Connect with peers on the same journey</Text>
                  {cohorts.map((cohort) => (
                    <View key={cohort.id} className="bg-surface border border-border rounded-xl p-4 gap-3">
                      <View className="gap-1">
                        <Text className="text-base font-bold text-foreground">{cohort.name}</Text>
                        {cohort.destination && (
                          <Text className="text-sm text-muted">Destination: {cohort.destination}</Text>
                        )}
                        {cohort.description && (
                          <Text className="text-sm text-muted">{cohort.description}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => joinCohort.mutate({ cohortId: cohort.id })}
                        disabled={joinCohort.isPending}
                        className="bg-primary rounded-lg py-2 items-center active:opacity-80"
                      >
                        <Text className="text-white font-semibold text-sm">
                          {joinCohort.isPending ? "Joining…" : "Join Cohort"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {Object.keys(skillsByCategory).length > 0 && (
                <View className="gap-4">
                  <Text className="text-lg font-bold text-foreground">Skills</Text>
                  {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                    <View key={category} className="gap-2">
                      <Text className="text-sm font-semibold text-muted uppercase tracking-wide">{category}</Text>
                      {categorySkills.map((skill) => (
                        <View
                          key={skill.id}
                          className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between"
                        >
                          <View className="flex-1 gap-1">
                            <Text className="text-sm font-semibold text-foreground">{skill.title}</Text>
                            {skill.description && (
                              <Text className="text-xs text-muted">{skill.description}</Text>
                            )}
                            <View className="flex-row gap-2 mt-1">
                              {skill.duration && <Text className="text-xs text-muted">{skill.duration}</Text>}
                              {skill.difficulty && <Text className="text-xs text-muted">· {skill.difficulty}</Text>}
                            </View>
                          </View>
                          <Text className="text-[10px] font-semibold text-muted uppercase ml-3">Preview</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {cohorts.length === 0 && Object.keys(skillsByCategory).length === 0 && (
                <View className="items-center pt-12 gap-3">
                  <Text className="text-4xl">🌱</Text>
                  <Text className="text-base font-semibold text-foreground">Community Coming Soon</Text>
                  <Text className="text-sm text-muted text-center">
                    Cohorts and skill lessons will be available soon.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
