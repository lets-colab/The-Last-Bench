import {
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { BenchLoader } from "@/components/bench-loader";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type OnboardingStep = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: IconSymbolName;
};

const STEPS: OnboardingStep[] = [
  {
    eyebrow: "Welcome",
    title: "Start with what is true today",
    description: "A short profile gives your research a useful starting point. Nothing here decides your future.",
  },
  {
    eyebrow: "Your study stage",
    title: "Where are you now?",
    description: "Use the words you normally use. GPA is optional.",
    icon: "person.fill",
  },
  {
    eyebrow: "Destination",
    title: "Is Malaysia the plan?",
    description: "Choose Malaysia, or keep the door open while you explore.",
    icon: "chevron.left.forwardslash.chevron.right",
  },
  {
    eyebrow: "Field",
    title: "What do you want to study?",
    description: "Choose the closest starting point. You can change it later.",
    icon: "graduationcap.fill",
  },
  {
    eyebrow: "Review",
    title: "Your starting profile",
    description: "Save this to enter a dashboard shaped around your next practical step.",
    icon: "checkmark.circle.fill",
  },
];

const DESTINATIONS = ["Malaysia", "Still exploring"];
const FIELDS = [
  "Computer Science",
  "Engineering",
  "Business",
  "Medicine",
  "Arts & Sciences",
  "Other",
];

function tapHaptic() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

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

  const utils = trpc.useUtils();
  const profileQuery = trpc.student.getProfile.useQuery(undefined, { enabled: !!user });
  const saveProfile = trpc.student.createProfile.useMutation();
  const step = STEPS[currentStep];
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (!profileQuery.data) return;
    setFormData({
      class: profileQuery.data.class || "",
      gpa: profileQuery.data.gpa || "",
      fieldOfInterest: profileQuery.data.fieldOfInterest || "",
      destinationPreference: profileQuery.data.destinationPreference || "",
    });
  }, [profileQuery.data]);

  const handleBack = () => {
    tapHaptic();
    setSaveError(null);
    setCurrentStep((value) => Math.max(0, value - 1));
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
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/(tabs)");
    } catch {
      setSaveError("We could not save your profile. Check your connection and try again.");
    }
  };

  const handleNext = () => {
    tapHaptic();
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

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((value) => value + 1);
      return;
    }
    void handleComplete();
  };

  if (authLoading || (user && profileQuery.isLoading)) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <BenchLoader />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer className="items-center justify-center gap-5 p-6">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <IconSymbol name="person.fill" size={24} color={colors.primary} />
        </View>
        <View className="gap-2">
          <Text className="text-center text-2xl font-bold text-foreground">Sign in first</Text>
          <Text className="text-center text-base leading-6 text-muted">
            Your study profile is private and must be connected to your account.
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

  if (profileQuery.isError) {
    return (
      <ScreenContainer className="items-center justify-center gap-5 p-6">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <IconSymbol name="gearshape.fill" size={24} color={colors.primary} />
        </View>
        <View className="gap-2">
          <Text className="text-center text-2xl font-bold text-foreground">Profile unavailable</Text>
          <Text className="text-center text-base leading-6 text-muted">
            We could not load your current profile. Nothing has been changed.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => void profileQuery.refetch()}
          className="min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3"
        >
          <Text className="text-base font-bold text-background">Try again</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <View className="border-b border-border bg-background px-5 pt-3 pb-4 gap-4">
        <View className="min-h-11 flex-row items-center justify-between">
          {currentStep > 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous step"
              onPress={handleBack}
              className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
            >
              <IconSymbol name="arrow.left" size={21} color={colors.foreground} />
            </TouchableOpacity>
          ) : (
            <View className="h-11 w-11" />
          )}
          <Text className="text-xs font-bold uppercase tracking-widest text-muted">
            Step {currentStep + 1} of {STEPS.length}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Leave profile setup"
            onPress={() => router.replace("/(tabs)")}
            className="min-h-11 justify-center px-1"
          >
            <Text className="text-sm font-bold text-muted">Exit</Text>
          </TouchableOpacity>
        </View>
        <View className="h-1.5 overflow-hidden rounded-full bg-border">
          <View
            style={{ width: `${progressPercent}%`, backgroundColor: colors.primary }}
            className="h-full rounded-full"
          />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
      >
        <View className="flex-1 px-5 pt-8 gap-7">
          <View className="gap-4">
            {currentStep === 0 ? (
              <View className="h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
                <Image
                  source={require("@/landing/assets/logo-icon.png")}
                  accessibilityLabel="Last Bench"
                  resizeMode="contain"
                  style={{ width: 46, height: 32 }}
                />
              </View>
            ) : step.icon ? (
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <IconSymbol name={step.icon} size={24} color={colors.primary} />
              </View>
            ) : null}
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-primary">
                {step.eyebrow}
              </Text>
              <Text className="text-3xl font-bold leading-10 text-foreground">{step.title}</Text>
              <Text className="text-base leading-6 text-muted">{step.description}</Text>
            </View>
          </View>

          {currentStep === 0 ? (
            <View className="overflow-hidden rounded-2xl border border-border bg-surface">
              {[
                ["sparkles", "Guided research", "Prepare better questions before you apply."],
                ["person.2.fill", "Human handoff", "Know when a high-stakes detail needs a person."],
                ["checkmark.circle.fill", "Honest tracking", "See recorded stages without outcome promises."],
              ].map(([icon, title, body], index) => (
                <View
                  key={title}
                  className={`flex-row items-start gap-3 p-4 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <IconSymbol name={icon as IconSymbolName} size={19} color={colors.primary} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-bold text-foreground">{title}</Text>
                    <Text className="text-sm leading-5 text-muted">{body}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {currentStep === 1 ? (
            <View className="gap-5">
              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">Class or study stage</Text>
                <TextInput
                  accessibilityLabel="Class or study stage"
                  placeholder="For example, HSC final year"
                  placeholderTextColor={colors.muted}
                  value={formData.class}
                  onChangeText={(text) => setFormData((value) => ({ ...value, class: text }))}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  className="min-h-14 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
                />
              </View>
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-foreground">GPA</Text>
                  <Text className="text-xs font-semibold text-muted">Optional</Text>
                </View>
                <TextInput
                  accessibilityLabel="GPA, optional"
                  placeholder="For example, 4.50 out of 5.00"
                  placeholderTextColor={colors.muted}
                  value={formData.gpa}
                  onChangeText={(text) => setFormData((value) => ({ ...value, gpa: text }))}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  className="min-h-14 rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground"
                />
              </View>
            </View>
          ) : null}

          {currentStep === 2 ? (
            <View className="gap-3">
              {DESTINATIONS.map((destination) => {
                const selected = formData.destinationPreference === destination;
                return (
                  <TouchableOpacity
                    key={destination}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      tapHaptic();
                      setFormData((value) => ({ ...value, destinationPreference: destination }));
                    }}
                    className={`min-h-14 flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                      selected ? "border-primary bg-primary/10" : "border-border bg-surface"
                    }`}
                  >
                    <Text className="text-base font-bold text-foreground">{destination}</Text>
                    {selected ? (
                      <IconSymbol name="checkmark.circle.fill" size={22} color={colors.primary} />
                    ) : (
                      <View className="h-5 w-5 rounded-full border border-border" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {currentStep === 3 ? (
            <View className="gap-3">
              {FIELDS.map((field) => {
                const selected = formData.fieldOfInterest === field;
                return (
                  <TouchableOpacity
                    key={field}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      tapHaptic();
                      setFormData((value) => ({ ...value, fieldOfInterest: field }));
                    }}
                    className={`min-h-14 flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                      selected ? "border-primary bg-primary/10" : "border-border bg-surface"
                    }`}
                  >
                    <Text className="text-base font-bold text-foreground">{field}</Text>
                    {selected ? (
                      <IconSymbol name="checkmark.circle.fill" size={22} color={colors.primary} />
                    ) : (
                      <View className="h-5 w-5 rounded-full border border-border" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {currentStep === 4 ? (
            <View className="overflow-hidden rounded-2xl border border-border bg-surface">
              {[
                ["Study stage", formData.class],
                ["Destination", formData.destinationPreference],
                ["Field", formData.fieldOfInterest],
                ...(formData.gpa ? [["GPA", formData.gpa]] : []),
              ].map(([label, value], index) => (
                <View
                  key={label}
                  className={`gap-1 p-4 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <Text className="text-xs font-bold uppercase tracking-widest text-muted">{label}</Text>
                  <Text className="text-base font-bold text-foreground">{value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View className="mt-auto gap-3 pt-3">
            {saveError ? (
              <View className="rounded-xl border border-error/30 bg-error/10 p-3">
                <Text accessibilityRole="alert" className="text-center text-sm leading-5 text-error">
                  {saveError}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleNext}
              disabled={saveProfile.isPending}
              className={`min-h-14 items-center justify-center rounded-xl bg-primary px-5 py-3 ${
                saveProfile.isPending ? "opacity-60" : ""
              }`}
            >
              <Text className="text-base font-bold text-background">
                {saveProfile.isPending
                  ? "Saving…"
                  : currentStep === STEPS.length - 1
                    ? "Save and enter dashboard"
                    : currentStep === 0
                      ? "Build my profile"
                      : "Continue"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.replace("/(tabs)")}
              disabled={saveProfile.isPending}
              className="min-h-11 items-center justify-center px-4"
            >
              <Text className="text-sm font-bold text-muted">
                {profileQuery.data ? "Leave without saving" : "Do this later"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
