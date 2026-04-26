import { prisma } from '@/lib/prisma';
import { normalizeToMarkdown } from '@/services/pipelineService';
import { checkDuplicate } from '@/services/deduplication';
import { smartChunkMarkdown } from '@/services/smartChunker';
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
        totalSteps: 4,
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
    // ═══ Step 1：LLM 智能切块 + 三级分类（合并原 Step1+2）═══
    await updateAtomProgress(rawId, 1, 'smart_chunking', 0, 1);
    let markdown = raw.markdownContent;
    if (!markdown) {
      const filePath = path.join(process.cwd(), 'uploads', raw.originalFileName || '');
      const buffer = fs.existsSync(filePath)
        ? fs.readFileSync(filePath)
        : Buffer.from('', 'utf-8');
      markdown = await normalizeToMarkdown(buffer, raw.format);
    }

    interface TaggedChunk {
      chunk: string;
      tags: {
        category: string | null;
        subcategory: string | null;
        layer: string | null;
        granularity: string | null;
        dimensions: number[];
        primarySlot: string;
        secondarySlots: string[];
      };
      needsReview: boolean;
      title: string;
    }

    let taggedChunks: TaggedChunk[];

    try {
      const chunkResult = await smartChunkMarkdown(
        markdown,
        raw.materialType,
        raw.experienceSource || 'E1_COMPANY'
      );

      taggedChunks = chunkResult.chunks.map(c => ({
        chunk: c.content,
        tags: {
          category: c.category,
          subcategory: c.subcategory,
          layer: null,
          granularity: null,
          dimensions: [],
          primarySlot: '',
          secondarySlots: [],
        },
        needsReview: c.qualityFlags.needsReview,
        title: c.title,
      }));
    } catch (e) {
      // 降级：smartChunkMarkdown 失败 → 旧规则切块 + autoTag
      console.warn('[atomPipeline] smartChunkMarkdown failed, falling back:', e);
      const { chunkMarkdown, autoTag } = await import('@/services/pipelineService');
      const chunks = await chunkMarkdown(markdown);
      const fallbackChunks: TaggedChunk[] = [];
      for (const chunk of chunks) {
        const tags = await autoTag(chunk);
        fallbackChunks.push({
          chunk,
          tags: {
            category: tags.category,
            subcategory: tags.subcategory,
            layer: tags.layer,
            granularity: tags.granularity,
            dimensions: tags.dimensions,
            primarySlot: tags.primarySlot,
            secondarySlots: tags.secondarySlots,
          },
          needsReview: tags.layer === 'C' || tags.layer === 'D',
          title: chunk.slice(0, 60).replace(/\n/g, ' ') + (chunk.length > 60 ? '…' : ''),
        });
      }
      taggedChunks = fallbackChunks;
    }

    await updateAtomProgress(rawId, 1, 'smart_chunking', 1, 1);

    // ═══ Step 2：校验 · 去重（原 Step 3）═══
    await updateAtomProgress(rawId, 2, 'deduping', 0, taggedChunks.length);
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
          item.tags.subcategory = null;
        }
      }
      // 去重
      const dedup = await checkDuplicate(projectId, item.chunk);
      if (dedup.isDuplicate) {
        result.skippedDuplicates++;
      } else {
        validAtoms.push(item);
      }
      await updateAtomProgress(rawId, 2, 'deduping', i + 1, taggedChunks.length);
    }

    // ═══ Step 3：质量检查（原 Step 4）═══
    await updateAtomProgress(rawId, 3, 'checking', 0, validAtoms.length);
    const passedAtoms: typeof validAtoms = [];
    for (let i = 0; i < validAtoms.length; i++) {
      const item = validAtoms[i];
      let hasWarning = false;
      if (item.chunk.length < 50) {
        result.qualityWarnings++;
        hasWarning = true;
      }
      if (!item.tags.category || !item.tags.subcategory) {
        result.qualityWarnings++;
        hasWarning = true;
      }
      if (item.tags.layer === 'C' || item.tags.layer === 'D') {
        result.needsReview++;
      }
      passedAtoms.push(item);
      await updateAtomProgress(rawId, 3, 'checking', i + 1, validAtoms.length);
    }

    // ═══ Step 4：入库确认（原 Step 5）═══
    await updateAtomProgress(rawId, 4, 'saving', 0, passedAtoms.length);
    for (let i = 0; i < passedAtoms.length; i++) {
      const { chunk, tags, title } = passedAtoms[i];
      await prisma.atom.create({
        data: {
          title: title || chunk.slice(0, 60).replace(/\n/g, ' ') + (chunk.length > 60 ? '…' : ''),
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
      await updateAtomProgress(rawId, 4, 'saving', i + 1, passedAtoms.length);
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
