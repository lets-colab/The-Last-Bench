import type { RequestHandler } from "express";

type CorsEnvironment = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "NODE_ENV"
    | "FRONTEND_URL"
    | "CORS_ALLOWED_ORIGINS"
    | "EXPO_WEB_PREVIEW_URL"
    | "EXPO_PACKAGER_PROXY_URL"
  >
>;

function parseOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getAllowedOrigins(env: CorsEnvironment = process.env): Set<string> {
  const candidates = [
    env.FRONTEND_URL,
    env.EXPO_WEB_PREVIEW_URL,
    env.EXPO_PACKAGER_PROXY_URL,
    ...(env.CORS_ALLOWED_ORIGINS ?? "").split(","),
  ];

  if (env.NODE_ENV !== "production") {
    candidates.push(
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006",
    );
  }

  return new Set(candidates.map(parseOrigin).filter((origin): origin is string => Boolean(origin)));
}

export function createCorsMiddleware(env: CorsEnvironment = process.env): RequestHandler {
  const allowedOrigins = getAllowedOrigins(env);

  return (req, res, next) => {
    const origin = req.headers.origin;
    res.vary("Origin");

    if (origin && !allowedOrigins.has(origin)) {
      res.status(403).json({ error: "Origin is not allowed" });
      return;
    }

    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept, Authorization, X-Requested-With",
      );
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  };
}
