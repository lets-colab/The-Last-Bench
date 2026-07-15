/**
 * Self-Healing Engine
 * ───────────────────
 * The system never just fails. Every error is:
 *   1. Fingerprinted and logged (errorLogs)
 *   2. Auto-recovered where safe (retry with backoff, DB reconnect,
 *      graceful fallback) using the strategy that has worked best before
 *   3. Diagnosed by the AI, with every *past successful fix* injected into
 *      the prompt — so each fix makes the next diagnosis smarter
 *   4. Scored: strategies that work gain successCount, ones that don't gain
 *      failureCount. The engine always picks the highest-scoring strategy.
 */
import { eq, desc, and, sql } from "drizzle-orm";
import { errorLogs, errorFixes, ErrorLog, ErrorFix } from "../drizzle/schema";
import { getDb, resetDb } from "./db";

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

// ── error fingerprinting ────────────────────────────────────────────────────
// Normalize an error into a stable signature so the same root cause always
// maps to the same knowledge-base entry regardless of ids/values in the text.
export function computeSignature(source: string, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
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
    // land on one row. MySQL reports affectedRows=1 for a fresh insert and
    // 2 when the ON DUPLICATE KEY UPDATE branch ran.
    const [result] = await db
      .insert(errorLogs)
      .values({
        signature,
        source,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.slice(0, 4000) : undefined,
        context: context ? JSON.stringify(context).slice(0, 2000) : undefined,
      })
      .onDuplicateKeyUpdate({ set: { occurrences: sql`${errorLogs.occurrences} + 1` } });
    if (result.affectedRows === 1) {
      // First time we see this signature → diagnose it in the background.
      void diagnoseSignature(signature).catch(() => {});
    }
  } catch {
    // The healer itself must never throw.
  }
  return signature;
}

export async function getBestFix(signature: string): Promise<ErrorFix | undefined> {
  try {
    const db = await getDb();
    if (!db) return undefined;
    const rows = await db
      .select()
      .from(errorFixes)
      .where(eq(errorFixes.errorSignature, signature))
      .orderBy(desc(sql`${errorFixes.successCount} - ${errorFixes.failureCount}`))
      .limit(1);
    return rows[0];
  } catch {
    return undefined;
  }
}

// The learning loop: every outcome adjusts the strategy's score.
export async function recordFixOutcome(fixId: number, success: boolean) {
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .update(errorFixes)
      .set(
        success
          ? { successCount: sql`${errorFixes.successCount} + 1` }
          : { failureCount: sql`${errorFixes.failureCount} + 1` },
      )
      .where(eq(errorFixes.id, fixId));
    if (success) {
      const fix = await db.select().from(errorFixes).where(eq(errorFixes.id, fixId)).limit(1);
      if (fix[0]) {
        await db
          .update(errorLogs)
          .set({ status: "healed" })
          .where(eq(errorLogs.signature, fix[0].errorSignature));
      }
    }
  } catch {}
}

// ── AI diagnosis: learns from every past successful fix ─────────────────────
export async function diagnoseSignature(signature: string): Promise<ErrorFix | undefined> {
  try {
    const db = await getDb();
    if (!db) return undefined;
    const [errRows, pastFixes] = await Promise.all([
      db.select().from(errorLogs).where(eq(errorLogs.signature, signature)).limit(1),
      db
        .select()
        .from(errorFixes)
        .where(sql`${errorFixes.successCount} > 0`)
        .orderBy(desc(errorFixes.successCount))
        .limit(15),
    ]);
    const errorLog = errRows[0];
    if (!errorLog) return undefined;

    const learnedContext =
      pastFixes.length > 0
        ? `Fixes that have WORKED before on this system (learn from these):\n${pastFixes
            .map(
              (f) =>
                `- [${f.fixStrategy}] for "${f.errorSignature}" (worked ${f.successCount}×): ${f.diagnosis.slice(0, 200)}`,
            )
            .join("\n")}`
        : "No prior fixes recorded yet — this is the system's first lesson.";

    const { invokeLLM } = await import("./_core/llm");
    stats.diagnosesRun++;
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the self-healing engine of The Last Bench backend (Express + tRPC + Drizzle + MySQL).
Diagnose the error and choose ONE auto-fix strategy:
- "retry": transient failure, retry with backoff is enough
- "reconnect": stale DB/socket connection, reset the connection pool
- "fallback": return a safe empty/default value to the client
- "degrade": disable the failing sub-feature, keep the rest running
- "manual": needs a human code change (explain exactly what to change)

${learnedContext}

Respond with STRICT JSON only: {"diagnosis": "...", "strategy": "retry|reconnect|fallback|degrade|manual", "detail": "step-by-step remediation"}`,
        },
        {
          role: "user",
          content: `Error signature: ${errorLog.signature}\nSource: ${errorLog.source}\nMessage: ${errorLog.message}\nOccurrences: ${errorLog.occurrences}\nStack (trimmed):\n${(errorLog.stack || "n/a").slice(0, 1500)}`,
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

    await db.insert(errorFixes).values({
      errorSignature: signature,
      diagnosis: parsed.diagnosis || "No diagnosis produced",
      fixStrategy: strategy,
      fixDetail: parsed.detail,
      autoApplied: strategy === "manual" ? 0 : 1,
    });
    await db.update(errorLogs).set({ status: "diagnosed" }).where(eq(errorLogs.signature, signature));
    return (await getBestFix(signature))!;
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
      const signature = computeSignature(source, error);
      const learned = await getBestFix(signature);
      const strategy = learned?.fixStrategy ?? (isTransient(error) ? "retry" : undefined);

      if (strategy === "reconnect") {
        resetDb();
      }
      if ((strategy === "retry" || strategy === "reconnect") && attempt < maxRetries) {
        stats.retriesPerformed++;
        await new Promise((r) => setTimeout(r, BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]));
        if (learned) void recordFixOutcome(learned.id, true).catch(() => {});
        continue;
      }
      if ((strategy === "fallback" || strategy === "degrade") && opts.fallback !== undefined) {
        void logError(source, error, opts.context);
        if (learned) void recordFixOutcome(learned.id, true).catch(() => {});
        stats.errorsHealed++;
        return opts.fallback;
      }
      break;
    }
  }

  // All recovery failed — log, mark the learned fix as failed, rethrow.
  const signature = await logError(source, lastError, opts.context);
  const learned = await getBestFix(signature);
  if (learned) void recordFixOutcome(learned.id, false).catch(() => {});
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
