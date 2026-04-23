import { z } from "zod";
import { router, withPermission } from "../trpc";

export const basePackRouter = router({
  list: withPermission("prompts", "read").query(({ ctx }) => ctx.prisma.basePack.findMany({ orderBy: { slotKey: "asc" } })),
  getById: withPermission("prompts", "read").input(z.object({ id: z.string() })).query(({ ctx, input }) => ctx.prisma.basePack.findUnique({ where: { id: input.id } })),
  create: withPermission("prompts", "write").input(z.object({ slotKey: z.string(), content: z.string(), name: z.string(), scope: z.string().optional(), version: z.number().optional() })).mutation(({ ctx, input }) => ctx.prisma.basePack.create({ data: { slotKey: input.slotKey, content: input.content, name: input.name, scope: input.scope || "GLOBAL", version: input.version || 1, createdBy: ctx.user.id } })),
  update: withPermission("prompts", "write").input(z.object({ id: z.string(), content: z.string().optional(), name: z.string().optional(), scope: z.string().optional() })).mutation(({ ctx, input }) => ctx.prisma.basePack.update({ where: { id: input.id }, data: { ...input, version: { increment: 1 } } })),
  delete: withPermission("prompts", "write").input(z.object({ id: z.string() })).mutation(({ ctx, input }) => ctx.prisma.basePack.delete({ where: { id: input.id } })),
});