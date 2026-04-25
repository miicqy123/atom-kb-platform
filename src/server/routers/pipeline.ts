// src/server/routers/pipeline.ts
import { z } from 'zod';
import { router, protectedProcedure, permissionProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { normalizeToMarkdown, chunkMarkdown, autoTag } from '@/services/pipelineService';
import fs from 'fs';
import path from 'path';

export const pipelineRouter = router({
  // 触发单个 Raw 的完整 Track A 处理
  processRaw: permissionProcedure('raw:process')
    .input(z.object({ rawId: z.string(), projectId: z.string() }))
    .mutation(async ({ input }) => {
      const raw = await prisma.raw.findUniqueOrThrow({ where: { id: input.rawId } });

      await prisma.raw.update({
        where: { id: input.rawId },
        data: { conversionStatus: 'CONVERTING' },
      });

      try {
        const filePath = path.join(process.cwd(), 'uploads', raw.originalFileName || '');
        const buffer = fs.existsSync(filePath)
          ? fs.readFileSync(filePath)
          : Buffer.from(raw.markdownContent || '', 'utf-8');

        const markdown = raw.markdownContent || (await normalizeToMarkdown(buffer, raw.format));
        const chunks = await chunkMarkdown(markdown);

        const atoms = await Promise.all(
          chunks.map(async (chunk) => {
            const tags = await autoTag(chunk);
            return prisma.atom.create({
              data: {
                title: chunk.slice(0, 60).replace(/\n/g, ' ') + (chunk.length > 60 ? '…' : ''),
                content: chunk,
                projectId: input.projectId,
                rawId: input.rawId,
                layer: tags.layer,
                granularity: tags.granularity,
                dimensions: tags.dimensions,
                slotMappings: [tags.primarySlot, ...tags.secondarySlots],
                experienceSource: raw.experienceSource,
                exposureLevel: raw.exposureLevel,
                category: tags.category,
                subcategory: tags.subcategory,
                status: 'DRAFT',
                wordCount: chunk.length,
              },
            });
          })
        );

        await prisma.raw.update({
          where: { id: input.rawId },
          data: { conversionStatus: 'CONVERTED', markdownContent: markdown },
        });

        return { success: true, atomsCreated: atoms.length };
      } catch (error) {
        await prisma.raw.update({
          where: { id: input.rawId },
          data: { conversionStatus: 'FAILED' },
        });
        throw error;
      }
    }),

  // Track B：QA 对生成
  generateQA: protectedProcedure
    .input(z.object({ rawId: z.string(), projectId: z.string() }))
    .mutation(async ({ input }) => {
      const raw = await prisma.raw.findUniqueOrThrow({ where: { id: input.rawId } });
      if (!raw.markdownContent) throw new Error('请先完成 Track A 处理，生成 Markdown 内容');

      const { generateQAPairs } = await import('@/services/qaService');
      const pairs = await generateQAPairs(raw.markdownContent, raw.materialType);

      const created = await Promise.all(
        pairs.map((p) =>
          prisma.qAPair.create({
            data: {
              question: p.question,
              answer: p.answer,
              projectId: input.projectId,
              rawId: input.rawId,
              tags: p.tags,
              scenarios: [p.scenarios],
              questionKeywords: p.questionKeywords,
              difficulty: p.difficulty,
              materialType: raw.materialType,
              status: 'DRAFT',
              answerWordCount: p.answer.length,
              version: 1,
            },
          })
        )
      );

      return { success: true, qaPairsCreated: created.length };
    }),
});