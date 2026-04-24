import { z } from "zod";
import { router, withPermission, protectedProcedure } from "../trpc";

export const analyticsRouter = router({
  runTrend: withPermission("governance", "read").input(z.object({ projectId: z.string(), days: z.number().default(30) })).query(async ({ ctx, input }) => {
    const since = new Date(); since.setDate(since.getDate() - input.days);
    const runs = await ctx.prisma.workflowRun.findMany({ where: { projectId: input.projectId, startedAt: { gte: since } }, select: { status: true, startedAt: true, tokenUsage: true, cost: true } });
    return runs; // 前端做分组聚合
  }),
  qualityTrend: withPermission("governance", "read").input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.evaluationRecord.findMany({ where: { workflowRun: { projectId: input.projectId } }, orderBy: { createdAt: "desc" }, take: 200, select: { s9OverallScore: true, passed: true, createdAt: true } });
  }),
  incidentList: withPermission("governance", "read").input(z.object({ status: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.incident.findMany({ where: input.status ? { status: input.status } : {}, orderBy: { createdAt: "desc" }, take: 100 })),
  slaMetrics: withPermission("governance", "read").input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    const runs = await ctx.prisma.workflowRun.findMany({ where: { projectId: input.projectId, startedAt: { gte: new Date(Date.now() - 7 * 86400000) } }, select: { status: true, duration: true, tokenUsage: true, nodeTraces: true } });
    return { totalRuns: runs.length, avgDuration: runs.reduce((s, r) => s + (r.duration ?? 0), 0) / (runs.length || 1), successRate: runs.filter(r => r.status === "SUCCESS").length / (runs.length || 1) };
  }),
  dimensionLayerMatrix: withPermission("knowledge", "read").input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    const atoms = await ctx.prisma.atom.findMany({ where: { projectId: input.projectId }, select: { layer: true, dimensions: true } });
    return atoms;
  }),
  orphans: withPermission("knowledge", "read").input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    const atoms = await ctx.prisma.atom.findMany({ where: { projectId: input.projectId, slotMappings: { isEmpty: true } }, select: { id: true, title: true, layer: true } });
    return atoms;
  }),
  hotAtoms: withPermission("knowledge", "read").input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    const atoms = await ctx.prisma.atom.findMany({ where: { projectId: input.projectId }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true, layer: true, updatedAt: true } });
    return atoms;
  }),

  getRunStats: protectedProcedure.query(async ({ ctx }) => {
    const total = await ctx.prisma.workflowRun.count();
    const success = await ctx.prisma.workflowRun.count({ where: { status: 'SUCCESS' } });
    const degraded = await ctx.prisma.workflowRun.count({ where: { status: 'DEGRADED' } });
    const hitl = await ctx.prisma.workflowRun.count({ where: { status: 'HUMAN_TAKEOVER' } });
    const avgDuration = await ctx.prisma.workflowRun.aggregate({
      _avg: { duration: true },
      where: { status: 'SUCCESS' },
    });
    return {
      total,
      successRate: total ? ((success / total) * 100).toFixed(1) : '0',
      degradedRate: total ? ((degraded / total) * 100).toFixed(1) : '0',
      hitlRate: total ? ((hitl / total) * 100).toFixed(1) : '0',
      avgDurationMs: avgDuration._avg.duration?.toFixed(0) || '0',
    };
  }),

  getQualityStats: protectedProcedure.query(async ({ ctx }) => {
    const evals = await ctx.prisma.evaluationRecord.aggregate({
      _avg: { s9OverallScore: true },
    });
    const passCount = await ctx.prisma.evaluationRecord.count({ where: { passed: true } });
    const total = await ctx.prisma.evaluationRecord.count();
    return {
      avgScore: evals._avg.s9OverallScore?.toFixed(1) || '0',
      passRate: total ? ((passCount / total) * 100).toFixed(1) : '0',
    };
  }),
});