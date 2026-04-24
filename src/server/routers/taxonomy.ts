import { z } from "zod";
import { router, withPermission } from "../trpc";

export const taxonomyRouter = router({
  dimensions: withPermission("knowledge", "read").input(z.object({ tenantId: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.dimensionConfig.findMany({ where: input.tenantId ? { tenantId: input.tenantId as any } : {}, orderBy: { number: "asc" } })),
  scenarioTags: withPermission("knowledge", "read").input(z.object({ type: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.scenarioTag.findMany({ where: input.type ? { type: input.type } : {}, orderBy: { name: "asc" } })),
  createTag: withPermission("knowledge", "write").input(z.object({ type: z.string(), name: z.string() })).mutation(({ ctx, input }) => ctx.prisma.scenarioTag.create({ data: input as any })),
  updateTag: withPermission("knowledge", "write").input(z.object({ id: z.string(), type: z.string().optional(), name: z.string().optional() })).mutation(({ ctx, input }) => ctx.prisma.scenarioTag.update({ where: { id: input.id }, data: input })),
  deleteTag: withPermission("knowledge", "write").input(z.object({ id: z.string() })).mutation(({ ctx, input }) => ctx.prisma.scenarioTag.delete({ where: { id: input.id } })),
  createDimension: withPermission("knowledge", "write").input(z.object({ number: z.number(), name: z.string(), layer: z.enum(['A', 'B', 'C', 'D']), tenantId: z.string() })).mutation(({ ctx, input }) => ctx.prisma.dimensionConfig.create({ data: input as any })),
  updateDimension: withPermission("knowledge", "write").input(z.object({ id: z.string(), number: z.number().optional(), name: z.string().optional(), layer: z.enum(['A', 'B', 'C', 'D']).optional() })).mutation(({ ctx, input }) => ctx.prisma.dimensionConfig.update({ where: { id: input.id }, data: input })),
  deleteDimension: withPermission("knowledge", "write").input(z.object({ id: z.string() })).mutation(({ ctx, input }) => ctx.prisma.dimensionConfig.delete({ where: { id: input.id } })),
});