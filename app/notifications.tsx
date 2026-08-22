import { ScrollView, Text, View, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { BenchLoader } from "@/components/bench-loader";

function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function notifIcon(type: string): string {
  if (type === "status_update") return "📋";
  if (type === "message") return "💬";
  if (type === "mentor_assigned") return "👤";
  if (type === "visa_update") return "✈️";
  return "🔔";
}

export default function NotificationsScreen() {
  const router = useRouter();

  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = trpc.notification.getForUser.useQuery();
  const utils = trpc.useUtils();

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => utils.notification.getForUser.invalidate(),
  });

  const handlePress = (notif: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notif.isRead) {
      markAsRead.mutate({ notificationId: notif.id });
    }
    if (notif.type === "status_update" && notif.relatedEntityId) {
      router.push(`/application-detail?id=${notif.relatedEntityId}`);
    }
  };

  const unreadCount = (notifications ?? []).filter((n: any) => !n.isRead).length;

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="px-6 pt-8 pb-6 gap-2 flex-row items-center justify-between">
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">Notifications</Text>
            {unreadCount > 0 && (
              <Text className="text-sm text-primary font-semibold">{unreadCount} unread</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-primary font-semibold">Done</Text>
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-12 gap-2">
          {isLoading ? (
            <View className="items-center py-12">
              <BenchLoader />
            </View>
          ) : isError ? (
            <View className="bg-surface border border-border rounded-2xl p-8 items-center gap-3">
              <Text className="text-4xl">↻</Text>
              <Text className="text-base font-bold text-foreground">Notifications unavailable</Text>
              <Text className="text-sm text-muted text-center leading-relaxed">
                We could not load your updates. Check your connection and try again.
              </Text>
              <TouchableOpacity
                onPress={() => void refetch()}
                className="bg-primary rounded-lg px-5 py-3 active:opacity-80"
              >
                <Text className="text-background font-bold">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (notifications ?? []).length === 0 ? (
            <View className="bg-surface border border-border rounded-2xl p-8 items-center gap-3">
              <Text className="text-4xl">🔔</Text>
              <Text className="text-base font-bold text-foreground">All quiet</Text>
              <Text className="text-sm text-muted text-center leading-relaxed">
                We&apos;ll notify you when your application status changes or you receive a message
              </Text>
            </View>
          ) : (
            (notifications ?? []).map((notif: any) => (
              <TouchableOpacity
                key={notif.id}
                onPress={() => handlePress(notif)}
                activeOpacity={0.7}
                className={`rounded-xl p-4 gap-2 active:opacity-80 ${
                  notif.isRead ? "bg-surface border border-border" : "bg-primary/5 border border-primary/20"
                }`}
              >
                <View className="flex-row items-start gap-3">
                  <Text className="text-xl">{notifIcon(notif.type)}</Text>
                  <View className="flex-1 gap-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-sm font-bold text-foreground flex-1" numberOfLines={1}>
                        {notif.title}
                      </Text>
                      {!notif.isRead && (
                        <View className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </View>
                    <Text className="text-xs text-muted leading-relaxed" numberOfLines={2}>
                      {notif.message}
                    </Text>
                    <Text className="text-xs text-muted">
                      {notif.createdAt ? timeAgo(notif.createdAt) : ""}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
