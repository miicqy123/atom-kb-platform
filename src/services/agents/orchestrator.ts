// src/services/agents/orchestrator.ts
import { prisma } from '@/lib/prisma';
import { runAgentSafe } from './agentRunner';
import type { OrchestratorContext, SlotContext, AgentResult } from './types';

const SLOT_ORDER = ['S0','S1','S2','S3','S4','S6','S5','S10','S7','S8','S9'];

// ─────────────────────────────────────────────────────────────────
// 主入口：8角色协作编排
// ─────────────────────────────────────────────────────────────────
export async function orchestrateBlueprint(
  blueprintId: string,
  projectId: string,
  userQuery: string
): Promise<{ runId: string; finalPrompt: string; results: AgentResult[]; hitlTasks: string[] }> {

  // 1. 创建 WorkflowRun
  const run = await prisma.workflowRun.create({
    data: {
      blueprintId,
      projectId,
      status: 'RUNNING',
      inputData: { userQuery, mode: 'MULTI_AGENT' },
      startedAt: new Date(),
    },
  });

  const ctx: OrchestratorContext = {
    blueprintId, projectId, userQuery,
    runId: run.id,
    sessionHistory: [],
    slotContexts: new Map(),
    completedSlots: [],
    failedSlots: [],
  };

  const results: AgentResult[] = [];
  const hitlTasks: string[] = [];

  try {
    // ── Step A: agent-organizer 制定执行计划 ──────────────────────
    const planResult = await runAgentSafe(
      'agent-organizer',
      `用户任务：${userQuery}\n蓝图ID：${blueprintId}\n可用槽位：${SLOT_ORDER.join(',')}`,
      ctx.sessionHistory
    );

    const plan = planResult.parsed as {
      plan: Array<{ slotKey: string; priority: number; skipIfFailed: boolean }>;
      userQuerySummary: string;
      complexityLevel: string;
    };

    // 更新会话历史
    ctx.sessionHistory.push({
      role: 'assistant',
      content: planResult.output,
      agentRole: 'agent-organizer',
      timestamp: Date.now(),
    });

    // ── Step B: context-manager 初始化上下文 ──────────────────────
    const ctxResult = await runAgentSafe(
      'context-manager',
      `任务摘要：${plan.userQuerySummary || userQuery}\n复杂度：${plan.complexityLevel || 'MEDIUM'}\n待执行槽位：${SLOT_ORDER.join(',')}`,
      ctx.sessionHistory
    );

    const globalContext = ctxResult.parsed as {
      keyConstraints: string[];
      crossSlotDependencies: Record<string, string[]>;
    };

    ctx.sessionHistory.push({
      role: 'assistant',
      content: ctxResult.output,
      agentRole: 'context-manager',
      timestamp: Date.now(),
    });

    // ── Step C: 逐槽位执行 ────────────────────────────────────────
    const sortedSlots = plan.plan?.length
      ? plan.plan.sort((a, b) => a.priority - b.priority).map(p => p.slotKey)
      : SLOT_ORDER;

    for (const slotKey of sortedSlots) {
      // 取该槽位的 active 原子块
      const atoms = await prisma.atom.findMany({
        where: {
          projectId,
          status: 'ACTIVE',
          slotMappings: { hasSome: [slotKey] },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      });

      if (atoms.length === 0) continue;

      const slotCtx: SlotContext = {
        slotKey,
        atoms: atoms.map(a => ({ id: a.id, content: a.content, layer: a.layer })),
        retryCount: 0,
      };
      ctx.slotContexts.set(slotKey, slotCtx);

      // C1: conflict-arbiter 检查冲突
      const conflictResult = await runAgentSafe(
        'conflict-arbiter',
        `槽位：${slotKey}\n原子块列表：\n${atoms.map(a => `[${a.layer}][${a.id}] ${a.content.slice(0, 200)}`).join('\n---\n')}`,
        ctx.sessionHistory.slice(-4)
      );

      const arbiterOutput = conflictResult.parsed as {
        finalAtoms: string[];
        droppedAtoms: string[];
        escalateToHuman: boolean;
      };

      // 过滤掉被仲裁丢弃的原子块
      const finalAtomIds = new Set(arbiterOutput.finalAtoms || atoms.map(a => a.id));
      const filteredAtoms = atoms.filter(a => finalAtomIds.has(a.id));

      // C2: slot-filler 生成内容（最多重试3次）
      let slotOutput = '';
      let qualityScore = 0;
      let passed = false;

      const dependencies = globalContext.crossSlotDependencies?.[slotKey] || [];
      const constraints = globalContext.keyConstraints?.join('; ') || '';
      const completedContext = ctx.completedSlots
        .slice(-3)
        .map(s => `${s}已完成`)
        .join(', ');

      for (let attempt = 0; attempt < 3; attempt++) {
        // slot-filler 生成
        const fillResult = await runAgentSafe(
          'slot-filler',
          `槽位：${slotKey}\n知识库原子块：\n${filteredAtoms.map(a => `[${a.layer}] ${a.content}`).join('\n---\n')}\n\n用户任务：${userQuery}\n全局约束：${constraints}\n依赖槽位：${dependencies.join(',')}\n已完成槽位：${completedContext}`,
          ctx.sessionHistory.slice(-4)
        );

        slotOutput = (fillResult.parsed as any)?.content
          || (fillResult.parsed as any)?.output
          || fillResult.output;

        // C3: quality-checker 打分
        const qcResult = await runAgentSafe(
          'quality-checker',
          `槽位：${slotKey}\n待检内容：${slotOutput.slice(0, 2000)}\n全局约束：${constraints}`,
          []
        );

        const qcOutput = qcResult.parsed as {
          totalScore: number;
          issues: string[];
          passed: boolean;
        };

        qualityScore = qcOutput.totalScore || 0;
        passed = qualityScore >= 70;

        if (passed) break;
        slotCtx.retryCount++;
        slotCtx.previousOutput = slotOutput;
      }

      // 更新会话历史（槽位产出摘要）
      ctx.sessionHistory.push({
        role: 'assistant',
        content: JSON.stringify({ slotKey, score: qualityScore, passed, preview: slotOutput.slice(0, 100) }),
        agentRole: 'slot-filler',
        timestamp: Date.now(),
      });

      if (passed) {
        ctx.completedSlots.push(slotKey);
        results.push({
          agentRole: 'slot-filler',
          slotKey,
          output: slotOutput,
          score: qualityScore,
          passed: true,
        });
      } else {
        ctx.failedSlots.push(slotKey);

        // C4: hitl-dispatcher 生成人工任务
        const hitlResult = await runAgentSafe(
          'hitl-dispatcher',
          `槽位：${slotKey}\n质检评分：${qualityScore}\n当前输出：${slotOutput.slice(0, 500)}\n用户任务：${userQuery}`,
          []
        );

        const hitlOutput = hitlResult.parsed as {
          urgency: string;
          taskDescription: string;
          fallbackOutput: string;
        };

        // 创建 HITL 任务
        const task = await prisma.reviewTask.create({
          data: {
            workflowRunId: run.id,
            triggerReason: hitlOutput.taskDescription || `${slotKey} 质检评分 ${qualityScore}，低于阈值70`,
            urgency: (hitlOutput.urgency as any) || 'YELLOW',
            status: 'PENDING',
          },
        });
        hitlTasks.push(task.id);

        // 使用降级输出
        results.push({
          agentRole: 'hitl-dispatcher',
          slotKey,
          output: hitlOutput.fallbackOutput || slotOutput,
          score: qualityScore,
          passed: false,
          metadata: { taskId: task.id },
        });
      }
    }

    // ── Step D: 汇总最终提示词 ─────────────────────────────────────
    const finalPrompt = results
      .filter(r => r.slotKey)
      .map(r => `## ${r.slotKey}\n\n${r.output}`)
      .join('\n\n---\n\n');

    const allPassed = ctx.failedSlots.length === 0;
    const avgScore = results.reduce((s, r) => s + (r.score || 0), 0) / (results.length || 1);

    // 更新 WorkflowRun
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: allPassed ? 'SUCCESS' : hitlTasks.length > 0 ? 'HUMAN_TAKEOVER' : 'DEGRADED',
        outputContent: finalPrompt,
        completedAt: new Date(),
      },
    });

    // 创建评估记录
    await prisma.evaluationRecord.create({
      data: {
        workflowRunId: run.id,
        s8Scores: results.reduce((acc, r) => ({ ...acc, [r.slotKey || '']: r.score || 0 }), {}),
        s9OverallScore: avgScore,
        passed: allPassed,
      },
    });

    return { runId: run.id, finalPrompt, results, hitlTasks };

  } catch (error) {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', completedAt: new Date() },
    });
    throw error;
  }
}