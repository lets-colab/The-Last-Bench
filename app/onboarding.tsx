import { ScrollView, Text, View, TouchableOpacity, TextInput, Animated, Alert } from "react-native";
import { useState, useRef, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";

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
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    class: "",
    gpa: "",
    fieldOfInterest: "",
    destinationPreference: "",
    referralCode: "",
  });

  const slideAnim = useRef(new Animated.Value(0)).current;

  // Live-validate the referral code so a typo surfaces before the account
  // exists, not after. Read-only: returns the centre name, nothing more.
  const codeCheck = trpc.referral.checkCode.useQuery(
    { referralCode: formData.referralCode.trim() },
    { enabled: formData.referralCode.trim().length >= 5 }
  );

  const steps: OnboardingStep[] = [
    {
      id: 0,
      title: "Welcome to last bench",
      description: "Your personal guide to study abroad success",
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
      title: "You're All Set!",
      description: "Ready to start your journey",
      icon: "✨",
    },
  ];

  const destinations = ["USA", "UK", "Canada", "Australia", "Germany", "Singapore"];
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
  }, [currentStep]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // The profile was previously discarded — handleComplete only navigated, so
  // nothing the student entered (including a referral code) was ever saved.
  const createProfile = trpc.student.createProfile.useMutation({
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const ref = (result as { referral?: { attributed: boolean; reason?: string } })?.referral;
      if (formData.referralCode.trim() && ref && !ref.attributed) {
        // Signup succeeded; only the attribution failed. Say so plainly rather
        // than silently dropping the tutor's credit.
        Alert.alert(
          "Referral code not applied",
          ref.reason === "invalid_format"
            ? "Your account is ready, but that code isn't in the LB-XXXXX format. You can add it later from your profile."
            : ref.reason === "self_referral"
              ? "Your account is ready, but you can't use your own referral code."
              : "Your account is ready, but we couldn't find that referral code. You can add it later from your profile.",
          [{ text: "Continue", onPress: () => router.replace("/(tabs)") }]
        );
        return;
      }
      router.replace("/(tabs)");
    },
    onError: (err) => Alert.alert("Could not save your profile", err.message),
  });

  const handleComplete = () => {
    const code = formData.referralCode.trim();
    createProfile.mutate({
      class: formData.class || undefined,
      gpa: formData.gpa || undefined,
      fieldOfInterest: formData.fieldOfInterest || undefined,
      destinationPreference: formData.destinationPreference || undefined,
      referralCode: code || undefined,
    });
  };

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

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
                  <Text className="text-sm font-semibold text-foreground">✓ AI-Powered Guidance</Text>
                  <Text className="text-xs text-muted">Get personalized university recommendations</Text>
                </View>
                <View className="bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-sm font-semibold text-foreground">✓ Expert Mentors</Text>
                  <Text className="text-xs text-muted">Connect with study-abroad veterans</Text>
                </View>
                <View className="bg-surface border border-border rounded-xl p-4 gap-2">
                  <Text className="text-sm font-semibold text-foreground">✓ Community Support</Text>
                  <Text className="text-xs text-muted">Learn from peers on the same journey</Text>
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
                    placeholder="e.g., 12th Grade, Freshman"
                    placeholderTextColor={colors.muted}
                    value={formData.class}
                    onChangeText={(text) => setFormData({ ...formData, class: text })}
                    className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">GPA (Optional)</Text>
                  <TextInput
                    placeholder="e.g., 4.5 (out of 5.00)"
                    placeholderTextColor={colors.muted}
                    value={formData.gpa}
                    onChangeText={(text) => setFormData({ ...formData, gpa: text })}
                    className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Referral code (Optional)
                  </Text>
                  <TextInput
                    placeholder="LB-XXXXX"
                    placeholderTextColor={colors.muted}
                    value={formData.referralCode}
                    onChangeText={(text) =>
                      setFormData({ ...formData, referralCode: text.toUpperCase() })
                    }
                    autoCapitalize="characters"
                    autoCorrect={false}
                    className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  />
                  {codeCheck.data?.valid ? (
                    <Text className="text-xs text-primary font-semibold">
                      ✓ Referred by {codeCheck.data.centerName}
                    </Text>
                  ) : formData.referralCode.trim().length >= 5 && codeCheck.data ? (
                    <Text className="text-xs text-muted">
                      We don&apos;t recognise that code yet — you can still continue.
                    </Text>
                  ) : (
                    <Text className="text-xs text-muted">
                      If a coaching centre referred you, enter their code.
                    </Text>
                  )}
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
        <TouchableOpacity
          onPress={handleNext}
          className="bg-primary rounded-lg py-4 active:opacity-80"
        >
          <Text className="text-white font-bold text-center">
            {currentStep === steps.length - 1 ? "Get Started" : "Next"}
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
          onPress={handleComplete}
          className="py-2"
        >
          <Text className="text-muted text-xs text-center font-semibold">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
