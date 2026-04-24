// src/server/routers/orchestration.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const orchestrationRouter = router({
  // 8角色编排执行
  runMultiAgent: protectedProcedure
    .input(z.object({
      blueprintId: z.string(),
      projectId: z.string(),
      userQuery: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { orchestrateBlueprint } = await import('@/services/agents/orchestrator');
      const result = await orchestrateBlueprint(input.blueprintId, input.projectId, input.userQuery);

      setTimeout(async () => {
        try {
          const { checkAndCreateIncidents } = await import('@/services/incidentService');
          await checkAndCreateIncidents(input.projectId);
        } catch (e) {
          console.error('Incident check failed:', e);
        }
      }, 0);

      return result;
    }),

  // feedback-learner 分析
  runFeedbackLearner: protectedProcedure
    .input(z.object({ projectId: z.string(), lookbackDays: z.number().default(7) }))
    .mutation(async ({ input, ctx }) => {
      const { runFeedbackLearner } = await import('@/services/agents/feedbackLearner');
      return runFeedbackLearner(input.projectId, input.lookbackDays, ctx.session.user.id);
    }),

  // blueprint-optimizer 分析
  runBlueprintOptimizer: protectedProcedure
    .input(z.object({ blueprintId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { runBlueprintOptimizer } = await import('@/services/agents/feedbackLearner');
      return runBlueprintOptimizer(input.blueprintId, ctx.session.user.id);
    }),

  // 获取优化建议历史
  getOptimizerHistory: protectedProcedure
    .input(z.object({ entityId: z.string(), entityType: z.string().default('BLUEPRINT') }))
    .query(async ({ input, ctx }) => {
      const { prisma } = await import('@/lib/prisma');
      return prisma.auditLog.findMany({
        where: {
          entityId: input.entityId,
          entityType: input.entityType,
          action: { in: ['OPTIMIZER_SUGGESTION', 'FEEDBACK_INSIGHTS'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }),
});