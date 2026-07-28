/**
 * Self-Healing Engine
 * ───────────────────
 * The system never just fails. Every error is:
 *   1. Fingerprinted and logged (errorLogs)
 *   2. Retried automatically only when a deterministic transient-error check
 *      says that retrying is safe
 *   3. Available for redacted, admin-initiated diagnosis
 *   4. Kept advisory until an operator explicitly approves a strategy
 */
import { eq, desc, sql } from "drizzle-orm";
import { errorLogs, errorFixes, ErrorLog, ErrorFix } from "../drizzle/schema";
import { getDb } from "./db";

// ── health stats (in-memory, cheap) ─────────────────────────────────────────
const startedAt = Date.now();
const stats = {
  errorsCaught: 0,
  errorsHealed: 0,
  retriesPerformed: 0,
  diagnosesRun: 0,
};

export function getHealthSnapshot() {
  return {
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    ...stats,
    healRate: stats.errorsCaught === 0 ? 1 : stats.errorsHealed / stats.errorsCaught,
  };
}

export function redactErrorText(value: unknown, limit = 4000): string {
  return String(value ?? "")
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-jwt]")
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[redacted-email]",
    )
    .replace(/\b(?:\+?88)?01[3-9]\d{8}\b/g, "[redacted-phone]")
    .replace(
      /([?&](?:code|state|token|key|secret|password)=)[^&\s]+/gi,
      "$1[redacted]",
    )
    .slice(0, limit);
}

// ── error fingerprinting ────────────────────────────────────────────────────
// Normalize an error into a stable signature so the same root cause always
// maps to the same knowledge-base entry regardless of ids/values in the text.
export function computeSignature(source: string, error: unknown): string {
  const msg = redactErrorText(error instanceof Error ? error.message : error, 1000);
  const normalized = msg
    .replace(/\d+/g, "#")
    .replace(/'[^']*'/g, "'…'")
    .replace(/"[^"]*"/g, '"…"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${source}::${normalized}`.slice(0, 191);
}

// Transient errors are safe to retry automatically.
export function isTransient(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return [
    "econnreset", "econnrefused", "etimedout", "epipe", "enotfound",
    "socket hang up", "timeout", "too many connections", "deadlock",
    "connection lost", "pool is closed", "rate limit", "429", "502", "503",
  ].some((needle) => msg.includes(needle));
}

// ── knowledge base access ───────────────────────────────────────────────────
export async function logError(source: string, error: unknown, context?: Record<string, unknown>) {
  stats.errorsCaught++;
  const signature = computeSignature(source, error);
  try {
    const db = await getDb();
    if (!db) return signature;
    // Atomic against the unique signature index: concurrent identical failures
    // land on one row. Postgres exposes insert-vs-update via xmax: a freshly
    // inserted row has xmax = 0.
    const [row] = await db
      .insert(errorLogs)
      .values({
        signature,
        source,
        message: redactErrorText(error instanceof Error ? error.message : error),
        stack: error instanceof Error ? redactErrorText(error.stack) : undefined,
        context: context ? redactErrorText(JSON.stringify(context), 2000) : undefined,
      })
      .onConflictDoUpdate({
        target: errorLogs.signature,
        set: { occurrences: sql`${errorLogs.occurrences} + 1`, lastSeenAt: new Date() },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });
    if (row?.inserted && process.env.AUTO_DIAGNOSE_ERRORS === "true") {
      // Explicit opt-in only. The stored text is redacted before it reaches
      // the diagnostic model, and generated fixes remain advisory.
      void diagnoseSignature(signature).catch(() => {});
    }
  } catch {
    // The healer itself must never throw.
  }
  return signature;
}

// ── AI diagnosis: redacted and advisory only ────────────────────────────────
export async function diagnoseSignature(signature: string): Promise<ErrorFix | undefined> {
  try {
    const db = await getDb();
    if (!db) return undefined;
    const errRows = await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.signature, signature))
      .limit(1);
    const errorLog = errRows[0];
    if (!errorLog) return undefined;

    const { invokeLLM } = await import("./_core/llm");
    stats.diagnosesRun++;
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the self-healing engine of The Last Bench backend (Express + tRPC + Drizzle + Postgres/Supabase).
Diagnose the redacted error and recommend ONE advisory strategy:
- "retry": transient failure, retry with backoff is enough
- "reconnect": stale DB/socket connection, reset the connection pool
- "fallback": return a safe empty/default value to the client
- "degrade": disable the failing sub-feature, keep the rest running
- "manual": needs a human code change (explain exactly what to change)

Respond with STRICT JSON only: {"diagnosis": "...", "strategy": "retry|reconnect|fallback|degrade|manual", "detail": "step-by-step remediation"}`,
        },
        {
          role: "user",
          content: `Error signature: ${errorLog.signature}\nSource: ${errorLog.source}\nRedacted message: ${errorLog.message}\nOccurrences: ${errorLog.occurrences}`,
        },
      ],
      maxTokens: 600,
    });

    const raw =
      typeof result.choices?.[0]?.message?.content === "string"
        ? result.choices[0].message.content
        : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as { diagnosis: string; strategy: string; detail: string })
      : { diagnosis: raw.slice(0, 500), strategy: "manual", detail: "" };
    const strategy = (["retry", "fallback", "degrade", "reconnect", "manual"].includes(parsed.strategy)
      ? parsed.strategy
      : "manual") as ErrorFix["fixStrategy"];

    const [fix] = await db
      .insert(errorFixes)
      .values({
        errorSignature: signature,
        diagnosis: parsed.diagnosis || "No diagnosis produced",
        fixStrategy: strategy,
        fixDetail: parsed.detail,
        // AI-generated operational advice must never execute without a
        // separate, explicit approval workflow.
        autoApplied: 0,
      })
      .returning();
    await db.update(errorLogs).set({ status: "diagnosed" }).where(eq(errorLogs.signature, signature));
    return fix;
  } catch {
    return undefined;
  }
}

// ── the wrapper: run anything through the healer ────────────────────────────
export interface HealOptions<T> {
  /** value to return if all recovery fails (enables the "fallback" strategy) */
  fallback?: T;
  /** max retry attempts for transient errors (default 3) */
  maxRetries?: number;
  /** extra context stored with the error log */
  context?: Record<string, unknown>;
}

const BACKOFF_MS = [250, 1000, 3000];

export async function withSelfHealing<T>(
  source: string,
  fn: () => Promise<T>,
  opts: HealOptions<T> = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const value = await fn();
      if (attempt > 0) stats.errorsHealed++;
      return value;
    } catch (error) {
      lastError = error;
      const strategy = isTransient(error) ? "retry" : undefined;

      if (strategy === "retry" && attempt < maxRetries) {
        stats.retriesPerformed++;
        await new Promise((r) => setTimeout(r, BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]));
        continue;
      }
      break;
    }
  }

  // All deterministic retries failed — store a redacted record, then use only
  // an explicit caller-provided fallback or rethrow.
  await logError(source, lastError, opts.context);
  if (opts.fallback !== undefined) {
    stats.errorsHealed++;
    return opts.fallback;
  }
  throw lastError;
}

// ── admin queries ───────────────────────────────────────────────────────────
export async function listErrorLogs(limit = 50): Promise<ErrorLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(errorLogs).orderBy(desc(errorLogs.lastSeenAt)).limit(limit);
}

export async function listFixes(limit = 50): Promise<ErrorFix[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(errorFixes).orderBy(desc(errorFixes.updatedAt)).limit(limit);
}

export async function ignoreError(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(errorLogs).set({ status: "ignored" }).where(eq(errorLogs.id, id));
}
