import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

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
  const { user } = useAuth();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // tRPC mutations and queries — the conversation list is real data, not mocks
  const sendMessageMutation = trpc.message.send.useMutation();
  const markAsReadMutation = trpc.message.markAsRead.useMutation();
  const conversationsQuery = trpc.message.getConversations.useQuery(undefined, {
    enabled: !!user,
  });
  const getThreadQuery = trpc.message.getThread.useQuery(
    { otherUserId: activeConversation || 0 },
    { enabled: !!activeConversation }
  );
  const conversations: Conversation[] = conversationsQuery.data || [];

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  // Load messages when conversation changes (server returns newest-first; UI renders oldest-first)
  useEffect(() => {
    if (activeConversation && getThreadQuery.data) {
      setMessages([...(getThreadQuery.data as ChatMessage[])].reverse());
      // Mark messages as read
      getThreadQuery.data.forEach((msg: ChatMessage) => {
        if (msg.recipientId === user.id && !msg.isRead) {
          markAsReadMutation.mutate({ messageId: msg.id });
        }
      });
    }
  }, [getThreadQuery.data, activeConversation, user.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Simulate typing indicator
  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(activeConversation || 0);
        return newSet;
      });
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConversation) return;

    const messageText = inputText;
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
    } catch (error) {
      console.error("Error sending message:", error);
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
                <ActivityIndicator size="large" color="#0a7ea4" />
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
            {typingUsers.has(activeConversation) && (
              <Text className="text-xs text-muted">typing...</Text>
            )}
          </View>
          <TouchableOpacity className="px-3 py-2 rounded-lg bg-surface active:opacity-80">
            <Text className="text-lg text-foreground">⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {getThreadQuery.isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#0a7ea4" />
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
                        <TouchableOpacity className="mt-2 bg-black/20 rounded-lg p-2 active:opacity-80">
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

            {/* Typing Indicator */}
            {typingUsers.has(activeConversation) && (
              <View className="flex-row justify-start mb-4">
                <View className="bg-surface border border-border px-4 py-3 rounded-2xl rounded-bl-none gap-2">
                  <View className="flex-row gap-1">
                    <View className="w-2 h-2 bg-muted rounded-full animate-pulse" />
                    <View className="w-2 h-2 bg-muted rounded-full animate-pulse" />
                    <View className="w-2 h-2 bg-muted rounded-full animate-pulse" />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input Area */}
        <View className="flex-row items-end gap-2 pt-3 border-t border-border">
          {/* File Upload Button */}
          <TouchableOpacity className="px-3 py-3 rounded-lg bg-surface active:opacity-80">
            <Text className="text-lg">📎</Text>
          </TouchableOpacity>

          {/* Message Input */}
          <TextInput
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              handleTyping();
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
