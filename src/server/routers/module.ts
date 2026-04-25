// src/server/routers/module.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const moduleRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.enum(['DRAFT','TESTING','ACTIVE','ARCHIVED']).optional(),
      search: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.status) where.status = input.status;
      if (input.search) where.name = { contains: input.search, mode: 'insensitive' };

      const [items, total] = await Promise.all([
        ctx.prisma.module.findMany({
          where, skip: input.offset, take: input.limit,
          orderBy: { updatedAt: 'desc' },
          include: { atoms: { include: { atom: { select: { id: true, title: true, category: true } } } } },
        }),
        ctx.prisma.module.count({ where }),
      ]);
      return { items, totalCount: total };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      projectId: z.string(),
      atomIds: z.array(z.object({ atomId: z.string(), order: z.number().default(0) })),
      applicableScenes: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.module.create({
        data: {
          name: input.name,
          description: input.description,
          projectId: input.projectId,
          applicableScenes: input.applicableScenes,
          atoms: { create: input.atomIds.map(a => ({ atomId: a.atomId, order: a.order })) },
        },
        include: { atoms: true },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      applicableScenes: z.array(z.string()).optional(),
      atomIds: z.array(z.object({ atomId: z.string(), order: z.number().default(0) })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, atomIds, ...data } = input;
      if (atomIds) {
        await ctx.prisma.moduleAtom.deleteMany({ where: { moduleId: id } });
        await ctx.prisma.moduleAtom.createMany({
          data: atomIds.map(a => ({ moduleId: id, atomId: a.atomId, order: a.order })),
        });
      }
      return ctx.prisma.module.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.module.delete({ where: { id: input.id } });
    }),
});
