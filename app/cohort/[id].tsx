import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

export default function CohortDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cohortId = Number(id);
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState("");

  const cohortQuery = trpc.cohort.getById.useQuery(
    { cohortId },
    { enabled: Number.isFinite(cohortId) },
  );
  const cohort = cohortQuery.data;
  const messagesQuery = trpc.cohort.getMessages.useQuery(
    { cohortId },
    { enabled: !!cohort?.isMember, refetchInterval: 15000 }
  );
  const messages = messagesQuery.data;

  const join = trpc.cohort.join.useMutation({
    onSuccess: () => utils.cohort.getById.invalidate({ cohortId }),
    onError: (e) => Alert.alert("Could not join", e.message),
  });

  const post = trpc.cohort.postMessage.useMutation({
    onSuccess: async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDraft("");
      utils.cohort.getMessages.invalidate({ cohortId });
    },
    onError: (e) => Alert.alert("Could not post", e.message),
  });

  if (!Number.isFinite(cohortId)) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-xl font-bold text-foreground">Invalid cohort link</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-primary rounded-lg px-5 py-3">
          <Text className="text-background font-bold">Go back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (cohortQuery.isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  if (cohortQuery.isError || !cohort) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-4xl">↻</Text>
        <Text className="text-xl font-bold text-foreground">Cohort unavailable</Text>
        <Text className="text-sm text-muted text-center">
          We could not load this cohort. It may no longer exist, or the service may be unavailable.
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => void cohortQuery.refetch()}
            className="bg-primary rounded-lg px-5 py-3"
          >
            <Text className="text-background font-bold">Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} className="border border-border rounded-lg px-5 py-3">
            <Text className="text-foreground font-bold">Go back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="px-6 pt-8 pb-4 gap-2 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary text-lg">←</Text>
          </TouchableOpacity>
          <View className="gap-1 flex-1">
            <Text className="text-2xl font-bold text-foreground">{cohort.name}</Text>
            <Text className="text-xs text-muted">
              {cohort.memberCount} member{cohort.memberCount === 1 ? "" : "s"}
              {cohort.destination ? ` · ${cohort.destination}` : ""}
            </Text>
          </View>
        </View>

        {cohort.description ? (
          <View className="px-6 pb-4">
            <Text className="text-sm text-muted leading-relaxed">{cohort.description}</Text>
          </View>
        ) : null}

        {!cohort.isMember ? (
          <View className="px-6 pt-6 gap-4 items-center">
            <Text className="text-sm text-muted text-center">
              Join this cohort to see the discussion and connect with peers on the same journey.
            </Text>
            <TouchableOpacity
              onPress={() => join.mutate({ cohortId })}
              disabled={join.isPending}
              className="bg-primary rounded-xl py-4 px-8 items-center active:opacity-80"
            >
              {join.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Join Cohort</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {messagesQuery.isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator />
                </View>
              ) : messagesQuery.isError ? (
                <View className="bg-surface border border-border rounded-xl p-6 items-center gap-3 mt-2">
                  <Text className="text-sm font-semibold text-foreground">Discussion unavailable</Text>
                  <Text className="text-sm text-muted text-center">
                    We could not load the latest messages. Check your connection and try again.
                  </Text>
                  <TouchableOpacity
                    onPress={() => void messagesQuery.refetch()}
                    className="bg-primary rounded-lg px-5 py-3"
                  >
                    <Text className="text-background font-bold">Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (messages ?? []).length === 0 ? (
                <View className="bg-surface border border-border rounded-xl p-6 items-center mt-2">
                  <Text className="text-sm text-muted text-center">No messages yet. Say salam and introduce yourself!</Text>
                </View>
              ) : (
                <View className="gap-3 pt-2">
                  {(messages ?? []).map((m: any) => (
                    <View key={m.id} className="bg-surface border border-border rounded-xl p-4 gap-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-bold text-primary">{m.senderName ?? `Student #${m.studentId}`}</Text>
                        <Text className="text-[10px] text-muted">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                      <Text className="text-sm text-foreground leading-relaxed">{m.content}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View className="px-6 pb-8 pt-2 flex-row gap-2 items-end">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message…"
                placeholderTextColor="#6B6F76"
                multiline
                maxLength={2000}
                className="flex-1 border border-border rounded-xl px-4 py-3 text-sm text-foreground max-h-28"
              />
              <TouchableOpacity
                onPress={() => draft.trim() && post.mutate({ cohortId, content: draft })}
                disabled={post.isPending || !draft.trim()}
                className={`rounded-xl px-5 py-3 items-center ${draft.trim() ? "bg-primary" : "bg-muted/30"}`}
              >
                {post.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className={`font-bold text-sm ${draft.trim() ? "text-white" : "text-muted"}`}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
