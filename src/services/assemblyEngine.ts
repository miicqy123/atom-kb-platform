// src/services/assemblyEngine.ts
import { prisma } from '@/lib/prisma';
import { matchThinkingModel, getThinkingPrompt } from './thinkingModelMatcher';

const SLOT_ORDER = ['S0','S1','S2','S3','S4','S6','S5','S10','S7','S8','S9'];
const LAYER_PRIORITY: Record<string, number> = { D: 4, C: 3, B: 2, A: 1 };

export async function assembleBlueprint(blueprintId: string): Promise<string> {
  const blueprint = await prisma.blueprint.findUniqueOrThrow({
    where: { id: blueprintId },
    include: {
      slotConfigs: { include: { fetchRules: true } },
      project: true,
    },
  });

  // 查询项目关联的任务以确定思考模型
  const task = await prisma.task.findFirst({
    where: { projectId: blueprint.projectId },
    orderBy: { createdAt: 'desc' },
  });

  let thinkingPrefix = '';
  if (task) {
    const thinkingModel = matchThinkingModel(task.type);
    thinkingPrefix = getThinkingPrompt(thinkingModel);
  }

  const sections: string[] = [];

  // 按标准槽位顺序装配
  for (const slotKey of SLOT_ORDER) {
    const slotConfig = blueprint.slotConfigs.find(
      (s) => s.slotKey === slotKey && !s.subSlotKey
    );
    if (!slotConfig) continue;

    const atoms = await fetchAtomsForSlot(slotConfig, blueprint.projectId);
    if (atoms.length === 0) continue;

    let content = atoms
      .map((a) => `[${a.layer}·${slotKey}] ${a.content}`)
      .join('\n\n');

    // S5 槽位注入思考模型提示词
    if (slotKey === 'S5' && thinkingPrefix) {
      content = `${thinkingPrefix}\n\n${content}`;
    }

    sections.push(`## ${slotKey}\n\n${content}`);

    // 更新 assembledContent 缓存
    await prisma.slotConfig.update({
      where: { id: slotConfig.id },
      data: { assembledContent: content },
    });
  }

  return sections.join('\n\n---\n\n');
}

async function fetchAtomsForSlot(
  slotConfig: any,
  projectId: string
): Promise<any[]> {
  const rule = slotConfig.fetchRules[0];
  if (!rule) return [];

  const layers: string[] = rule.layers?.length ? rule.layers : ['A', 'B', 'C', 'D'];

  // 取料：只取 active 状态
  const candidates = await prisma.atom.findMany({
    where: {
      projectId,
      status: 'ACTIVE',
      layer: { in: layers as any[] },
      slotMappings: { hasSome: [slotConfig.slotKey] },
      ...(rule.dimensions?.length ? { dimensions: { hasSome: rule.dimensions } } : {}),
    },
    take: rule.topN || 3,
    orderBy: { updatedAt: 'desc' },
  });

  // 冲突仲裁：D > C > B > A
  const priority = slotConfig.conflictPriority as string[];
  return candidates.sort(
    (a, b) =>
      (priority.indexOf(b.layer) ?? -1) - (priority.indexOf(a.layer) ?? -1)
  );
}