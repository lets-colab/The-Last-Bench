import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  status: "completed" | "in-progress" | "pending";
  icon: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  size: string;
}

/**
 * Application Detail Screen - Premium Application Management
 * 
 * Features:
 * - Document upload with drag-and-drop
 * - Application timeline with status history
 * - Mentor notes with rich formatting
 * - Action buttons for scheduling and uploads
 */
export default function ApplicationDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Mock data
  const application = {
    id: params.id || "1",
    university: "MIT",
    program: "Computer Science",
    status: "review",
    progress: 100,
    deadline: "2024-03-15",
    acceptanceRate: "3.2%",
    visaSuccessRate: "92%",
    estimatedCost: "$75,000/year",
  };

  const timeline: TimelineEvent[] = [
    {
      id: "1",
      title: "Profile Analyzed",
      description: "Your academic profile has been reviewed",
      date: "Jan 15, 2024",
      status: "completed",
      icon: "✓",
    },
    {
      id: "2",
      title: "Application Drafted",
      description: "Essay and personal statement completed",
      date: "Jan 20, 2024",
      status: "completed",
      icon: "✓",
    },
    {
      id: "3",
      title: "Submitted to University",
      description: "Application sent to admissions office",
      date: "Jan 25, 2024",
      status: "completed",
      icon: "✓",
    },
    {
      id: "4",
      title: "Under Review",
      description: "Admissions team is reviewing your application",
      date: "Jan 25 - Mar 15",
      status: "in-progress",
      icon: "⏳",
    },
    {
      id: "5",
      title: "Decision Expected",
      description: "Admission decision will be announced",
      date: "Mar 15, 2024",
      status: "pending",
      icon: "📬",
    },
  ];

  const documents: Document[] = [
    {
      id: "1",
      name: "Transcript.pdf",
      type: "Transcript",
      uploadedDate: "Jan 10, 2024",
      size: "2.4 MB",
    },
    {
      id: "2",
      name: "SAT_Scores.pdf",
      type: "Test Scores",
      uploadedDate: "Jan 12, 2024",
      size: "1.1 MB",
    },
    {
      id: "3",
      name: "Essay_Final.pdf",
      type: "Essay",
      uploadedDate: "Jan 20, 2024",
      size: "0.8 MB",
    },
  ];

  const mentorNotes =
    "Aisha, your profile is exceptionally strong. Your GPA and test scores are well above MIT's median. The essay shows genuine passion for computer science. I recommend emphasizing your robotics project more in the interview. Schedule a mock interview with me next week to prepare.";

  const handleUploadDocument = async () => {
    setIsUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simulate upload
    setTimeout(() => {
      setIsUploading(false);
      setShowDocumentModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Document uploaded successfully");
    }, 2000);
  };

  const handleScheduleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Schedule Call", "Redirecting to calendar...");
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-6 pb-4 gap-2 border-b border-border">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2 mb-2">
            <Text className="text-2xl">←</Text>
            <Text className="text-sm font-semibold text-primary">Back</Text>
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-foreground">{application.university}</Text>
          <Text className="text-base text-muted">{application.program}</Text>
        </View>

        {/* Status Card */}
        <View className="px-6 pt-6 pb-4">
          <View className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-2xl p-6 gap-4">
            <View className="flex-row items-center justify-between">
              <View className="gap-1">
                <Text className="text-sm text-muted font-semibold">Current Status</Text>
                <Text className="text-2xl font-bold text-primary">Under Review</Text>
              </View>
              <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center">
                <Text className="text-3xl">⏳</Text>
              </View>
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-muted">Progress</Text>
                <Text className="text-xs font-bold text-foreground">100%</Text>
              </View>
              <View className="h-2 bg-border rounded-full overflow-hidden">
                <View className="h-full w-full bg-primary rounded-full" />
              </View>
            </View>

            <View className="flex-row gap-3 pt-2">
              <View className="flex-1 gap-1">
                <Text className="text-xs text-muted">Deadline</Text>
                <Text className="text-sm font-bold text-foreground">Mar 15, 2024</Text>
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-xs text-muted">Acceptance Rate</Text>
                <Text className="text-sm font-bold text-foreground">3.2%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="px-6 pb-6 gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
              <Text className="text-xs text-muted font-medium">Visa Success</Text>
              <Text className="text-xl font-bold text-foreground">92%</Text>
            </View>
            <View className="flex-1 bg-surface border border-border rounded-xl p-4 gap-2">
              <Text className="text-xs text-muted font-medium">Est. Cost</Text>
              <Text className="text-xl font-bold text-foreground">$75K/yr</Text>
            </View>
          </View>
        </View>

        {/* Timeline Section */}
        <View className="px-6 pb-6 gap-4">
          <Text className="text-lg font-bold text-foreground">Application Timeline</Text>

          <View className="gap-4">
            {timeline.map((event, index) => (
              <View key={event.id} className="flex-row gap-4">
                {/* Timeline Line */}
                <View className="items-center">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
                      event.status === "completed"
                        ? "bg-primary border-primary"
                        : event.status === "in-progress"
                          ? "bg-warning/20 border-warning"
                          : "bg-surface border-border"
                    }`}
                  >
                    <Text className="text-lg">{event.icon}</Text>
                  </View>
                  {index < timeline.length - 1 && (
                    <View
                      className={`w-1 h-12 mt-2 ${
                        event.status === "completed" ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </View>

                {/* Event Details */}
                <View className="flex-1 pt-1 pb-4">
                  <Text className="text-base font-bold text-foreground">{event.title}</Text>
                  <Text className="text-sm text-muted mt-1">{event.description}</Text>
                  <Text className="text-xs text-muted mt-2">{event.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Documents Section */}
        <View className="px-6 pb-6 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Documents</Text>
            <TouchableOpacity
              onPress={() => setShowDocumentModal(true)}
              className="bg-primary rounded-lg px-4 py-2 active:opacity-80"
            >
              <Text className="text-white text-xs font-bold">+ Upload</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-2">
            {documents.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between active:opacity-80"
              >
                <View className="flex-1 gap-1">
                  <Text className="text-base font-semibold text-foreground">📄 {doc.name}</Text>
                  <Text className="text-xs text-muted">
                    {doc.type} • {doc.size} • {doc.uploadedDate}
                  </Text>
                </View>
                <Text className="text-lg text-primary">↓</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mentor Notes */}
        <View className="px-6 pb-6 gap-4">
          <Text className="text-lg font-bold text-foreground">Mentor Notes</Text>
          <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 gap-3">
            <View className="flex-row items-start gap-3">
              <Text className="text-2xl">👩‍🏫</Text>
              <View className="flex-1 gap-2">
                <Text className="font-semibold text-foreground">Sarah Johnson</Text>
                <Text className="text-sm text-muted leading-relaxed">{mentorNotes}</Text>
                <Text className="text-xs text-muted mt-2">Updated 2 days ago</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="px-6 pb-12 gap-3">
          <TouchableOpacity
            onPress={handleScheduleCall}
            className="bg-primary rounded-xl py-4 active:opacity-80"
          >
            <Text className="text-white font-bold text-center">📞 Schedule Mentor Call</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-xl py-4 active:opacity-80">
            <Text className="text-foreground font-bold text-center">📧 Contact University</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Document Upload Modal */}
      <Modal visible={showDocumentModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 gap-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-2xl font-bold text-foreground">Upload Document</Text>
              <TouchableOpacity
                onPress={() => setShowDocumentModal(false)}
                className="w-8 h-8 rounded-full bg-surface items-center justify-center"
              >
                <Text className="text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Upload Area */}
            <View className="border-2 border-dashed border-primary/30 rounded-xl p-8 items-center gap-3 bg-primary/5">
              <Text className="text-4xl">📤</Text>
              <Text className="text-base font-semibold text-foreground text-center">
                Tap to select or drag files
              </Text>
              <Text className="text-xs text-muted">PDF, DOC, DOCX • Max 10 MB</Text>
            </View>

            {/* Document Type Selection */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-muted">Document Type</Text>
              <View className="flex-row gap-2">
                {["Transcript", "Essay", "Test Scores", "Other"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    className="flex-1 bg-surface border border-border rounded-lg py-2 active:opacity-80"
                  >
                    <Text className="text-xs font-semibold text-foreground text-center">{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Upload Button */}
            <TouchableOpacity
              onPress={handleUploadDocument}
              disabled={isUploading}
              className="bg-primary rounded-lg py-4 active:opacity-80"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-center">Upload Document</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDocumentModal(false)}
              className="bg-surface border border-border rounded-lg py-3"
            >
              <Text className="text-foreground font-semibold text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
