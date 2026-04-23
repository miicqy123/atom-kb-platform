import { z } from "zod";
import { router, withPermission } from "../trpc";

export const workflowRunRouter = router({
  list: withPermission("orchestration", "read")
    .input(z.object({
      projectId: z.string(), status: z.string().optional(), blueprintId: z.string().optional(),
      page: z.number().default(1), pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.status) where.status = input.status;
      if (input.blueprintId) where.blueprintId = input.blueprintId;
      const [items, total] = await Promise.all([
        ctx.prisma.workflowRun.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { startedAt: "desc" }, include: { blueprint: { select: { name: true, version: true } } } }),
        ctx.prisma.workflowRun.count({ where }),
      ]);
      return { items, total, totalPages: Math.ceil(total / input.pageSize) };
    }),
  getById: withPermission("orchestration", "read")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.workflowRun.findUniqueOrThrow({ where: { id: input.id }, include: { blueprint: true, evaluations: true, reviewTasks: { include: { assignee: true } }, incidents: true } })
    ),
  // 今日统计 (OC-03 顶部卡片)
  todayStats: withPermission("orchestration", "read")
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const runs = await ctx.prisma.workflowRun.findMany({ where: { projectId: input.projectId, startedAt: { gte: today } } });
      const total = runs.length;
      const success = runs.filter(r => r.status === "SUCCESS").length;
      const totalTokens = runs.reduce((s, r) => s + (r.tokenUsage ?? 0), 0);
      const totalCost = runs.reduce((s, r) => s + (r.cost ?? 0), 0);
      const avgDuration = total ? runs.reduce((s, r) => s + (r.duration ?? 0), 0) / total : 0;
      return { total, successRate: total ? success / total : 0, avgDuration, totalTokens, totalCost };
    }),
  // 创建运行记录
  create: withPermission("orchestration", "write")
    .input(z.object({
      blueprintId: z.string(),
      projectId: z.string(),
      workflowMode: z.enum(['DAG', 'REACT', 'ROLE_COLLABORATION', 'STATEFUL_GRAPH']),
      input: z.any().optional(),
      status: z.enum(['RUNNING', 'SUCCESS', 'FAILED', 'DEGRADED', 'HUMAN_TAKEOVER']).default('RUNNING'),
      startedAt: z.date().optional(),
      completedAt: z.date().optional(),
      tokenUsage: z.number().optional(),
      duration: z.number().optional(),
      cost: z.number().optional(),
      contentPerformance: z.any().optional(),
      roiMetrics: z.any().optional(),
      conversionOutcome: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.workflowRun.create({
        data: {
          blueprintId: input.blueprintId,
          projectId: input.projectId,
          workflowMode: input.workflowMode,
          inputData: input.input,
          status: input.status,
          startedAt: input.startedAt || new Date(),
          completedAt: input.completedAt,
          tokenUsage: input.tokenUsage,
          duration: input.duration,
          cost: input.cost,
          contentPerformance: input.contentPerformance,
          roiMetrics: input.roiMetrics,
          conversionOutcome: input.conversionOutcome,
          startedBy: ctx.session.user.id,
        }
      });
    }),
  // 更新运行记录
  update: withPermission("orchestration", "write")
    .input(z.object({
      id: z.string(),
      status: z.enum(['RUNNING', 'SUCCESS', 'FAILED', 'DEGRADED', 'HUMAN_TAKEOVER']).optional(),
      completedAt: z.date().optional(),
      tokenUsage: z.number().optional(),
      duration: z.number().optional(),
      cost: z.number().optional(),
      contentPerformance: z.any().optional(),
      roiMetrics: z.any().optional(),
      conversionOutcome: z.any().optional(),
      output: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      return ctx.prisma.workflowRun.update({
        where: { id },
        data: updateData
      });
    }),
  // 删除运行记录
  delete: withPermission("orchestration", "write")
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.workflowRun.delete({
        where: { id: input.id }
      });
    }),
});