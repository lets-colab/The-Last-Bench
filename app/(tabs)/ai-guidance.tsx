import { ScrollView, Text, View, TouchableOpacity, TextInput, ActivityIndicator, FlatList } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/**
 * AI Guidance Chat Screen - Get personalized university recommendations
 */
export default function AIGuidanceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch AI chat
  const chatMutation = trpc.aiGuidance.chat.useMutation();

  // Fetch recommendations
  const recommendationsQuery = trpc.aiGuidance.getRecommendations.useQuery(undefined, {
    enabled: false,
  });

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  // Load initial welcome message
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your study-abroad advisor. I can help you explore universities, understand application processes, and answer questions about studying abroad. What would you like to know?",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Send to AI (the server owns conversation history now)
      const response = await chatMutation.mutateAsync({
        message: inputText,
      });

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: typeof response.message === "string" ? response.message : JSON.stringify(response.message),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    setIsLoading(true);
    try {
      const recommendations = await recommendationsQuery.refetch();
      setShowRecommendations(true);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render message bubble
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === "user";

    return (
      <View
        key={message.id}
        className={`flex-row mb-4 ${isUser ? "justify-end" : "justify-start"}`}
      >
        <View
          className={`max-w-xs px-4 py-3 rounded-2xl ${
            isUser ? "bg-primary rounded-br-none" : "bg-surface border border-border rounded-bl-none"
          }`}
        >
          <Text className={`text-base leading-relaxed ${isUser ? "text-background" : "text-foreground"}`}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="p-4 flex-1">
      <View className="flex-1 gap-4">
        {/* Header */}
        <View className="gap-2 pb-2 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">AI Advisor</Text>
          <Text className="text-sm text-muted">Get personalized guidance for your study-abroad journey</Text>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => renderMessage(message))}

          {isLoading && (
            <View className="flex-row justify-start mb-4">
              <View className="bg-surface border border-border px-4 py-3 rounded-2xl rounded-bl-none gap-2">
                <ActivityIndicator size="small" color="#0a7ea4" />
                <Text className="text-sm text-muted">Thinking...</Text>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          {messages.length <= 1 && !isLoading && (
            <View className="gap-3 mt-6">
              <Text className="text-sm font-semibold text-muted">Quick Questions:</Text>

              <TouchableOpacity
                onPress={() => router.push("/compare")}
                className="bg-primary/10 border border-primary/20 rounded-lg p-3 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-primary">⚖️ Compare universities side by side</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setInputText("What universities would be good for my profile?");
                }}
                className="bg-surface border border-border rounded-lg p-3 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-foreground">
                  What universities would be good for me?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setInputText("What is the visa process for studying in the US?");
                }}
                className="bg-surface border border-border rounded-lg p-3 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-foreground">Tell me about visa processes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setInputText("How much does it cost to study abroad?");
                }}
                className="bg-surface border border-border rounded-lg p-3 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-foreground">What are typical costs?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleGetRecommendations}
                className="bg-primary rounded-lg p-3 active:opacity-80"
              >
                <Text className="text-background font-semibold text-center">Get Personalized Recommendations</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Recommendations Modal */}
        {showRecommendations && recommendationsQuery.data && (
          <View className="bg-surface border border-border rounded-lg p-4 mb-4 gap-3 max-h-64">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-foreground">Recommendations</Text>
              <TouchableOpacity
                onPress={() => setShowRecommendations(false)}
                className="px-3 py-1 rounded-full bg-border"
              >
                <Text className="text-sm font-semibold text-foreground">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-48">
              {Array.isArray(recommendationsQuery.data) &&
                recommendationsQuery.data.map((rec: any, idx: number) => (
                  <View key={idx} className="mb-3 pb-3 border-b border-border last:border-b-0">
                    <Text className="font-bold text-foreground">{rec.universityName || rec.name}</Text>
                    <Text className="text-sm text-muted mt-1">{rec.programName || rec.program}</Text>
                    <Text className="text-xs text-muted mt-2">{rec.whyGoodFit || rec.reason}</Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Input Area */}
        <View className="flex-row items-end gap-2 pt-2 border-t border-border">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about studying abroad..."
            placeholderTextColor="#687076"
            multiline
            maxLength={500}
            editable={!isLoading}
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
            style={{ maxHeight: 100 }}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className={`px-4 py-3 rounded-lg ${
              inputText.trim() && !isLoading ? "bg-primary" : "bg-muted opacity-50"
            }`}
          >
            <Text className="text-background font-semibold">Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
