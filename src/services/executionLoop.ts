// src/services/executionLoop.ts
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export interface NodeResult {
  slotKey: string;
  output: string;
  score: number;
  passed: boolean;
  retries: number;
}

export async function runNode(
  runId: string,
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
    const plan = `你负责 ${slotKey} 槽位的内容生成。
知识库内容：
${atoms.map(a => `[${a.layer}] ${a.content}`).join('\n---\n')}
用户任务：${userQuery}`;

    const genRes = await openai.chat.completions.create({
      model: 'qwen-turbo',
      messages: [
        { role: 'system', content: plan },
        { role: 'user', content: `请根据上述知识库，为 ${slotKey} 槽位生成内容。` },
      ],
      temperature: 0.3,
    });
    output = genRes.choices[0].message.content || '';

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

    if (score >= 70) break;
    retries++;
  }

  try {
    const { logTrace } = await import('@/lib/telemetry');
    logTrace({
      traceId: runId,
      node: slotKey,
      durationMs: Date.now() - nodeStartTime,
      tokens: 0,
      passed: score >= 70,
      score,
      slotKey,
    });
  } catch (e) {
    console.error('[Telemetry] logTrace error:', e);
  }

  return { slotKey, output, score, passed: score >= 70, retries };
}

export async function runBlueprint(
  blueprintId: string,
  projectId: string,
  userQuery: string
): Promise<{ results: NodeResult[]; runId: string }> {
  const SLOT_ORDER = ['S0','S1','S2','S3','S4','S6','S5','S10','S7','S8','S9'];

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

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: allPassed ? 'SUCCESS' : 'DEGRADED',
      outputContent: finalOutput,
      completedAt: new Date(),
    },
  });

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