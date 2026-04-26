import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { prisma } from '@/lib/prisma';

export const qualityCheckRouter = router({
  // ── 原子块质检概览 ──
  getAtomQualityStats: protectedProcedure
    .input(z.object({ rawId: z.string() }))
    .query(async ({ input }) => {
      const atoms = await prisma.atom.findMany({
        where: { rawId: input.rawId },
        select: {
          id: true,
          title: true,
          content: true,
          wordCount: true,
          category: true,
          subcategory: true,
          status: true,
          layer: true,
          createdAt: true,
        },
      });

      const total = atoms.length;
      const published = atoms.filter(a => a.status === 'PUBLISHED').length;
      const draft = atoms.filter(a => a.status === 'DRAFT').length;
      const rejected = atoms.filter(a => a.status === 'REJECTED').length;

      // 字数分布
      const tooShort = atoms.filter(a => (a.wordCount ?? 0) < 100).length;
      const normal = atoms.filter(a => (a.wordCount ?? 0) >= 100 && (a.wordCount ?? 0) <= 1500).length;
      const tooLong = atoms.filter(a => (a.wordCount ?? 0) > 1500).length;

      // 分类覆盖率
      const withCategory = atoms.filter(a => a.category && a.subcategory).length;
      const missingCategory = total - withCategory;

      // 按 category 分组统计
      const categoryDist: Record<string, number> = {};
      for (const a of atoms) {
        const cat = a.category || 'UNCATEGORIZED';
        categoryDist[cat] = (categoryDist[cat] || 0) + 1;
      }

      return {
        total,
        statusDist: { published, draft, rejected },
        wordDist: { tooShort, normal, tooLong },
        categoryDist,
        classificationRate: total > 0 ? Math.round((withCategory / total) * 100) : 0,
        missingCategory,
        atoms,
      };
    }),

  // ── QA 对质检概览 ──
  getQAQualityStats: protectedProcedure
    .input(z.object({ rawId: z.string() }))
    .query(async ({ input }) => {
      const qaPairs = await prisma.qAPair.findMany({
        where: { rawId: input.rawId },
        select: {
          id: true,
          question: true,
          answer: true,
          answerWordCount: true,
          difficulty: true,
          tags: true,
          status: true,
          createdAt: true,
        },
      });

      const total = qaPairs.length;
      const published = qaPairs.filter(q => q.status === 'PUBLISHED').length;
      const draft = qaPairs.filter(q => q.status === 'DRAFT').length;
      const rejected = qaPairs.filter(q => q.status === 'REJECTED').length;

      // 答案字数分布
      const shortAnswer = qaPairs.filter(q => (q.answerWordCount ?? 0) < 200).length;
      const normalAnswer = qaPairs.filter(q => (q.answerWordCount ?? 0) >= 200 && (q.answerWordCount ?? 0) <= 800).length;
      const longAnswer = qaPairs.filter(q => (q.answerWordCount ?? 0) > 800).length;

      // 难度分布
      const diffDist: Record<string, number> = {};
      for (const q of qaPairs) {
        const diff = q.difficulty || 'UNKNOWN';
        diffDist[diff] = (diffDist[diff] || 0) + 1;
      }

      return {
        total,
        statusDist: { published, draft, rejected },
        answerWordDist: { shortAnswer, normalAnswer, longAnswer },
        difficultyDist: diffDist,
        qaPairs,
      };
    }),

  // ── 批量审核：更新状态 ──
  batchUpdateStatus: protectedProcedure
    .input(z.object({
      type: z.enum(['atom', 'qa']),
      ids: z.array(z.string()),
      status: z.enum(['DRAFT', 'PUBLISHED', 'REJECTED']),
    }))
    .mutation(async ({ input }) => {
      const { type, ids, status } = input;
      if (type === 'atom') {
        await prisma.atom.updateMany({
          where: { id: { in: ids } },
          data: { status },
        });
      } else {
        await prisma.qAPair.updateMany({
          where: { id: { in: ids } },
          data: { status },
        });
      }
      return { updated: ids.length };
    }),

  // ── 单条审核 ──
  updateItemStatus: protectedProcedure
    .input(z.object({
      type: z.enum(['atom', 'qa']),
      id: z.string(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'REJECTED']),
    }))
    .mutation(async ({ input }) => {
      const { type, id, status } = input;
      if (type === 'atom') {
        await prisma.atom.update({ where: { id }, data: { status } });
      } else {
        await prisma.qAPair.update({ where: { id }, data: { status } });
      }
      return { id, status };
    }),
});
