import { prisma } from '@/lib/prisma';
import { normalizeToMarkdown } from '@/services/pipelineService';
import { splitIntoSections, generateQAFromSection } from '@/services/qaService';
import { generateEmbedding } from '@/services/embeddingService';
import { upsertVectors, VectorPoint } from '@/services/vectorStore';
import fs from 'fs';
import path from 'path';

export interface QAPipelineInput {
  rawId: string;
  projectId: string;
}

export interface QAPipelineResult {
  qaCount: number;
  vectorizedCount: number;
  sectionsProcessed: number;
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
        totalSteps: 4,
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
    vectorizedCount: 0,
    sectionsProcessed: 0,
  };

  try {
    // ═══ Step 1：Markdown 解析 → 段落分组 ═══
    await updateQAProgress(rawId, 1, 'parsing', 0, 1);
    let markdown = raw.markdownContent;
    if (!markdown) {
      const filePath = path.join(process.cwd(), 'uploads', raw.originalFileName || '');
      const buffer = fs.existsSync(filePath)
        ? fs.readFileSync(filePath)
        : Buffer.from('', 'utf-8');
      markdown = await normalizeToMarkdown(buffer, raw.format);
    }
    const sections = splitIntoSections(markdown);
    result.sectionsProcessed = sections.length;
    await updateQAProgress(rawId, 1, 'parsing', 1, 1);

    // ═══ Step 2：LLM 结构化 QA 提取 ═══
    await updateQAProgress(rawId, 2, 'generating', 0, sections.length);
    interface QAPairWithMeta {
      question: string;
      answer: string;
      tags: string[];
      scenarios: string[];
      questionKeywords: string[];
      difficulty: string;
    }
    const allPairs: QAPairWithMeta[] = [];
    for (let i = 0; i < sections.length; i++) {
      const pairs = await generateQAFromSection(sections[i], raw.materialType);
      allPairs.push(...pairs);
      await updateQAProgress(rawId, 2, 'generating', i + 1, sections.length);
    }

    // ═══ Step 3：Qwen Embedding 向量化 ═══
    await updateQAProgress(rawId, 3, 'embedding', 0, allPairs.length);
    const embeddings: number[][] = [];
    for (let i = 0; i < allPairs.length; i++) {
      const pair = allPairs[i];
      const embeddingInput = `${pair.question} ${(pair.questionKeywords || []).join(' ')}`;
      const emb = await generateEmbedding(embeddingInput);
      embeddings.push(emb.vector);
      await updateQAProgress(rawId, 3, 'embedding', i + 1, allPairs.length);
    }

    // ═══ Step 4：写入 Prisma + Qdrant ═══
    await updateQAProgress(rawId, 4, 'saving', 0, allPairs.length);
    const vectorPoints: VectorPoint[] = [];
    for (let i = 0; i < allPairs.length; i++) {
      const pair = allPairs[i];
      const created = await prisma.qAPair.create({
        data: {
          question: pair.question,
          answer: pair.answer,
          projectId,
          rawId,
          tags: pair.tags || [],
          scenarios: pair.scenarios,
          questionKeywords: pair.questionKeywords || [],
          difficulty: (pair.difficulty as any) || 'BEGINNER',
          materialType: raw.materialType,
          status: 'DRAFT',
          answerWordCount: pair.answer.length,
          version: 1,
        },
      });
      vectorPoints.push({
        id: created.id,
        vector: embeddings[i],
        payload: {
          question: pair.question,
          answer: pair.answer.slice(0, 500),
          projectId,
          rawId,
          tags: pair.tags,
          difficulty: pair.difficulty,
        },
      });
      result.qaCount++;
      await updateQAProgress(rawId, 4, 'saving', i + 1, allPairs.length);
    }

    if (vectorPoints.length > 0) {
      await upsertVectors(vectorPoints);
      result.vectorizedCount = vectorPoints.length;
    }

    await prisma.raw.update({
      where: { id: rawId },
      data: {
        qaPipelineStatus: 'done',
        markdownContent: markdown,
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
