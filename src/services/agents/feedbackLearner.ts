// src/services/agents/feedbackLearner.ts
// feedback-learner + blueprint-optimizer 的批量分析入口
import { prisma } from '@/lib/prisma';
import { runAgentSafe } from './agentRunner';
import { PrismaClient } from '@prisma/client';

export async function runFeedbackLearner(projectId: string, lookbackDays = 7, userId?: string) {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  // 收集最近运行数据
  const runs = await prisma.workflowRun.findMany({
    where: { projectId, createdAt: { gte: since } },
    include: {
      evaluations: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (runs.length < 3) return { skipped: true, reason: '样本不足' };

  const successRate = runs.filter(r => r.status === 'SUCCESS').length / runs.length;
  const avgScore = runs
    .flatMap(r => r.evaluations)
    .reduce((s, e) => s + (e.s9OverallScore || 0), 0) / (runs.flatMap(r => r.evaluations).length || 1);

  const feedbackInput = `
项目ID：${projectId}
分析周期：最近 ${lookbackDays} 天
运行次数：${runs.length}
成功率：${(successRate * 100).toFixed(1)}%
平均S9分：${avgScore.toFixed(1)}
业务满意度回流（示例）：已收集 ${runs.filter(r => r.businessResultA).length} 条
`;

  // feedback-learner 分析
  const learnerResult = await runAgentSafe(
    'feedback-learner',
    feedbackInput,
    []
  );

  const insights = learnerResult.parsed as {
    atomWeightUpdates: Array<{ atomId: string; direction: 'UP' | 'DOWN'; reason: string }>;
    dimensionGaps: string[];
    recommendedActions: string[];
  };

  // 将权重建议写入 AuditLog（实际权重调整需人工确认）
  if (insights.atomWeightUpdates?.length && userId) {
    await prisma.auditLog.create({
      data: {
        userId: userId,
        entityType: 'PROJECT',
        entityId: projectId,
        action: 'FEEDBACK_INSIGHTS',
        changeSummary: JSON.stringify(insights),
      },
    });
  }

  return {
    insights,
    successRate,
    avgScore,
    runsAnalyzed: runs.length,
  };
}

export async function runBlueprintOptimizer(blueprintId: string, userId?: string) {
  const blueprint = await prisma.blueprint.findUniqueOrThrow({
    where: { id: blueprintId },
    include: {
      slotConfigs: { include: { fetchRules: true } },
    },
  });

  // 获取该蓝图最近20次运行记录
  const runs = await prisma.workflowRun.findMany({
    where: { blueprintId },
    include: { evaluations: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (runs.length < 5) return { skipped: true, reason: '运行数据不足5条' };

  const successRate = runs.filter(r => r.status === 'SUCCESS').length / runs.length;
  const hitlRate = runs.filter(r => r.status === 'HUMAN_TAKEOVER').length / runs.length;
  const avgScore = runs
    .flatMap(r => r.evaluations)
    .reduce((s, e) => s + (e.s9OverallScore || 0), 0) / (runs.flatMap(r => r.evaluations).length || 1);

  const configuredSlots = blueprint.slotConfigs.map(s => s.slotKey).join(',');
  const s8BreakdownSample = runs[0]?.evaluations[0]?.s8Scores;

  const optimizerResult = await runAgentSafe(
    'blueprint-optimizer',
    `蓝图名：${blueprint.name}\n已配置槽位：${configuredSlots}\n成功率：${(successRate * 100).toFixed(1)}%\nHITL率：${(hitlRate * 100).toFixed(1)}%\n平均S9分：${avgScore.toFixed(1)}\nS8分项明细（样本）：${JSON.stringify(s8BreakdownSample || {})}`,
    []
  );

  const optimization = optimizerResult.parsed as {
    overallHealth: string;
    slotOptimizations: Array<{ slotKey: string; issue: string; suggestion: string; priority: string }>;
    atomActions: Array<{ atomId: string; action: string; reason: string }>;
  };

  // 写入优化建议记录
  if (userId) {
    await prisma.auditLog.create({
      data: {
        userId: userId,
        entityType: 'BLUEPRINT',
        entityId: blueprintId,
        action: 'OPTIMIZER_SUGGESTION',
        changeSummary: JSON.stringify(optimization),
      },
    });
  }

  return { optimization, successRate, hitlRate, avgScore };
}