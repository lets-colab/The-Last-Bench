import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { BenchLoader } from "@/components/bench-loader";

interface ChatMessage {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  fileUrl?: string | null;
  isRead: number | null;
  createdAt: Date;
}

interface Conversation {
  userId: number;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isTyping?: boolean;
}

/**
 * Messages Tab - Real-time chat between students and mentors
 */
export default function MessagesScreen() {
  const { user, loading: authLoading, error: authError, refresh: refreshAuth } = useAuth();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // tRPC mutations and queries — the conversation list is real data, not mocks
  const sendMessageMutation = trpc.message.send.useMutation();
  const markThreadAsReadMutation = trpc.message.markThreadAsRead.useMutation();
  const conversationsQuery = trpc.message.getConversations.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 10_000,
  });
  const getThreadQuery = trpc.message.getThread.useQuery(
    { otherUserId: activeConversation || 0 },
    {
      enabled: !!activeConversation,
      refetchInterval: activeConversation ? 5_000 : false,
    },
  );
  const conversations: Conversation[] = conversationsQuery.data || [];
  const userId = user?.id;
  const markThreadAsRead = markThreadAsReadMutation.mutateAsync;
  const refetchConversations = conversationsQuery.refetch;
  const refetchThread = getThreadQuery.refetch;

  // Load messages when conversation changes (server returns newest-first; UI renders oldest-first)
  useEffect(() => {
    if (activeConversation && getThreadQuery.data && userId) {
      setMessages([...(getThreadQuery.data as ChatMessage[])].reverse());
      const hasUnreadMessages = getThreadQuery.data.some(
        (msg: ChatMessage) => msg.recipientId === userId && !msg.isRead,
      );
      if (hasUnreadMessages) {
        void markThreadAsRead({ otherUserId: activeConversation })
          .then(() => Promise.all([refetchThread(), refetchConversations()]))
          .catch((error: unknown) => {
            console.warn("[Messages] Unable to mark conversation as read", error);
          });
      }
    }
  }, [
    getThreadQuery.data,
    activeConversation,
    userId,
    markThreadAsRead,
    refetchThread,
    refetchConversations,
  ]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (authLoading) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  if (authError) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-xl font-bold text-foreground text-center">Messages unavailable</Text>
        <Text className="text-sm text-muted text-center">
          Your workspace could not connect to Last Bench services. Please try again in a moment.
        </Text>
        <TouchableOpacity
          onPress={() => void refreshAuth()}
          className="bg-primary rounded-lg px-5 py-3 active:opacity-80"
        >
          <Text className="text-background font-bold">Retry connection</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConversation) return;

    const messageText = inputText.trim();
    setSendError(null);
    setInputText("");

    try {
      await sendMessageMutation.mutateAsync({
        recipientId: activeConversation,
        content: messageText,
      });

      // Add message to local state
      const newMessage: ChatMessage = {
        id: Date.now(),
        senderId: user.id,
        recipientId: activeConversation,
        content: messageText,
        isRead: 0,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);

      // Sync with the server so the thread and conversation list reflect reality
      void getThreadQuery.refetch();
      void conversationsQuery.refetch();
    } catch {
      setInputText(messageText);
      setSendError("Your message was not sent. Check your connection and try again.");
    }
  };

  if (!activeConversation) {
    return (
      <ScreenContainer className="p-6">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 gap-4">
            {/* Header */}
            <View className="gap-2 pb-4 border-b border-border">
              <Text className="text-3xl font-bold text-foreground">Messages</Text>
              <Text className="text-sm text-muted">Chat with mentors and advisors</Text>
            </View>

            {/* Conversations List */}
            {conversationsQuery.isLoading ? (
              <View className="flex-1 justify-center items-center py-12">
                <BenchLoader />
              </View>
            ) : conversationsQuery.isError ? (
              <View className="flex-1 justify-center items-center py-12 gap-3">
                <Text className="text-lg font-semibold text-foreground">Could not load messages</Text>
                <Text className="text-sm text-muted text-center">
                  Check your connection and try again.
                </Text>
                <TouchableOpacity
                  onPress={() => void conversationsQuery.refetch()}
                  className="bg-primary rounded-lg px-5 py-3 active:opacity-80"
                >
                  <Text className="text-background font-bold">Retry</Text>
                </TouchableOpacity>
              </View>
            ) : conversations.length > 0 ? (
              <View className="gap-2">
                {conversations.map((conversation) => (
                  <TouchableOpacity
                    key={conversation.userId}
                    onPress={() => setActiveConversation(conversation.userId)}
                    className="bg-surface border border-border rounded-lg p-4 active:opacity-80 flex-row items-center justify-between"
                  >
                    <View className="flex-1 gap-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-bold text-foreground">
                          {conversation.name}
                        </Text>
                        {conversation.unreadCount > 0 && (
                          <View className="bg-primary px-2 py-1 rounded-full">
                            <Text className="text-xs font-bold text-background">
                              {conversation.unreadCount}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-sm text-muted" numberOfLines={1}>
                        {conversation.lastMessage}
                      </Text>
                      <Text className="text-xs text-muted">
                        {new Date(conversation.lastMessageTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <Text className="text-lg text-muted ml-2">→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="flex-1 justify-center items-center gap-4">
                <Text className="text-lg font-semibold text-foreground">No Messages</Text>
                <Text className="text-sm text-muted text-center">
                  Start a conversation with your mentor or advisor
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Chat View
  const currentConversation = conversations.find((c) => c.userId === activeConversation);

  return (
    <ScreenContainer className="p-4 flex-1">
      <View className="flex-1 gap-4">
        {/* Chat Header */}
        <View className="flex-row items-center justify-between pb-3 border-b border-border gap-3">
          <TouchableOpacity
            onPress={() => setActiveConversation(null)}
            className="px-3 py-2 rounded-lg bg-surface active:opacity-80"
          >
            <Text className="text-lg text-foreground">←</Text>
          </TouchableOpacity>
          <View className="flex-1 gap-1">
            <Text className="text-lg font-bold text-foreground">{currentConversation?.name}</Text>
          </View>
        </View>

        {/* Messages */}
        {getThreadQuery.isLoading ? (
          <View className="flex-1 justify-center items-center">
            <BenchLoader />
          </View>
        ) : getThreadQuery.isError ? (
          <View className="flex-1 justify-center items-center gap-3">
            <Text className="text-lg font-semibold text-foreground">Could not load this conversation</Text>
            <TouchableOpacity
              onPress={() => void getThreadQuery.refetch()}
              className="bg-primary rounded-lg px-5 py-3 active:opacity-80"
            >
              <Text className="text-background font-bold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View className="flex-1 justify-center items-center gap-4">
                <Text className="text-lg font-semibold text-foreground">Start a Conversation</Text>
                <Text className="text-sm text-muted text-center">
                  Send a message to begin chatting with {currentConversation?.name}
                </Text>
              </View>
            ) : (
              messages.map((message) => {
                const isOwn = message.senderId === user.id;
                return (
                  <View
                    key={message.id}
                    className={`flex-row mb-4 ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <View
                      className={`max-w-xs px-4 py-3 rounded-2xl ${
                        isOwn
                          ? "bg-primary rounded-br-none"
                          : "bg-surface border border-border rounded-bl-none"
                      }`}
                    >
                      <Text
                        className={`text-base leading-relaxed ${
                          isOwn ? "text-background" : "text-foreground"
                        }`}
                      >
                        {message.content}
                      </Text>

                      {/* File Preview */}
                      {message.fileUrl && (
                        <TouchableOpacity
                          onPress={() => void Linking.openURL(message.fileUrl!)}
                          className="mt-2 bg-black/20 rounded-lg p-2 active:opacity-80"
                        >
                          <Text className={`text-xs font-semibold ${isOwn ? "text-background" : "text-foreground"}`}>
                            📎 View File
                          </Text>
                        </TouchableOpacity>
                      )}

                      <Text
                        className={`text-xs mt-2 ${
                          isOwn ? "text-background/70" : "text-muted"
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

          </ScrollView>
        )}

        {sendError && <Text className="text-xs text-red-600 dark:text-red-400">{sendError}</Text>}

        {/* Input Area */}
        <View className="flex-row items-end gap-2 pt-3 border-t border-border">
          {/* Message Input */}
          <TextInput
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              setSendError(null);
            }}
            placeholder="Type a message..."
            placeholderTextColor="#687076"
            multiline
            maxLength={500}
            editable={!sendMessageMutation.isPending}
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-base"
            style={{ maxHeight: 100 }}
          />

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            className={`px-4 py-3 rounded-lg ${
              inputText.trim() && !sendMessageMutation.isPending
                ? "bg-primary"
                : "bg-muted opacity-50"
            }`}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-background font-semibold">Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
