import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

/**
 * Applications Screen - Premium Status Tracking
 * 
 * Design Excellence:
 * - Sophisticated status visualization
 * - Elegant progress rings
 * - Contextual actions
 * - Smooth micro-interactions
 */
export default function ApplicationsScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const applicationsQuery = trpc.application.getByStudent.useQuery(undefined, {
    enabled: !!user,
  });

  if (!user) {
    return (
      <ScreenContainer className="p-6 justify-center items-center">
        <Text className="text-xl font-bold text-foreground">Please sign in to continue</Text>
      </ScreenContainer>
    );
  }

  const applications = applicationsQuery.data || [];

  const statusConfig: Record<string, { label: string; icon: string; color: string; bgLight: string }> = {
    draft: { label: "Draft", icon: "📝", color: "#6b7280", bgLight: "#f3f4f6" },
    documents_received: { label: "Documents Received", icon: "📄", color: "#3b82f6", bgLight: "#eff6ff" },
    profile_analyzed: { label: "Profile Analyzed", icon: "🔍", color: "#8b5cf6", bgLight: "#faf5ff" },
    shortlisted: { label: "Shortlisted", icon: "⭐", color: "#f59e0b", bgLight: "#fffbeb" },
    application_drafted: { label: "Application Drafted", icon: "✍️", color: "#06b6d4", bgLight: "#ecfdf5" },
    submitted_to_university: { label: "Submitted", icon: "✓", color: "#3b82f6", bgLight: "#eff6ff" },
    under_review: { label: "Under Review", icon: "⏳", color: "#f59e0b", bgLight: "#fffbeb" },
    offer_received: { label: "Offer Received", icon: "🎉", color: "#10b981", bgLight: "#f0fdf4" },
    visa_application_filed: { label: "Visa Filed", icon: "📋", color: "#06b6d4", bgLight: "#ecfdf5" },
    visa_decision: { label: "Visa Decision", icon: "✈️", color: "#10b981", bgLight: "#f0fdf4" },
    pre_departure: { label: "Pre-Departure", icon: "🚀", color: "#10b981", bgLight: "#f0fdf4" },
    rejected: { label: "Rejected", icon: "✗", color: "#ef4444", bgLight: "#fef2f2" },
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { label: status, icon: "📌", color: "#6b7280", bgLight: "#f3f4f6" };
  };

  const filteredApplications = selectedStatus
    ? applications.filter((app) => app.applicationStatus === selectedStatus)
    : applications;

  const statuses = Array.from(new Set(applications.map((app) => app.applicationStatus)));

  const handleStatusFilter = (status: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const getProgressPercentage = (status: string): number => {
    const statusOrder = [
      "draft",
      "documents_received",
      "profile_analyzed",
      "shortlisted",
      "application_drafted",
      "submitted_to_university",
      "under_review",
      "offer_received",
      "visa_application_filed",
      "visa_decision",
      "pre_departure",
    ];
    const index = statusOrder.indexOf(status);
    return index >= 0 ? ((index + 1) / statusOrder.length) * 100 : 0;
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-8 pb-6 gap-2">
          <Text className="text-4xl font-bold text-foreground">Applications</Text>
          <Text className="text-sm text-muted">
            {applications.length} {applications.length === 1 ? "application" : "applications"} •{" "}
            {filteredApplications.length} shown
          </Text>
        </View>

        {/* Status Filter - Horizontal Scroll */}
        {statuses.length > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-sm font-semibold text-muted mb-3">Filter by Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 24 }}
            >
              <TouchableOpacity
                onPress={() => handleStatusFilter(null)}
                className={`px-4 py-2 rounded-full ${
                  selectedStatus === null ? "bg-primary" : "bg-surface border border-border"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedStatus === null ? "text-background" : "text-foreground"
                  }`}
                >
                  All ({applications.length})
                </Text>
              </TouchableOpacity>
              {statuses.map((status) => {
                const config = getStatusConfig(status);
                const count = applications.filter((app) => app.applicationStatus === status).length;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => handleStatusFilter(status)}
                    className={`px-4 py-2 rounded-full ${
                      selectedStatus === status ? "bg-primary" : "bg-surface border border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selectedStatus === status ? "text-background" : "text-foreground"
                      }`}
                    >
                      {config.icon} {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Applications List */}
        {applicationsQuery.isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredApplications.length > 0 ? (
          <View className="px-6 pb-12 gap-3">
            {filteredApplications.map((app) => {
              const config = getStatusConfig(app.applicationStatus);
              const progress = getProgressPercentage(app.applicationStatus);

              return (
                <TouchableOpacity
                  key={app.id}
                  activeOpacity={0.8}
                  className="bg-surface border border-border rounded-2xl p-5 active:opacity-80"
                >
                  {/* Header with Status Badge */}
                  <View className="flex-row items-start justify-between mb-4 gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-lg font-bold text-foreground">{app.universityName}</Text>
                      <Text className="text-sm text-muted">{app.programName}</Text>
                      {app.country && (
                        <Text className="text-xs text-muted mt-1">📍 {app.country}</Text>
                      )}
                    </View>
                    <View
                      style={{ backgroundColor: config.bgLight, borderColor: config.color, borderWidth: 1.5 }}
                      className="px-3 py-1.5 rounded-full"
                    >
                      <Text style={{ color: config.color }} className="text-xs font-bold">
                        {config.icon}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Ring */}
                  <View className="gap-2 mb-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-muted">{config.label}</Text>
                      <Text className="text-xs font-bold text-foreground">{Math.round(progress)}%</Text>
                    </View>
                    <View className="h-2 bg-border rounded-full overflow-hidden">
                      <View
                        style={{
                          width: `${progress}%`,
                          backgroundColor: config.color,
                        }}
                        className="h-full rounded-full"
                      />
                    </View>
                  </View>

                  {/* Stats Grid */}
                  <View className="gap-3 mb-4 pb-4 border-t border-border pt-4">
                    <View className="flex-row gap-3">
                      {app.acceptanceRate && (
                        <View className="flex-1 gap-1">
                          <Text className="text-xs text-muted font-medium">Acceptance</Text>
                          <Text className="text-sm font-bold text-foreground">{app.acceptanceRate}</Text>
                        </View>
                      )}
                      {app.visaSuccessRate && (
                        <View className="flex-1 gap-1">
                          <Text className="text-xs text-muted font-medium">Visa Success</Text>
                          <Text className="text-sm font-bold text-foreground">{app.visaSuccessRate}</Text>
                        </View>
                      )}
                      {app.estimatedCost && (
                        <View className="flex-1 gap-1">
                          <Text className="text-xs text-muted font-medium">Est. Cost</Text>
                          <Text className="text-sm font-bold text-foreground">{app.estimatedCost}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Contextual Action Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="bg-primary rounded-lg py-3 active:opacity-80"
                  >
                    <Text className="text-background font-bold text-center text-sm">
                      {app.applicationStatus === "draft" ? "Continue Application" : "View Details"}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View className="flex-1 justify-center items-center px-6 pb-12 gap-4">
            <Text className="text-5xl">📭</Text>
            <Text className="text-xl font-bold text-foreground">No Applications</Text>
            <Text className="text-sm text-muted text-center leading-relaxed">
              {selectedStatus
                ? "No applications with this status yet"
                : "Start your first application to begin your journey to your dream university"}
            </Text>
            {!selectedStatus && (
              <TouchableOpacity className="bg-primary rounded-lg px-8 py-3 mt-4 active:opacity-80">
                <Text className="text-background font-bold">Create Application</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
