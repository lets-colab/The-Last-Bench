import { ScrollView, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

const LOCATIONS = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Rangpur", "Mymensingh"];
const EXPERTISE = ["Malaysia", "Canada", "UK", "Australia", "Germany", "USA", "Engineering", "Business", "Medicine", "Computer Science"];

function generateReferralCode(centerName: string): string {
  const slug = centerName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `TLB-${slug}-${digits}`;
}

export default function TutorOnboardScreen() {
  const router = useRouter();
  const [centerName, setCenterName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);

  const createProfile = trpc.tutor.createProfile.useMutation({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/tutor");
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const toggleExpertise = (item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedExpertise((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleSubmit = () => {
    if (!centerName.trim()) {
      Alert.alert("Required", "Please enter your center name.");
      return;
    }
    const referralCode = generateReferralCode(centerName);
    createProfile.mutate({
      centerName: centerName.trim(),
      location,
      expertiseAreas: selectedExpertise.join(", "),
      referralCode,
    });
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-8 pb-6 gap-2">
          <Text className="text-4xl font-bold text-foreground">Become a Partner</Text>
          <Text className="text-base text-muted">Join the last bench tutor network and earn commission</Text>
        </View>

        <View className="px-6 pb-12 gap-6">
          {/* Center Name */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted">COACHING CENTER NAME *</Text>
            <TextInput
              value={centerName}
              onChangeText={setCenterName}
              placeholder="e.g. Dhaka Study Hub"
              placeholderTextColor="#687076"
              className="bg-surface border border-border rounded-xl px-4 py-4 text-foreground text-base"
            />
          </View>

          {/* Location */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted">CITY</Text>
            <View className="flex-row flex-wrap gap-2">
              {LOCATIONS.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLocation(loc === location ? "" : loc);
                  }}
                  className={`px-4 py-2 rounded-full border ${
                    location === loc ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                >
                  <Text className={`text-sm font-semibold ${location === loc ? "text-white" : "text-foreground"}`}>
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Expertise */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted">EXPERTISE AREAS</Text>
            <View className="flex-row flex-wrap gap-2">
              {EXPERTISE.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => toggleExpertise(item)}
                  className={`px-4 py-2 rounded-full border ${
                    selectedExpertise.includes(item) ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                >
                  <Text className={`text-sm font-semibold ${selectedExpertise.includes(item) ? "text-white" : "text-foreground"}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Commission Info */}
          <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 gap-2">
            <Text className="text-base font-bold text-green-900 dark:text-green-100">💰 How You Earn</Text>
            <Text className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
              Earn 5% commission for every student you refer who successfully enrolls. A unique referral code will be generated for you automatically.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createProfile.isPending}
            className="bg-primary rounded-xl py-4 items-center active:opacity-80"
          >
            {createProfile.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">Create Partner Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
