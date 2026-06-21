import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

export default function AdminStudentsScreen() {
  const router = useRouter();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);

  const { data: allStudents, isLoading, refetch, isRefetching } = trpc.admin.getAllStudents.useQuery();
  const { data: allMentors } = trpc.admin.getAllMentors.useQuery();
  const { data: allApplications } = trpc.admin.getAllApplications.useQuery();
  const utils = trpc.useUtils();

  const assignMentor = trpc.admin.assignMentor.useMutation({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedStudent(null);
      setSelectedMentorId(null);
      utils.admin.getAllStudents.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const getStudentApps = (studentId: number) =>
    (allApplications ?? []).filter((a: any) => a.studentId === studentId);

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-6 pt-8 pb-6 gap-2 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary text-lg">←</Text>
          </TouchableOpacity>
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">Students</Text>
            <Text className="text-sm text-muted">{allStudents?.length ?? 0} registered</Text>
          </View>
        </View>

        <View className="px-6 pb-12 gap-3">
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator />
            </View>
          ) : (allStudents ?? []).length === 0 ? (
            <View className="bg-surface border border-border rounded-xl p-6 items-center">
              <Text className="text-sm text-muted">No students yet</Text>
            </View>
          ) : (
            (allStudents ?? []).map((student: any) => {
              const apps = getStudentApps(student.id);
              const latestApp = apps[apps.length - 1];
              return (
                <TouchableOpacity
                  key={student.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedStudent(student); }}
                  activeOpacity={0.7}
                  className="bg-surface border border-border rounded-xl p-4 gap-3 active:opacity-80"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                      <Text className="text-primary font-bold">
                        {student.userId?.toString().slice(-2) ?? "?"}
                      </Text>
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-base font-bold text-foreground">Student #{student.id}</Text>
                      <Text className="text-xs text-muted">
                        {student.fieldOfInterest ?? "—"} · {student.destinationPreference ?? "—"}
                      </Text>
                    </View>
                    {student.gpa && (
                      <View className="bg-surface border border-border px-2 py-1 rounded-lg">
                        <Text className="text-xs font-bold text-foreground">GPA {student.gpa}</Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted">
                      {apps.length} application{apps.length !== 1 ? "s" : ""}
                      {latestApp ? ` · ${((latestApp as any).applicationStatus ?? "").replace(/_/g, " ")}` : ""}
                    </Text>
                    <Text className="text-xs text-primary font-semibold">View →</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Student detail modal */}
      <Modal visible={!!selectedStudent} transparent animationType="slide" onRequestClose={() => setSelectedStudent(null)}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setSelectedStudent(null)}
        >
          <TouchableOpacity activeOpacity={1} className="bg-background rounded-t-3xl p-6 gap-4" style={{ paddingBottom: 40 }}>
            <View className="w-12 h-1 rounded-full bg-border self-center mb-2" />

            <Text className="text-xl font-bold text-foreground">Student #{selectedStudent?.id}</Text>

            {selectedStudent && (
              <View className="gap-3">
                <View className="flex-row gap-4">
                  <View className="flex-1 gap-1">
                    <Text className="text-xs text-muted font-semibold">GPA</Text>
                    <Text className="text-base font-bold text-foreground">{selectedStudent.gpa ?? "—"}</Text>
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-xs text-muted font-semibold">CLASS</Text>
                    <Text className="text-base font-bold text-foreground">{selectedStudent.class ?? "—"}</Text>
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-xs text-muted font-semibold">DESTINATION</Text>
                    <Text className="text-base font-bold text-foreground">{selectedStudent.destinationPreference ?? "—"}</Text>
                  </View>
                </View>

                {/* Assign Mentor */}
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">Assign Mentor</Text>
                  <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                    <View className="gap-2">
                      {(allMentors ?? []).length === 0 ? (
                        <Text className="text-sm text-muted">No mentors available</Text>
                      ) : (
                        (allMentors ?? []).map((mentor: any) => (
                          <TouchableOpacity
                            key={mentor.id}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedMentorId(mentor.userId); }}
                            className={`px-4 py-3 rounded-xl border ${selectedMentorId === mentor.userId ? "bg-primary border-primary" : "bg-surface border-border"}`}
                          >
                            <Text className={`text-sm font-semibold ${selectedMentorId === mentor.userId ? "text-white" : "text-foreground"}`}>
                              Mentor #{mentor.userId} · {mentor.expertise ?? "General"}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </ScrollView>
                </View>

                {selectedMentorId && getStudentApps(selectedStudent.id).length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      const apps = getStudentApps(selectedStudent.id);
                      if (apps.length > 0) {
                        assignMentor.mutate({ applicationId: apps[0].id, mentorUserId: selectedMentorId });
                      }
                    }}
                    disabled={assignMentor.isPending}
                    className="bg-primary rounded-xl py-4 items-center active:opacity-80"
                  >
                    {assignMentor.isPending ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-white font-bold">Assign to Latest Application</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
