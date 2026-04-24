import { initTRPC, TRPCError } from "@trpc/server";
import { createContext } from "./context";
import superjson from "superjson";
import { ZodError } from "zod";
import { UserRole } from "@prisma/client";
import { checkPermission } from "../lib/rbac";

export const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

export const router = t.router;
export const publicProcedure = t.procedure;

// 中间件 - 验证认证
export const authedProcedure = t.procedure.use(({ ctx, next, type, path }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// 受保护的路由 - 必须认证
export const protectedProcedure = t.procedure.use(({ ctx, next, type, path }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

type Module = "knowledge" | "prompts" | "orchestration" | "governance" | "admin";
type Permission = "none" | "read" | "write" | "manage";

export function withPermission(module: Module, required: Permission) {
  return protectedProcedure.use(({ ctx, next }) => {
    const role = ctx.session.user.role as UserRole;
    if (!checkPermission(role, module, required)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Insufficient permissions for ${module}:${required}`,
      });
    }
    return next({ ctx });
  });
}

// Granular permission middleware
export const permissionProcedure = (permission: string) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const { requirePermission } = await import('@/lib/rbac');
    const userRole = ctx.session?.user?.role || 'READONLY';
    requirePermission(userRole, permission);
    return next({ ctx });
  });
