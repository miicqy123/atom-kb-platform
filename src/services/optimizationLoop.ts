// src/services/optimizationLoop.ts
import { prisma } from '@/lib/prisma';
import type { PromptStatus } from '@prisma/client';

// ━━━ 7 维度评分 ━━━
interface ScoreDimensions {
  roleClarity: number;      // 角色清晰度 15%
  taskClarity: number;      // 任务明确性 20%
  inputCompleteness: number; // 输入完整性 15%
  outputStandard: number;   // 输出规范性 15%
  boundaryConstraint: number; // 边界约束 15%
  structureReason: number;  // 结构合理性 10%
  conciseness: number;      // 简洁度 10%
}

const WEIGHTS = {
  roleClarity: 0.15,
  taskClarity: 0.20,
  inputCompleteness: 0.15,
  outputStandard: 0.15,
  boundaryConstraint: 0.15,
  structureReason: 0.10,
  conciseness: 0.10,
};

// ━━━ 评分器 ━━━
export async function scorePrompt(promptText: string): Promise<{
  overall: number;
  dimensions: ScoreDimensions;
  diagnosis: string[];
}> {
  const { callLLM } = await import('@/services/modelGateway');

  const systemPrompt = `你是提示词质量评分专家。请对以下提示词进行 7 维度评分（1-5分）。

评分维度：
1. roleClarity（角色清晰度）：角色定义是否明确、能力边界是否清晰
2. taskClarity（任务明确性）：任务目标是否具体、可执行
3. inputCompleteness（输入完整性）：输入要求是否完备
4. outputStandard（输出规范性）：输出格式是否精确到标点/结构
5. boundaryConstraint（边界约束）：禁令/限制是否充分
6. structureReason（结构合理性）：整体结构是否逻辑通顺
7. conciseness（简洁度）：是否有冗余/重复内容`;

  const userPrompt = `请对以下提示词进行评分：

${promptText.slice(0, 8000)}

请严格返回 JSON：
{
  "scores": { "roleClarity": 4, ... },
  "diagnosis": ["问题1描述", "问题2描述"]
}`;

  const response = await callLLM('evaluation', systemPrompt, userPrompt, {
    temperature: 0,
    maxTokens: 500,
    jsonMode: true,
  });

  const parsed = JSON.parse(response.content);
  const dims = parsed.scores as ScoreDimensions;

  const overall = Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + (dims[key as keyof ScoreDimensions] || 0) * weight,
    0
  );

  return { overall: Math.round(overall * 100) / 100, dimensions: dims, diagnosis: parsed.diagnosis || [] };
}

// ━━━ 优化器选择 ━━━
function selectOptimizer(score: number, diagnosis: string[]): string {
  if (score < 2.0) {
    const hasStructureIssue = diagnosis.some(d => d.includes('结构') || d.includes('混乱'));
    const hasUnclearNeed = diagnosis.some(d => d.includes('需求') || d.includes('不清'));
    if (hasUnclearNeed) return 'JOHARI';
    if (hasStructureIssue) return 'LQ22PRO';
    return 'LYRA';
  }
  if (score < 3.5) return 'LYRA';
  if (score < 4.0) return 'LYRA';
  return 'SYSTEM_PRO';
}

// ━━━ 优化器执行 ━━━
async function runOptimizer(optimizer: string, promptText: string, diagnosis: string[]): Promise<string> {
  const { callLLM } = await import('@/services/modelGateway');

  const optimizerSystem: Record<string, string> = {
    LYRA: '你是 Lyra 提示词优化器。请根据以下诊断结果优化提示词。',
    JOHARI: '你是乔哈里窗口诊断优化器。该提示词的需求不清晰。请先诊断盲区，然后重写提示词。',
    LQ22PRO: '你是 LQ-2.2Pro 结构重写优化器。该提示词结构混乱，需要彻底重组。请保留所有有价值的内容但重新组织结构。',
    SYSTEM_PRO: '你是系统提示词最终精修优化器。该提示词已达到较高水平（≥4.0），请进行最后的微调精修。',
  };

  const optimizerUser: Record<string, string> = {
    LYRA: `诊断问题：\n${diagnosis.join('\n')}\n\n原始提示词：\n${promptText}\n\n请直接输出优化后的完整提示词：`,
    JOHARI: `原始提示词：\n${promptText}\n\n请直接输出优化后的完整提示词：`,
    LQ22PRO: `原始提示词：\n${promptText}\n\n请直接输出优化后的完整提示词：`,
    SYSTEM_PRO: `原始提示词：\n${promptText}\n\n请直接输出精修后的完整提示词：`,
  };

  const response = await callLLM('optimization', optimizerSystem[optimizer] || optimizerSystem.LYRA, optimizerUser[optimizer] || optimizerUser.LYRA, {
    temperature: 0.3,
    maxTokens: 8000,
  });

  return response.content;
}

// ━━━ 闭环主函数 ━━━
export async function optimizationLoop(promptId: string): Promise<{
  finalScore: number;
  rounds: number;
  optimizer: string | null;
  status: PromptStatus;
}> {
  const MAX_ROUNDS = 3;
  const PASS_SCORE = 4.0;

  let prompt = await prisma.prompt.findUniqueOrThrow({ where: { id: promptId } });
  let currentText = prompt.fullText;
  let lastScore = 0;
  let lastOptimizer: string | null = null;
  let round = 0;

  for (round = 0; round < MAX_ROUNDS; round++) {
    const result = await scorePrompt(currentText);
    lastScore = result.overall;

    await prisma.prompt.update({
      where: { id: promptId },
      data: {
        score: lastScore,
        scoreDimensions: result.dimensions as any,
        optimizationRound: round + 1,
      },
    });

    if (lastScore >= PASS_SCORE) {
      if (lastScore < 4.5) {
        currentText = await runOptimizer('SYSTEM_PRO', currentText, result.diagnosis);
        lastOptimizer = 'SYSTEM_PRO';
      }
      break;
    }

    lastOptimizer = selectOptimizer(lastScore, result.diagnosis);
    currentText = await runOptimizer(lastOptimizer, currentText, result.diagnosis);
  }

  const finalStatus: PromptStatus = lastScore >= PASS_SCORE ? 'READY' : 'DRAFT';

  await prisma.prompt.update({
    where: { id: promptId },
    data: {
      fullText: currentText,
      score: lastScore,
      optimizerUsed: lastOptimizer,
      optimizationRound: round + 1,
      status: finalStatus,
    },
  });

  return { finalScore: lastScore, rounds: round + 1, optimizer: lastOptimizer, status: finalStatus };
}
