// src/services/executionLoop.ts
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export interface NodeResult {
  slotKey: string;
  output: string;
  score: number;
  passed: boolean;
  retries: number;
}

// 单节点 3A 闭环：Planner → Generator → Evaluator
export async function runNode(
  runId: string,  // Add runId parameter to be able to track the trace properly
  slotKey: string,
  atoms: { content: string; layer: string }[],
  userQuery: string,
  maxRetries = 3
): Promise<NodeResult> {
  let retries = 0;
  let output = '';
  let score = 0;
  const nodeStartTime = Date.now();

  while (retries < maxRetries) {
    // ── Planner：确定本节点目标 ──────────────────────────────
    const plan = `你负责 ${slotKey} 槽位的内容生成。
知识库内容：
${atoms.map(a => `[${a.layer}] ${a.content}`).join('\n---\n')}
用户任务：${userQuery}`;

    // ── Generator：生成输出 ──────────────────────────────────
    const genRes = await openai.chat.completions.create({
      model: 'qwen-turbo',
      messages: [
        { role: 'system', content: plan },
        { role: 'user', content: `请根据上述知识库，为 ${slotKey} 槽位生成内容。` },
      ],
      temperature: 0.3,
    });
    output = genRes.choices[0].message.content || '';

    // ── Evaluator：S8 对抗清单打分 ──────────────────────────
    const evalRes = await openai.chat.completions.create({
      model: 'qwen-turbo',
      messages: [{
        role: 'user',
        content: `对以下内容做 S8 质检，从0-100打分，返回JSON {"score":数字, "issues":["问题1",...]}
检查项：1.无占位符 2.无空洞表述 3.无跳步 4.红线未越界 5.结构完整
内容：${output.slice(0, 2000)}`,
      }],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const evalData = JSON.parse(evalRes.choices[0].message.content || '{"score":0}');
    score = evalData.score || 0;

    if (score >= 70) break; // 通过阈值
    retries++;
  }

  const { logTrace } = await import('@/lib/telemetry');
  logTrace({
    traceId: runId,     // Now we can pass the actual runId
    node: slotKey,
    durationMs: Date.now() - nodeStartTime,
    tokens: 0,           // 可从 genRes.usage?.total_tokens 获取
    passed: score >= 70,
    score,
    slotKey,
  });

  return {
    slotKey,
    output,
    score,
    passed: score >= 70,
    retries,
  };
}

// 整条蓝图的完整执行（逐槽位 3A 闭环）
export async function runBlueprint(
  blueprintId: string,
  projectId: string,
  userQuery: string
): Promise<{ results: NodeResult[]; runId: string }> {
  const SLOT_ORDER = ['S0','S1','S2','S3','S4','S6','S5','S10','S7','S8','S9'];

  // 创建 WorkflowRun 记录
  const run = await prisma.workflowRun.create({
    data: {
      blueprintId,
      projectId,
      status: 'RUNNING',
      inputData: { userQuery },
      startedAt: new Date(),
    },
  });

  const results: NodeResult[] = [];

  for (const slotKey of SLOT_ORDER) {
    // 取该槽位的 active 原子块
    const slotAtoms = await prisma.atom.findMany({
      where: {
        projectId,
        status: 'ACTIVE',
        slotMappings: { hasSome: [slotKey] },
      },
      take: 3,
      orderBy: { updatedAt: 'desc' },
    });

    if (slotAtoms.length === 0) continue;

    const result = await runNode(
      run.id,
      slotKey,
      slotAtoms.map(a => ({ content: a.content, layer: a.layer })),
      userQuery
    );
    results.push(result);

    // 如果重试3次仍不通过 → 创建 HITL 任务
    if (!result.passed) {
      await prisma.reviewTask.create({
        data: {
          workflowRunId: run.id,
          triggerReason: `${slotKey} 节点质检评分 ${result.score}，低于阈值70`,
          urgency: 'YELLOW',
          status: 'PENDING',
        },
      });
    }
  }

  const allPassed = results.every(r => r.passed);
  const finalOutput = results.map(r => `## ${r.slotKey}\n\n${r.output}`).join('\n\n---\n\n');

  // 更新 WorkflowRun
  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: allPassed ? 'SUCCESS' : 'DEGRADED',
      outputContent: finalOutput,
      completedAt: new Date(),
    },
  });

  // 创建 EvaluationRecord
  await prisma.evaluationRecord.create({
    data: {
      workflowRunId: run.id,
      s8Scores: results.reduce((acc, r) => ({ ...acc, [r.slotKey]: r.score }), {}),
      s9OverallScore: results.reduce((s, r) => s + r.score, 0) / (results.length || 1),
      passed: allPassed,
    },
  });

  return { results, runId: run.id };
}