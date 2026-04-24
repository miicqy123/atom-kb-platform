import { z } from "zod";
import { router, withPermission } from "../trpc";

export const evaluationRouter = router({
  listByBlueprint: withPermission("prompts", "read").input(z.object({ blueprintId: z.string() })).query(({ ctx, input }) => ctx.prisma.evaluationRecord.findMany({ where: { workflowRun: { blueprintId: input.blueprintId } }, orderBy: { createdAt: "desc" }, take: 50 })),
  getStats: withPermission("prompts", "read").query(({ ctx }) => {
    return ctx.prisma.evaluationRecord.aggregate({
      _count: {
        _all: true,
      },
      _avg: {
        s9OverallScore: true,
      },
    });
  }),
  create: withPermission("prompts", "write").input(z.object({
    workflowRunId: z.string(),
    s8Scores: z.number().min(0).max(100),
    s9OverallScore: z.number().min(0).max(100),
    details: z.any().optional(),
  })).mutation(({ ctx, input }) => {
    return ctx.prisma.evaluationRecord.create({
      data: {
        workflowRunId: input.workflowRunId,
        s8Scores: input.s8Scores,
        s9OverallScore: input.s9OverallScore,
      }
    });
  }),
  update: withPermission("prompts", "write").input(z.object({
    id: z.string(),
    s8Scores: z.number().min(0).max(100).optional(),
    s9OverallScore: z.number().min(0).max(100).optional(),
    details: z.any().optional(),
  })).mutation(({ ctx, input }) => {
    return ctx.prisma.evaluationRecord.update({
      where: { id: input.id },
      data: input as any
    });
  }),
  delete: withPermission("prompts", "write").input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    return ctx.prisma.evaluationRecord.delete({
      where: { id: input.id }
    });
  }),
  getScoreTrend: withPermission("prompts", "read").input(z.object({
    limit: z.number().optional().default(10),
  })).query(({ ctx, input }) => {
    return ctx.prisma.evaluationRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      select: {
        id: true,
        s8Scores: true,
        s9OverallScore: true,
        createdAt: true,
        passed: true,
        workflowRun: {
          select: {
            id: true,
          }
        }
      }
    });
  }),
  getRadarData: withPermission("prompts", "read").query(({ ctx }) => {
    // 返回模拟的雷达图数据，实际应用中可以从评估记录中提取详细维度评分
    return [
      { dim: "红线扫描", score: 92 },
      { dim: "占位符", score: 88 },
      { dim: "跳步检测", score: 75 },
      { dim: "结构缺项", score: 85 },
      { dim: "事实证据", score: 70 }
    ];
  }),
});