// src/services/assemblyEngine.ts
import { prisma } from '@/lib/prisma';
import { matchThinkingModel, getThinkingPrompt } from './thinkingModelMatcher';
import type { TaskType } from '@prisma/client';

// 三层槽位分组
const LAYER_L1 = ['S0', 'S1'];  // 元数据层：始终加载，≤200 词
const LAYER_L2 = ['S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9']; // 指令层：按任务加载，≤3000 词
const LAYER_L3 = ['S10']; // 资源层：RAG 按需注入，无限制

const L1_MAX_TOKENS = 200;
const L2_MAX_TOKENS = 3000;

export async function assembleBlueprint(
  blueprintId: string,
  options?: { taskType?: TaskType; skipL3?: boolean }
): Promise<{
  prompt: string;
  layers: { L1: string; L2: string; L3: string };
  totalTokens: number;
  thinkingModel: string;
}> {
  const bp = await prisma.blueprint.findUniqueOrThrow({
    where: { id: blueprintId },
    include: {
      slotConfigs: {
        orderBy: { order: 'asc' },
        include: {
          fetchRules: true,
        },
      },
      atoms: { include: { atom: true } },
    },
  });

  // ━━━ L1：元数据层（始终加载）━━━
  let l1Content = '';
  for (const sc of bp.slotConfigs.filter(s => LAYER_L1.includes(s.slotKey))) {
    const slotAtoms = await fetchAtomsForSlot(bp.projectId, sc);
    const basePack = await prisma.basePack.findFirst({
      where: { slotKey: sc.slotKey, subSlotKey: sc.subSlotKey ?? undefined },
    });
    const content = [basePack?.content, ...slotAtoms.map(a => a.content)].filter(Boolean).join('\n');
    l1Content += `\n<!-- ${sc.slotKey} -->\n${content}\n`;
  }
  // S4.1 禁令总则也放入 L1
  const s4Base = await prisma.basePack.findFirst({ where: { slotKey: 'S4', subSlotKey: 'S4.1' } });
  if (s4Base) l1Content += `\n<!-- S4.1 禁令总则 -->\n${s4Base.content}\n`;

  // 截断 L1
  l1Content = truncateToTokens(l1Content, L1_MAX_TOKENS);

  // ━━━ L2：指令层（按任务加载）━━━
  const taskType = options?.taskType;
  const thinkingModel = taskType ? matchThinkingModel(taskType) : 'COT';
  const thinkingPrefix = getThinkingPrompt(thinkingModel);

  let l2Content = '';
  for (const sc of bp.slotConfigs.filter(s => LAYER_L2.includes(s.slotKey))) {
    const slotAtoms = await fetchAtomsForSlot(bp.projectId, sc);
    const basePack = await prisma.basePack.findFirst({
      where: { slotKey: sc.slotKey, subSlotKey: sc.subSlotKey ?? undefined },
    });
    let content = [basePack?.content, ...slotAtoms.map(a => a.content)].filter(Boolean).join('\n');

    // S5 前置注入思考模型
    if (sc.slotKey === 'S5') {
      content = `${thinkingPrefix}\n\n${content}`;
    }

    l2Content += `\n<!-- ${sc.slotKey} -->\n${content}\n`;
  }
  l2Content = truncateToTokens(l2Content, L2_MAX_TOKENS);

  // ━━━ L3：资源层（RAG 按需注入）━━━
  let l3Content = '';
  if (!options?.skipL3) {
    for (const sc of bp.slotConfigs.filter(s => LAYER_L3.includes(s.slotKey))) {
      const slotAtoms = await fetchAtomsForSlot(bp.projectId, sc);
      l3Content += slotAtoms.map(a => a.content).join('\n\n');
    }
  }

  const prompt = `${l1Content}\n\n${l2Content}\n\n${l3Content}`.trim();
  const totalTokens = Math.ceil(prompt.length / 2);

  return { prompt, layers: { L1: l1Content, L2: l2Content, L3: l3Content }, totalTokens, thinkingModel };
}

// ━━━ 按 FetchRule 精确检索原子块 ━━━
async function fetchAtomsForSlot(
  projectId: string,
  slotConfig: any
): Promise<Array<{ content: string }>> {
  const rules = slotConfig.fetchRules || [];
  if (rules.length === 0) return [];

  const where: any = {
    projectId,
    status: 'ACTIVE',
  };

  // 合并所有 FetchRule 的条件
  for (const rule of rules) {
    if (rule.layers?.length) where.layer = { in: rule.layers };
    if (rule.categories?.length) where.category = { in: rule.categories };
    if (rule.subcategories?.length) where.subcategory = { in: rule.subcategories };
  }

  const topN = rules[0]?.topN ?? 5;

  return prisma.atom.findMany({
    where,
    take: topN,
    orderBy: { updatedAt: 'desc' },
    select: { content: true },
  });
}

function truncateToTokens(text: string, maxTokens: number): string {
  // 粗估：1 中文字 ≈ 2 token，1 英文词 ≈ 1 token
  const estimated = Math.ceil(text.length / 2);
  if (estimated <= maxTokens) return text;
  const ratio = maxTokens / estimated;
  return text.slice(0, Math.floor(text.length * ratio));
}
