import { prisma } from '@/lib/prisma';
import { splitIntoSections, generateQAFromSection } from '@/services/qaService';
import { generateEmbeddingBatch } from '@/services/embeddingService';
import { upsertVectors } from '@/services/vectorStore';

export interface QAPipelineInput {
  rawId: string;
  projectId: string;
}

export interface QAPipelineResult {
  qaCount: number;
  skippedDuplicates: number;
  qualityWarnings: number;
  sectionCount: number;
}

async function updateQAProgress(
  rawId: string,
  currentStep: number,
  stepName: string,
  processed: number,
  total: number
) {
  await prisma.raw.update({
    where: { id: rawId },
    data: {
      qaPipelineStatus: stepName,
      qaPipelineProgress: {
        currentStep,
        totalSteps: 5,
        stepName,
        processed,
        total,
      },
    },
  });
}

export async function runQAPipeline(input: QAPipelineInput): Promise<QAPipelineResult> {
  const { rawId, projectId } = input;
  const raw = await prisma.raw.findUniqueOrThrow({ where: { id: rawId } });

  let result: QAPipelineResult = {
    qaCount: 0,
    skippedDuplicates: 0,
    qualityWarnings: 0,
    sectionCount: 0,
  };

  try {
    // ═══ Step 1：Markdown → 段落切分 ═══
    const markdown = raw.markdownContent;
    if (!markdown) {
      throw new Error('Raw has no markdown content');
    }
    await updateQAProgress(rawId, 1, 'splitting', 0, 1);
    const sections = splitIntoSections(markdown);
    result.sectionCount = sections.length;
    await updateQAProgress(rawId, 1, 'splitting', 1, 1);

    // ═══ Step 2：逐个段落生成 QA 对 ═══
    await updateQAProgress(rawId, 2, 'generating', 0, sections.length);
    const materialType = raw.materialType || 'GENERAL';
    interface SectionQA { sectionIndex: number; qas: any[] }
    const allGenerated: SectionQA[] = [];
    for (let i = 0; i < sections.length; i++) {
      const qas = await generateQAFromSection(sections[i], materialType);
      allGenerated.push({ sectionIndex: i, qas });
      await updateQAProgress(rawId, 2, 'generating', i + 1, sections.length);
    }

    // 展平所有 QA 对
    const flatQAs = allGenerated.flatMap(sq => sq.qas);

    // ═══ Step 3：校验 ═══
    await updateQAProgress(rawId, 3, 'validating', 0, flatQAs.length);
    interface ValidQA { qa: any; hasWarning: boolean }
    const validQAs: ValidQA[] = [];
    for (let i = 0; i < flatQAs.length; i++) {
      const qa = flatQAs[i];
      let hasWarning = false;
      if (!qa.question || !qa.answer) {
        result.qualityWarnings++;
        hasWarning = true;
        continue;
      }
      if ((qa.answer as string).length < 50) {
        result.qualityWarnings++;
        hasWarning = true;
      }
      if (!qa.difficulty) {
        qa.difficulty = 'BEGINNER';
        result.qualityWarnings++;
        hasWarning = true;
      }
      validQAs.push({ qa, hasWarning });
      await updateQAProgress(rawId, 3, 'validating', i + 1, flatQAs.length);
    }

    // ═══ Step 4：去重 ═══
    await updateQAProgress(rawId, 4, 'deduping', 0, validQAs.length);
    const dedupedQAs: typeof validQAs = [];
    for (let i = 0; i < validQAs.length; i++) {
      const item = validQAs[i];
      const dupCheck = await prisma.qAPair.findFirst({
        where: { projectId, question: item.qa.question },
      });
      if (dupCheck) {
        result.skippedDuplicates++;
      } else {
        dedupedQAs.push(item);
      }
      await updateQAProgress(rawId, 4, 'deduping', i + 1, validQAs.length);
    }

    // ═══ Step 5：向量化 + 入库 ═══
    await updateQAProgress(rawId, 5, 'saving', 0, dedupedQAs.length);

    // 5a：收集所有 QA 的文本（用 answer 生成向量）
    const textsForEmbedding = dedupedQAs.map(item => item.qa.answer);

    // 5b：批量生成 embedding
    const embeddings = textsForEmbedding.length > 0
      ? await generateEmbeddingBatch(textsForEmbedding)
      : [];

    // 5c：同时写入 PostgreSQL + Qdrant
    for (let i = 0; i < dedupedQAs.length; i++) {
      const { qa } = dedupedQAs[i];
      const saved = await prisma.qAPair.create({
        data: {
          question: qa.question,
          answer: qa.answer,
          projectId,
          rawId,
          tags: qa.tags || [],
          difficulty: qa.difficulty,
          scenarios: qa.scenarios ? [qa.scenarios] : [],
          questionKeywords: qa.questionKeywords || [],
          materialType: materialType as any,
          status: 'DRAFT',
        },
      });

      // 同步写入 Qdrant 向量库
      if (embeddings[i]) {
        await upsertVectors([
          {
            id: saved.id,
            vector: embeddings[i].vector,
            payload: {
              question: qa.question,
              answer: qa.answer,
              projectId,
              rawId,
              tags: qa.tags || [],
              difficulty: qa.difficulty || 'BEGINNER',
            },
          },
        ]);
      }

      result.qaCount++;
      await updateQAProgress(rawId, 5, 'saving', i + 1, dedupedQAs.length);
    }

    // 完成
    await prisma.raw.update({
      where: { id: rawId },
      data: {
        qaPipelineStatus: 'done',
        qaCount: result.qaCount,
      },
    });

    return result;
  } catch (error) {
    await prisma.raw.update({
      where: { id: rawId },
      data: { qaPipelineStatus: 'failed' },
    });
    throw error;
  }
}
