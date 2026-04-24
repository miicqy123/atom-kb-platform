// src/server/routers/review.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

export const reviewRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const items = await prisma.reviewTask.findMany({
        where: input.status ? { status: input.status as any } : undefined,
        include: {
          workflowRun: { select: { id: true, outputContent: true, blueprintId: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
      return { items };
    }),

  resolve: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['APPROVED', 'MODIFIED_APPROVED', 'REJECTED', 'ESCALATED']),
      modifiedOutput: z.string().optional(),
      feedback: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const task = await prisma.reviewTask.update({
        where: { id: input.id },
        data: {
          status: input.status,
          modifiedOutput: input.modifiedOutput,
          feedback: input.feedback,
          updatedAt: new Date(),
        },
      });

      // 如果有修改输出，更新 WorkflowRun 的最终内容
      if (input.modifiedOutput && task.workflowRunId) {
        await prisma.workflowRun.update({
          where: { id: task.workflowRunId },
          data: {
            outputContent: input.modifiedOutput,
            status: 'SUCCESS',
          },
        });
      }

      return task;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const pending = await ctx.prisma.reviewTask.count({ where: { status: 'PENDING' } });
    const approved = await ctx.prisma.reviewTask.count({ where: { status: 'APPROVED' } });
    const rejected = await ctx.prisma.reviewTask.count({ where: { status: 'REJECTED' } });
    return { pending, approved, rejected };
  }),
});