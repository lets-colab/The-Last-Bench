import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// Reliability guard: unexpected procedure errors are fingerprinted and stored
// in redacted form. Optional diagnosis is advisory and explicitly opt-in.
const selfHealingGuard = t.middleware(async (opts) => {
  const result = await opts.next();
  // UNAUTHORIZED/FORBIDDEN are expected auth outcomes, not system failures.
  if (!result.ok && result.error.code !== "UNAUTHORIZED" && result.error.code !== "FORBIDDEN") {
    const { logError } = await import("../self-healing");
    void logError(`trpc:${opts.path}`, result.error, {
      type: opts.type,
      code: result.error.code,
    }).catch(() => {});
  }
  return result;
});

export const publicProcedure = t.procedure.use(selfHealingGuard);

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireUser);

export const adminProcedure = publicProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
