import { ScrollView, Text, View, TouchableOpacity, TextInput, Animated } from "react-native";
import { useState, useRef, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { BenchLoader } from "@/components/bench-loader";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
}

/**
 * Onboarding Flow - Premium First-Time Experience
 * 
 * Features:
 * - Smooth page transitions
 * - Progressive profile setup
 * - Destination selection
 * - Study preferences
 */
export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    class: "",
    gpa: "",
    fieldOfInterest: "",
    destinationPreference: "",
  });

  const slideAnim = useRef(new Animated.Value(0)).current;
  const utils = trpc.useUtils();
  const profileQuery = trpc.student.getProfile.useQuery(undefined, { enabled: !!user });
  const saveProfile = trpc.student.createProfile.useMutation();

  const steps: OnboardingStep[] = [
    {
      id: 0,
      title: "Welcome to Last Bench",
      description: "Build a clear starting point for your Malaysia research",
      icon: "🚀",
    },
    {
      id: 1,
      title: "Tell Us About Yourself",
      description: "Help us personalize your experience",
      icon: "👤",
    },
    {
      id: 2,
      title: "Where Do You Want to Go?",
      description: "Choose your study destination",
      icon: "🌍",
    },
    {
      id: 3,
      title: "What's Your Field?",
      description: "Select your area of interest",
      icon: "🎓",
    },
    {
      id: 4,
      title: "Your Starting Point",
      description: "You can update these details whenever your plans change",
      icon: "✨",
    },
  ];

  const destinations = ["Malaysia", "Still exploring"];
  const fields = [
    "Computer Science",
    "Engineering",
    "Business",
    "Medicine",
    "Arts & Sciences",
    "Other",
  ];

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentStep,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [currentStep, slideAnim]);

  useEffect(() => {
    if (!profileQuery.data) return;
    setFormData({
      class: profileQuery.data.class || "",
      gpa: profileQuery.data.gpa || "",
      fieldOfInterest: profileQuery.data.fieldOfInterest || "",
      destinationPreference: profileQuery.data.destinationPreference || "",
    });
  }, [profileQuery.data]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaveError(null);

    if (currentStep === 1 && !formData.class.trim()) {
      setSaveError("Add your current class or study stage to continue.");
      return;
    }
    if (currentStep === 2 && !formData.destinationPreference) {
      setSaveError("Choose Malaysia or select “Still exploring”.");
      return;
    }
    if (currentStep === 3 && !formData.fieldOfInterest) {
      setSaveError("Choose a field of interest to continue.");
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      void handleComplete();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user || saveProfile.isPending) return;
    setSaveError(null);
    try {
      await saveProfile.mutateAsync({
        class: formData.class.trim() || undefined,
        gpa: formData.gpa.trim() || undefined,
        fieldOfInterest: formData.fieldOfInterest || undefined,
        destinationPreference: formData.destinationPreference || undefined,
      });
      await utils.student.getProfile.invalidate();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/profile");
    } catch {
      setSaveError("We could not save your profile. Check your connection and try again.");
    }
  };

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  if (authLoading || (user && profileQuery.isLoading)) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center gap-4">
        <Text className="text-xl font-bold text-foreground text-center">Sign in first</Text>
        <Text className="text-sm text-muted text-center">
          Your study profile is private and must be connected to your account.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary rounded-lg px-5 py-3 active:opacity-80"
        >
          <Text className="text-white font-bold">Go back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0 bg-gradient-to-b from-primary/5 to-background">
      {/* Progress Bar */}
      <View className="px-6 pt-6 pb-4 gap-2">
        <View className="h-1 bg-border rounded-full overflow-hidden">
          <Animated.View
            style={{
              width: `${progressPercent}%`,
              backgroundColor: colors.primary,
            }}
            className="h-full rounded-full"
          />
        </View>
        <Text className="text-xs text-muted font-semibold">
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pt-12 pb-12 gap-8 justify-center">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <View className="gap-8 items-center">
              <View className="gap-4 items-center">
                <Text className="text-6xl">{steps[0].icon}</Text>
                <View className="gap-2 items-center">
                  <Text className="text-3xl font-bold text-foreground text-center">
                    {steps[0].title}
                  </Text>
                  <Text className="text-base text-muted text-center leading-relaxed">
                    {steps[0].description}
                  </Text>
                </View>
              </View>

              <View className="w-full gap-4 pt-8">
                <View className="bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-sm font-semibold text-foreground">✓ Guided research</Text>
                  <Text className="text-xs text-muted">Prepare better questions for universities and mentors</Text>
                </View>
                <View className="bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-sm font-semibold text-foreground">✓ Human handoff</Text>
                  <Text className="text-xs text-muted">Know when a high-stakes detail needs a person</Text>
                </View>
                <View className="bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-sm font-semibold text-foreground">✓ Honest tracking</Text>
                  <Text className="text-xs text-muted">See recorded stages without invented outcome promises</Text>
                </View>
              </View>
            </View>
          )}

          {/* Step 1: Profile Setup */}
          {currentStep === 1 && (
            <View className="gap-6">
              <View className="gap-2 items-center">
                <Text className="text-5xl">{steps[1].icon}</Text>
                <Text className="text-2xl font-bold text-foreground">{steps[1].title}</Text>
                <Text className="text-sm text-muted text-center">{steps[1].description}</Text>
              </View>

              <View className="gap-4 pt-4">
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">Class/Year</Text>
                  <TextInput
                    placeholder="e.g., HSC final year, university first year"
                    placeholderTextColor={colors.muted}
                    value={formData.class}
                    onChangeText={(text) => setFormData({ ...formData, class: text })}
                    className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">GPA (Optional)</Text>
                  <TextInput
                    placeholder="e.g., 4.50/5.00"
                    placeholderTextColor={colors.muted}
                    value={formData.gpa}
                    onChangeText={(text) => setFormData({ ...formData, gpa: text })}
                    className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Destination */}
          {currentStep === 2 && (
            <View className="gap-6">
              <View className="gap-2 items-center">
                <Text className="text-5xl">{steps[2].icon}</Text>
                <Text className="text-2xl font-bold text-foreground">{steps[2].title}</Text>
                <Text className="text-sm text-muted text-center">{steps[2].description}</Text>
              </View>

              <View className="gap-3 pt-4">
                {destinations.map((dest) => (
                  <TouchableOpacity
                    key={dest}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormData({ ...formData, destinationPreference: dest });
                    }}
                    className={`px-4 py-4 rounded-lg border-2 ${
                      formData.destinationPreference === dest
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`text-base font-semibold text-center ${
                        formData.destinationPreference === dest
                          ? "text-background"
                          : "text-foreground"
                      }`}
                    >
                      {dest}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: Field of Interest */}
          {currentStep === 3 && (
            <View className="gap-6">
              <View className="gap-2 items-center">
                <Text className="text-5xl">{steps[3].icon}</Text>
                <Text className="text-2xl font-bold text-foreground">{steps[3].title}</Text>
                <Text className="text-sm text-muted text-center">{steps[3].description}</Text>
              </View>

              <View className="gap-3 pt-4">
                {fields.map((field) => (
                  <TouchableOpacity
                    key={field}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormData({ ...formData, fieldOfInterest: field });
                    }}
                    className={`px-4 py-4 rounded-lg border-2 ${
                      formData.fieldOfInterest === field
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`text-base font-semibold text-center ${
                        formData.fieldOfInterest === field ? "text-background" : "text-foreground"
                      }`}
                    >
                      {field}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <View className="gap-8 items-center">
              <View className="gap-4 items-center">
                <Text className="text-6xl">{steps[4].icon}</Text>
                <View className="gap-2 items-center">
                  <Text className="text-3xl font-bold text-foreground text-center">
                    {steps[4].title}
                  </Text>
                  <Text className="text-base text-muted text-center leading-relaxed">
                    {steps[4].description}
                  </Text>
                </View>
              </View>

              <View className="w-full bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl p-6 gap-3">
                <Text className="text-sm font-semibold text-foreground">Your Profile</Text>
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Class</Text>
                    <Text className="text-xs font-semibold text-foreground">{formData.class}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Destination</Text>
                    <Text className="text-xs font-semibold text-foreground">
                      {formData.destinationPreference}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted">Field</Text>
                    <Text className="text-xs font-semibold text-foreground">{formData.fieldOfInterest}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View className="px-6 pb-8 gap-3 border-t border-border pt-6">
        {saveError && (
          <Text className="text-red-600 dark:text-red-400 text-sm text-center">{saveError}</Text>
        )}
        <TouchableOpacity
          onPress={handleNext}
          disabled={saveProfile.isPending}
          className={`bg-primary rounded-lg py-4 active:opacity-80 ${
            saveProfile.isPending ? "opacity-60" : ""
          }`}
        >
          <Text className="text-white font-bold text-center">
            {saveProfile.isPending
              ? "Saving…"
              : currentStep === steps.length - 1
                ? "Save Profile"
                : "Next"}
          </Text>
        </TouchableOpacity>

        {currentStep > 0 && (
          <TouchableOpacity
            onPress={handleBack}
            className="bg-surface border border-border rounded-lg py-4 active:opacity-80"
          >
            <Text className="text-foreground font-bold text-center">Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/profile")}
          disabled={saveProfile.isPending}
          className="py-2"
        >
          <Text className="text-muted text-xs text-center font-semibold">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
