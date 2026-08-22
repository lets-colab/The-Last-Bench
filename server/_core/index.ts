import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { logError } from "../self-healing";
import { createCorsMiddleware } from "./cors";
import { assertProductionConfiguration } from "./env";

function exitAfterFatalError(source: string, error: unknown) {
  console.error(`[api] fatal ${source}; shutting down for a clean restart`);
  void logError(`process:${source}`, error)
    .catch(() => {})
    .finally(() => process.exit(1));
  setTimeout(() => process.exit(1), 1000);
}

process.on("uncaughtException", (error) => {
  exitAfterFatalError("uncaughtException", error);
});
process.on("unhandledRejection", (reason) => {
  exitAfterFatalError("unhandledRejection", reason);
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  assertProductionConfiguration();

  const app = express();
  const server = createServer(app);

  // Render forwards through one proxy hop by default. Make this explicit so
  // rate limiting uses the real client IP without trusting arbitrary headers.
  const proxyHops =
    process.env.TRUST_PROXY_HOPS !== undefined
      ? Number.parseInt(process.env.TRUST_PROXY_HOPS, 10)
      : process.env.NODE_ENV === "production"
        ? 1
        : 0;
  app.set("trust proxy", Number.isFinite(proxyHops) && proxyHops > 0 ? proxyHops : false);

  app.use(createCorsMiddleware());

  // Files use the presigned storage flow; API JSON should stay small enough
  // that one request cannot consume excessive memory.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Last-resort Express error handler: log to the healer, answer gracefully.
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void logError("express", err).catch(() => {});
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: "Something went wrong — the system is healing itself. Please retry." });
    }
  });

  const preferredPort = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  // Managed hosts route traffic to the exact assigned PORT. Silently moving
  // to another port would create a misleading "started" log and a dead API.
  const port =
    process.env.NODE_ENV === "production"
      ? preferredPort
      : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error(
    "[api] failed to start:",
    error instanceof Error ? error.message : "Unknown startup error",
  );
  process.exitCode = 1;
});
