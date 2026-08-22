export const DEFAULT_AI_GUIDANCE_MODEL = "claude-sonnet-4-6";

export function resolveAiGuidanceModel(value = process.env.AI_GUIDANCE_MODEL) {
  const configuredModel = value?.trim();
  return configuredModel || DEFAULT_AI_GUIDANCE_MODEL;
}

const REQUIRED_PRODUCTION_ENV = [
  "DATABASE_URL",
  "JWT_SECRET",
  "OAUTH_SERVER_URL",
  "VITE_APP_ID",
  "OWNER_OPEN_ID",
  "FRONTEND_URL",
  "CORS_ALLOWED_ORIGINS",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
  "AI_GUIDANCE_MODEL",
] as const;

export function getMissingProductionEnv(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (env.NODE_ENV !== "production") return [];
  return REQUIRED_PRODUCTION_ENV.filter((name) => !env[name]?.trim());
}

export function assertProductionConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const missing = getMissingProductionEnv(env);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment: ${missing.join(", ")}`);
  }

  if (env.NODE_ENV !== "production") return;

  if ((env.JWT_SECRET?.trim().length ?? 0) < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }

  for (const name of ["OAUTH_SERVER_URL", "FRONTEND_URL", "BUILT_IN_FORGE_API_URL"] as const) {
    const url = new URL(env[name]!);
    if (url.protocol !== "https:") {
      throw new Error(`${name} must use HTTPS in production`);
    }
  }

  if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL!)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  aiGuidanceModel: resolveAiGuidanceModel(),
};
