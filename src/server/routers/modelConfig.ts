import { z } from "zod";
import { router, withPermission } from "../trpc";

export const modelConfigRouter = router({
  list: withPermission("governance", "read").input(z.object({ tenantId: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.modelConfig.findMany({ where: input.tenantId ? { tenantId: input.tenantId } : {} })),
  update: withPermission("governance", "manage").input(z.object({ id: z.string(), data: z.record(z.unknown()) })).mutation(({ ctx, input }) => ctx.prisma.modelConfig.update({ where: { id: input.id }, data: input.data as any })),
});