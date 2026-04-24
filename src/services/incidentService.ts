// src/services/incidentService.ts
import { prisma } from '@/lib/prisma';

const SLA_THRESHOLDS = {
  minSuccessRate: 0.85,    // 成功率低于 85% 触发
  maxHitlRate: 0.15,       // HITL 率高于 15% 触发
  minAvgScore: 65,         // 平均 S9 分低于 65 触发
};

export async function checkAndCreateIncidents(projectId: string) {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000); // 最近 1 小时

  // Count workflow runs for this project
  const total = await prisma.workflowRun.count({
    where: { projectId, createdAt: { gte: windowStart } },
  });
  if (total < 5) return; // 样本不足，不触发

  const success = await prisma.workflowRun.count({
    where: { projectId, status: 'SUCCESS', createdAt: { gte: windowStart } },
  });
  const hitl = await prisma.workflowRun.count({
    where: { projectId, status: 'HUMAN_TAKEOVER', createdAt: { gte: windowStart } },
  });
  const avgScoreResult = await prisma.evaluationRecord.aggregate({
    _avg: { s9OverallScore: true },
    where: {
      workflowRun: { projectId, createdAt: { gte: windowStart } },
    },
  });

  const successRate = success / total;
  const hitlRate = hitl / total;
  const avgScore = avgScoreResult._avg.s9OverallScore ?? 100;

  const incidents: Array<{ type: string; detail: string; severity: string }> = [];

  if (successRate < SLA_THRESHOLDS.minSuccessRate) {
    incidents.push({
      type: 'LOW_SUCCESS_RATE',
      detail: `成功率 ${(successRate * 100).toFixed(1)}%，低于阈值 ${SLA_THRESHOLDS.minSuccessRate * 100}%`,
      severity: 'CRITICAL',
    });
  }
  if (hitlRate > SLA_THRESHOLDS.maxHitlRate) {
    incidents.push({
      type: 'HIGH_HITL_RATE',
      detail: `HITL 率 ${(hitlRate * 100).toFixed(1)}%，超过阈值 ${SLA_THRESHOLDS.maxHitlRate * 100}%`,
      severity: 'HIGH',
    });
  }
  if (avgScore < SLA_THRESHOLDS.minAvgScore) {
    incidents.push({
      type: 'LOW_QUALITY_SCORE',
      detail: `平均质检分 ${avgScore.toFixed(1)}，低于阈值 ${SLA_THRESHOLDS.minAvgScore}`,
      severity: 'HIGH',
    });
  }

  // 批量创建 Incident（去重：同 type + 1小时内未关闭则跳过）
  for (const inc of incidents) {
    // Find the most recent workflow run to link the incident to
    const recentRun = await prisma.workflowRun.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    // Check for existing incidents of the same type for this project's workflow runs in the last hour
    const existing = await prisma.incident.findFirst({
      where: {
        workflowRunId: recentRun?.id,
        type: inc.type,
        status: 'pending',
        createdAt: { gte: windowStart },
      },
    });

    if (!existing) {
      await prisma.incident.create({
        data: {
          workflowRunId: recentRun?.id,
          type: inc.type as any,
          description: inc.detail,
          severity: inc.severity as any,
          status: 'pending',
        },
      });
    }
  }

  return incidents.length;
}