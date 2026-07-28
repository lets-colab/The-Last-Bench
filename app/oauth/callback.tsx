import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BenchLoader } from "@/components/bench-loader";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
  }>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const handleCallback = async () => {
      try {
        const initialUrl =
          params.code || params.state || params.error ? null : await Linking.getInitialURL();
        const callbackUrl = initialUrl ? new URL(initialUrl) : null;
        const providerError = params.error || callbackUrl?.searchParams.get("error");

        if (providerError) {
          if (!active) return;
          setStatus("error");
          setErrorMessage("Sign-in was cancelled or could not be completed.");
          return;
        }

        const code = params.code || callbackUrl?.searchParams.get("code");
        const state = params.state || callbackUrl?.searchParams.get("state");
        if (!code || !state) {
          if (!active) return;
          setStatus("error");
          setErrorMessage("The sign-in response was incomplete. Please start again.");
          return;
        }

        const result = await Api.exchangeOAuthCode(code, state);
        if (!result.sessionToken || !result.user?.openId) {
          throw new Error("The sign-in service returned an incomplete response.");
        }

        await Auth.setSessionToken(result.sessionToken);
        await Auth.setUserInfo({
          id: result.user.id,
          openId: result.user.openId,
          name: result.user.name,
          email: result.user.email,
          loginMethod: result.user.loginMethod,
          lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
        });

        if (!active) return;
        setStatus("success");
        redirectTimer = setTimeout(() => router.replace("/(tabs)"), 600);
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to complete authentication",
        );
      }
    };

    void handleCallback();
    return () => {
      active = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [params.code, params.state, params.error, router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <BenchLoader />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">
              Completing authentication...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text className="text-base leading-6 text-center text-foreground">
              Authentication successful!
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              Redirecting...
            </Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">
              Authentication failed
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              {errorMessage}
            </Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
