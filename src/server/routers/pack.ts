// src/server/routers/pack.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const packRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.enum(['DRAFT','TESTING','ACTIVE','ARCHIVED']).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.status) where.status = input.status;

      const [items, total] = await Promise.all([
        ctx.prisma.pack.findMany({
          where, skip: input.offset, take: input.limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            modules: { include: { module: { select: { id: true, name: true } } } },
          },
        }),
        ctx.prisma.pack.count({ where }),
      ]);
      return { items, totalCount: total };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      projectId: z.string(),
      taskTypes: z.array(z.string()).default([]),
      platforms: z.array(z.string()).default([]),
      audiences: z.array(z.string()).default([]),
      moduleIds: z.array(z.object({ moduleId: z.string(), order: z.number().default(0) })),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pack.create({
        data: {
          name: input.name,
          description: input.description,
          projectId: input.projectId,
          taskTypes: input.taskTypes,
          platforms: input.platforms,
          audiences: input.audiences,
          modules: { create: input.moduleIds.map(m => ({ moduleId: m.moduleId, order: m.order })) },
        },
      });
    }),

  // 按路由条件匹配场景包
  matchByRoute: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      taskType: z.string(),
      platform: z.string().optional(),
      audience: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.pack.findMany({
        where: {
          projectId: input.projectId,
          status: 'ACTIVE',
          taskTypes: { has: input.taskType },
          ...(input.platform ? { platforms: { has: input.platform } } : {}),
          ...(input.audience ? { audiences: { has: input.audience } } : {}),
        },
        include: {
          modules: {
            include: {
              module: {
                include: { atoms: { include: { atom: true } } },
              },
            },
          },
        },
      });
    }),
});
