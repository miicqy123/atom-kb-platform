// src/server/routers/task.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const taskRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.status) where.status = input.status;

      const items = await ctx.prisma.task.findMany({
        where,
        take: input.limit,
        skip: input.offset,
        orderBy: { createdAt: 'desc' },
        include: { prompt: { select: { id: true, score: true, status: true } } },
      });

      const totalCount = await ctx.prisma.task.count({ where });

      return { items, totalCount, hasMore: input.offset + input.limit < totalCount };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.task.findUniqueOrThrow({
        where: { id: input.id },
        include: { prompt: true },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      type: z.enum([
        'SHORT_VIDEO','MOMENTS','SALES_TALK','LIVE_TALK',
        'BRAND_STORY','IMAGE_PROMPT','ANALYSIS','GENERAL','CUSTOM',
      ]),
      description: z.string().min(1),
      platform: z.enum(['DOUYIN','XIAOHONGSHU','SHIPINHAO','WECHAT_MOMENTS','GENERAL']).default('GENERAL'),
      audience: z.enum(['BOSS','EXECUTOR','CONSUMER','GENERAL']).default('GENERAL'),
      rawIds: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.create({
        data: {
          projectId: input.projectId,
          type: input.type,
          description: input.description,
          platform: input.platform as any,
          audience: input.audience as any,
          rawIds: input.rawIds,
          status: 'pending',
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.task.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
