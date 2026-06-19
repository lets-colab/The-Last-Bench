import { ScrollView, Text, View, TouchableOpacity, RefreshControl, Animated } from "react-native";
import { useState, useEffect, useRef } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

/**
 * Home Screen - Elegant Dashboard
 * 
 * Design Principles:
 * - Simplicity: One primary action per section
 * - Hierarchy: Clear visual distinction between content
 * - Delight: Smooth animations and thoughtful details
 * - Focus: Personalized insights and next steps
 */
export default function HomeScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const firstName = user?.name?.split(" ")[0] || "Student";
  const timeOfDay = new Date().getHours() < 12 ? "morning" : "afternoon";

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header with Greeting */}
        <View className="px-6 pt-8 pb-6 gap-2">
          <Text className="text-sm font-semibold text-muted">Good {timeOfDay}</Text>
          <Text className="text-4xl font-bold text-foreground">
            {firstName}
          </Text>
          <Text className="text-base text-muted leading-relaxed">
            Let's make your study-abroad dream a reality
          </Text>
        </View>

        {/* Primary Action Card - Journey Progress */}
        <View className="px-6 pb-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 gap-4"
          >
            <View className="gap-2">
              <Text className="text-white text-sm font-semibold opacity-90">Your Application Journey</Text>
              <Text className="text-white text-3xl font-bold">2 of 5</Text>
              <Text className="text-white text-sm opacity-75">applications submitted</Text>
            </View>
            <View className="h-2 bg-white/30 rounded-full overflow-hidden">
              <View className="h-full w-2/5 bg-white rounded-full" />
            </View>
            <View className="flex-row items-center justify-between pt-2">
              <Text className="text-white text-xs font-semibold opacity-90">40% Complete</Text>
              <Text className="text-white text-lg">→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View className="px-6 pb-6 gap-3">
          <View className="flex-row gap-3">
            {/* Pending Decisions */}
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
              <Text className="text-2xl">📋</Text>
              <Text className="text-sm text-muted font-medium">Pending</Text>
              <Text className="text-2xl font-bold text-foreground">1</Text>
              <Text className="text-xs text-muted">visa decision</Text>
            </View>

            {/* Mentor Connections */}
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
              <Text className="text-2xl">👥</Text>
              <Text className="text-sm text-muted font-medium">Mentors</Text>
              <Text className="text-2xl font-bold text-foreground">2</Text>
              <Text className="text-xs text-muted">assigned</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            {/* Messages */}
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
              <Text className="text-2xl">💬</Text>
              <Text className="text-sm text-muted font-medium">Messages</Text>
              <Text className="text-2xl font-bold text-foreground">3</Text>
              <Text className="text-xs text-muted">unread</Text>
            </View>

            {/* Documents */}
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
              <Text className="text-2xl">📄</Text>
              <Text className="text-sm text-muted font-medium">Documents</Text>
              <Text className="text-2xl font-bold text-foreground">8</Text>
              <Text className="text-xs text-muted">uploaded</Text>
            </View>
          </View>
        </View>

        {/* Next Steps Section */}
        <View className="px-6 pb-6 gap-3">
          <Text className="text-lg font-bold text-foreground">Next Steps</Text>

          {/* Step 1 */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
          >
            <View className="flex-1 gap-1">
              <Text className="text-sm font-semibold text-foreground">Upload Transcript</Text>
              <Text className="text-xs text-muted">MIT Application</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
              <Text className="text-primary font-bold">→</Text>
            </View>
          </TouchableOpacity>

          {/* Step 2 */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
          >
            <View className="flex-1 gap-1">
              <Text className="text-sm font-semibold text-foreground">Schedule Mentor Call</Text>
              <Text className="text-xs text-muted">30 min with Sarah Johnson</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
              <Text className="text-primary font-bold">→</Text>
            </View>
          </TouchableOpacity>

          {/* Step 3 */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
          >
            <View className="flex-1 gap-1">
              <Text className="text-sm font-semibold text-foreground">Complete IELTS Prep</Text>
              <Text className="text-xs text-muted">2 lessons remaining</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
              <Text className="text-primary font-bold">→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Personalized Insights */}
        <View className="px-6 pb-6 gap-3">
          <Text className="text-lg font-bold text-foreground">Personalized for You</Text>

          <View className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 gap-3">
            <View className="flex-row items-start gap-3">
              <Text className="text-2xl">🤖</Text>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-bold text-foreground">AI Recommendation</Text>
                <Text className="text-xs text-muted leading-relaxed">
                  Based on your profile, Stanford and CMU are excellent fits for Computer Science
                </Text>
              </View>
            </View>
            <TouchableOpacity className="bg-primary rounded-lg py-2 px-3 active:opacity-80">
              <Text className="text-white text-xs font-bold text-center">Explore Universities</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-6 pb-12 gap-3">
          <Text className="text-lg font-bold text-foreground">Recent Activity</Text>

          <View className="gap-2">
            <View className="flex-row items-center gap-3">
              <View className="w-2 h-2 rounded-full bg-primary" />
              <Text className="text-sm text-foreground flex-1">Sarah sent you a message</Text>
              <Text className="text-xs text-muted">2h ago</Text>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-2 h-2 rounded-full bg-primary" />
              <Text className="text-sm text-foreground flex-1">MIT application moved to Review</Text>
              <Text className="text-xs text-muted">1d ago</Text>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-2 h-2 rounded-full bg-primary" />
              <Text className="text-sm text-foreground flex-1">You completed IELTS Lesson 3</Text>
              <Text className="text-xs text-muted">2d ago</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
