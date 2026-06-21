import { ScrollView, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

const CATEGORIES = ["AI Literacy", "Portfolio Building", "Communication", "Freelancing", "Visa Interview Prep", "IELTS/TOEFL", "Application Strategy"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export default function AdminSkillsScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [duration, setDuration] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const createSkill = trpc.admin.createSkill.useMutation({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle(""); setDescription(""); setCategory(""); setContent(""); setVideoUrl(""); setDuration("");
      Alert.alert("Created!", "Skill lesson published successfully.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleCreate = () => {
    if (!title.trim()) { Alert.alert("Required", "Title is required."); return; }
    if (!category) { Alert.alert("Required", "Select a category."); return; }
    if (!content.trim()) { Alert.alert("Required", "Content is required."); return; }
    createSkill.mutate({ title, description, category, difficulty, duration, content, videoUrl: videoUrl || undefined });
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-8 pb-6 gap-2 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary text-lg">←</Text>
          </TouchableOpacity>
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">Create Skill</Text>
            <Text className="text-sm text-muted">Publish a new lesson for students</Text>
          </View>
        </View>

        <View className="px-6 pb-12 gap-5">
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted">TITLE *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. How to Write a Winning SOP"
              placeholderTextColor="#687076"
              className="bg-surface border border-border rounded-xl px-4 py-4 text-foreground text-base"
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted">SHORT DESCRIPTION</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What students will learn"
              placeholderTextColor="#687076"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-sm"
              multiline
              numberOfLines={2}
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted">CATEGORY *</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(c); }}
                  className={`px-3 py-2 rounded-full border ${category === c ? "bg-primary border-primary" : "bg-surface border-border"}`}
                >
                  <Text className={`text-xs font-semibold ${category === c ? "text-white" : "text-foreground"}`}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted">DIFFICULTY</Text>
            <View className="flex-row gap-2">
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDifficulty(d); }}
                  className={`flex-1 py-3 rounded-xl border items-center ${difficulty === d ? "bg-primary border-primary" : "bg-surface border-border"}`}
                >
                  <Text className={`text-xs font-bold capitalize ${difficulty === d ? "text-white" : "text-foreground"}`}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted">DURATION</Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g. 15 min"
              placeholderTextColor="#687076"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-sm"
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted">CONTENT * (Markdown supported)</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Write the lesson content here..."
              placeholderTextColor="#687076"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-sm"
              multiline
              numberOfLines={8}
              style={{ minHeight: 160, textAlignVertical: "top" }}
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted">VIDEO URL (optional)</Text>
            <TextInput
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://youtube.com/..."
              placeholderTextColor="#687076"
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground text-sm"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={createSkill.isPending}
            className="bg-primary rounded-xl py-4 items-center active:opacity-80"
          >
            {createSkill.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">Publish Lesson</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
