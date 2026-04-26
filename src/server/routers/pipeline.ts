// src/server/routers/pipeline.ts
import { z } from 'zod';
import { router, protectedProcedure, permissionProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { normalizeToMarkdown, chunkMarkdown, autoTag } from '@/services/pipelineService';
import { runAtomPipeline } from '@/services/atomPipeline';
import { runQAPipeline } from '@/services/qaPipeline';
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

            // ━━━ 新增：去重校验 ━━━
            const { checkDuplicate } = await import('@/services/deduplication');
            const dedup = await checkDuplicate(input.projectId, chunk);
            if (dedup.isDuplicate) {
              console.log(`跳过重复原子块，相似度 ${dedup.similarity}，已有 ${dedup.similarAtomId}`);
              return null;
            }
            // ━━━ 去重结束 ━━━

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
        ).then(results => results.filter(Boolean));

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

  // 获取 Raw 的管线进度
  getProgress: protectedProcedure
    .input(z.object({ rawId: z.string() }))
    .query(async ({ input }) => {
      return prisma.raw.findUniqueOrThrow({
        where: { id: input.rawId },
        select: {
          conversionStatus: true,
          processingMode: true,
          atomPipelineStatus: true,
          atomPipelineProgress: true,
          qaPipelineStatus: true,
          qaPipelineProgress: true,
          atomCount: true,
          qaCount: true,
        },
      });
    }),

  // 按加工模式处理（ATOM_ONLY / QA_ONLY / DUAL）
  processWithMode: permissionProcedure('raw:process')
    .input(z.object({
      rawId: z.string(),
      projectId: z.string(),
      mode: z.enum(['ATOM_ONLY', 'QA_ONLY', 'DUAL']),
    }))
    .mutation(async ({ input }) => {
      const { rawId, projectId, mode } = input;

      const statusMap: Record<'ATOM_ONLY' | 'QA_ONLY' | 'DUAL', string> = {
        ATOM_ONLY: 'ATOM_PROCESSING',
        QA_ONLY: 'QA_PROCESSING',
        DUAL: 'DUAL_PROCESSING',
      };

      const finalStatusMap: Record<'ATOM_ONLY' | 'QA_ONLY' | 'DUAL', string> = {
        ATOM_ONLY: 'ATOM_DONE',
        QA_ONLY: 'QA_DONE',
        DUAL: 'DUAL_DONE',
      };

      await prisma.raw.update({
        where: { id: rawId },
        data: {
          conversionStatus: statusMap[mode] as any,
          processingMode: mode as any,
          atomPipelineStatus:
            mode === 'ATOM_ONLY' || mode === 'DUAL' ? 'idle' : null,
          qaPipelineStatus:
            mode === 'QA_ONLY' || mode === 'DUAL' ? 'idle' : null,
          atomPipelineProgress: null,
          qaPipelineProgress: null,
        },
      });

      let atomCount = 0;
      let qaCount = 0;

      try {
        if (mode === 'ATOM_ONLY') {
          const result = await runAtomPipeline({ rawId, projectId });
          atomCount = result.atomCount;
        }

        if (mode === 'QA_ONLY') {
          const result = await runQAPipeline({ rawId, projectId });
          qaCount = result.qaCount;
        }

        if (mode === 'DUAL') {
          const [atomResult, qaResult] = await Promise.allSettled([
            runAtomPipeline({ rawId, projectId }),
            runQAPipeline({ rawId, projectId }),
          ]);

          if (atomResult.status === 'fulfilled') {
            atomCount = atomResult.value.atomCount;
          } else {
            console.error('[DUAL] Atom pipeline failed:', atomResult.reason);
            await prisma.raw.update({
              where: { id: rawId },
              data: { atomPipelineStatus: 'failed' },
            });
          }

          if (qaResult.status === 'fulfilled') {
            qaCount = qaResult.value.qaCount;
          } else {
            console.error('[DUAL] QA pipeline failed:', qaResult.reason);
            await prisma.raw.update({
              where: { id: rawId },
              data: { qaPipelineStatus: 'failed' },
            });
          }
        }

        await prisma.raw.update({
          where: { id: rawId },
          data: {
            conversionStatus: finalStatusMap[mode] as any,
            atomCount,
            qaCount,
          },
        });

        return {
          atomCount,
          qaCount,
          mode,
        };
      } catch (error) {
        await prisma.raw.update({
          where: { id: rawId },
          data: {
            conversionStatus: 'FAILED' as any,
            atomPipelineStatus:
              mode === 'ATOM_ONLY' || mode === 'DUAL' ? 'failed' : undefined,
            qaPipelineStatus:
              mode === 'QA_ONLY' || mode === 'DUAL' ? 'failed' : undefined,
          },
        });
        throw error;
      }
    }),
});