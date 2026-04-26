import { prisma } from '@/lib/prisma';
import { chunkMarkdown, autoTag, normalizeToMarkdown } from '@/services/pipelineService';
import { checkDuplicate } from '@/services/deduplication';
import fs from 'fs';
import path from 'path';

export interface AtomPipelineInput {
  rawId: string;
  projectId: string;
}

export interface AtomPipelineResult {
  atomCount: number;
  skippedDuplicates: number;
  qualityWarnings: number;
  needsReview: number;
}

// 更新管线进度的辅助函数
async function updateAtomProgress(
  rawId: string,
  currentStep: number,
  stepName: string,
  processed: number,
  total: number
) {
  await prisma.raw.update({
    where: { id: rawId },
    data: {
      atomPipelineStatus: stepName,
      atomPipelineProgress: {
        currentStep,
        totalSteps: 5,
        stepName,
        processed,
        total,
      },
    },
  });
}

export async function runAtomPipeline(input: AtomPipelineInput): Promise<AtomPipelineResult> {
  const { rawId, projectId } = input;
  const raw = await prisma.raw.findUniqueOrThrow({ where: { id: rawId } });

  let result: AtomPipelineResult = {
    atomCount: 0,
    skippedDuplicates: 0,
    qualityWarnings: 0,
    needsReview: 0,
  };

  try {
    // ═══ Step 1：Markdown 解析 ═══
    await updateAtomProgress(rawId, 1, 'parsing', 0, 1);
    let markdown = raw.markdownContent;
    if (!markdown) {
      const filePath = path.join(process.cwd(), 'uploads', raw.originalFileName || '');
      const buffer = fs.existsSync(filePath)
        ? fs.readFileSync(filePath)
        : Buffer.from('', 'utf-8');
      markdown = await normalizeToMarkdown(buffer, raw.format);
    }
    const chunks = await chunkMarkdown(markdown);
    await updateAtomProgress(rawId, 1, 'parsing', 1, 1);

    // ═══ Step 2：LLM 三级分类打标 ═══
    await updateAtomProgress(rawId, 2, 'classifying', 0, chunks.length);
    const taggedChunks: Array<{ chunk: string; tags: Awaited<ReturnType<typeof autoTag>> }> = [];
    for (let i = 0; i < chunks.length; i++) {
      const tags = await autoTag(chunks[i]);
      taggedChunks.push({ chunk: chunks[i], tags });
      await updateAtomProgress(rawId, 2, 'classifying', i + 1, chunks.length);
    }

    // ═══ Step 3：校验 · 去重 ═══
    await updateAtomProgress(rawId, 3, 'deduping', 0, taggedChunks.length);
    const validAtoms: typeof taggedChunks = [];
    for (let i = 0; i < taggedChunks.length; i++) {
      const item = taggedChunks[i];
      // 校验：subcategory 必须属于 category
      if (item.tags.category && item.tags.subcategory) {
        const CATEGORY_SUBCATEGORY_MAP: Record<string, string[]> = {
          CAT_WHO: ['WHO_BRAND', 'WHO_ROLE', 'WHO_AUDIENCE', 'WHO_TERM'],
          CAT_WHAT: ['WHAT_PRODUCT', 'WHAT_USP', 'WHAT_PRICE', 'WHAT_CERT'],
          CAT_HOW: ['HOW_SOP', 'HOW_METHOD', 'HOW_TACTIC', 'HOW_BEST'],
          CAT_STYLE: ['STYLE_HOOK', 'STYLE_WORD', 'STYLE_TONE', 'STYLE_RHYTHM'],
          CAT_FENCE: ['FENCE_BAN', 'FENCE_ALLOW', 'FENCE_LAW', 'FENCE_BLUR'],
          CAT_PROOF: ['PROOF_CASE', 'PROOF_DATA', 'PROOF_FAIL', 'PROOF_COMPARE'],
        };
        const valid = CATEGORY_SUBCATEGORY_MAP[item.tags.category];
        if (valid && !valid.includes(item.tags.subcategory)) {
          item.tags.subcategory = null; // 互斥校验失败，清空子类别
        }
      }
      // 去重
      const dedup = await checkDuplicate(projectId, item.chunk);
      if (dedup.isDuplicate) {
        result.skippedDuplicates++;
      } else {
        validAtoms.push(item);
      }
      await updateAtomProgress(rawId, 3, 'deduping', i + 1, taggedChunks.length);
    }

    // ═══ Step 4：质量检查 ═══
    await updateAtomProgress(rawId, 4, 'checking', 0, validAtoms.length);
    const passedAtoms: typeof validAtoms = [];
    for (let i = 0; i < validAtoms.length; i++) {
      const item = validAtoms[i];
      let hasWarning = false;
      // 字数检查
      if (item.chunk.length < 50) {
        result.qualityWarnings++;
        hasWarning = true;
      }
      // 分类完整性
      if (!item.tags.category || !item.tags.subcategory) {
        result.qualityWarnings++;
        hasWarning = true;
      }
      // C/D 层标记需人工确认
      if (item.tags.layer === 'C' || item.tags.layer === 'D') {
        result.needsReview++;
      }
      passedAtoms.push(item);
      await updateAtomProgress(rawId, 4, 'checking', i + 1, validAtoms.length);
    }

    // ═══ Step 5：入库确认 ═══
    await updateAtomProgress(rawId, 5, 'saving', 0, passedAtoms.length);
    for (let i = 0; i < passedAtoms.length; i++) {
      const { chunk, tags } = passedAtoms[i];
      await prisma.atom.create({
        data: {
          title: chunk.slice(0, 60).replace(/\n/g, ' ') + (chunk.length > 60 ? '…' : ''),
          content: chunk,
          projectId,
          rawId,
          layer: tags.layer as any,
          granularity: tags.granularity as any,
          dimensions: tags.dimensions,
          slotMappings: [tags.primarySlot, ...tags.secondarySlots],
          experienceSource: raw.experienceSource,
          exposureLevel: raw.exposureLevel,
          category: tags.category as any,
          subcategory: tags.subcategory as any,
          status: 'DRAFT',
          wordCount: chunk.length,
        },
      });
      result.atomCount++;
      await updateAtomProgress(rawId, 5, 'saving', i + 1, passedAtoms.length);
    }

    // 完成
    await prisma.raw.update({
      where: { id: rawId },
      data: {
        atomPipelineStatus: 'done',
        markdownContent: markdown,
        atomCount: result.atomCount,
      },
    });

    return result;
  } catch (error) {
    await prisma.raw.update({
      where: { id: rawId },
      data: { atomPipelineStatus: 'failed' },
    });
    throw error;
  }
}
