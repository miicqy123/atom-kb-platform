// src/server/routers/vector.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { upsertVector, searchSimilar, deleteProjectVectors, indexAtomBM25, hybridSearch } from '@/services/vectorService';
import { prisma } from '@/lib/prisma';

export const vectorRouter = router({
  indexAtom: protectedProcedure
    .input(z.object({ atomId: z.string() }))
    .mutation(async ({ input }) => {
      const atom = await prisma.atom.findUniqueOrThrow({ where: { id: input.atomId } });
      await upsertVector(atom.id, atom.projectId, atom.content, {
        layer: atom.layer,
        granularity: atom.granularity,
        dimensions: atom.dimensions,
        slotMappings: atom.slotMappings,
        status: atom.status,
      });
      // Also index in BM25
      await indexAtomBM25(atom.id, atom.title, atom.content);
      return { success: true };
    }),

  indexProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      const atoms = await prisma.atom.findMany({
        where: { projectId: input.projectId, status: 'ACTIVE' },
      });
      for (const atom of atoms) {
        await upsertVector(atom.id, atom.projectId, atom.content, {
          layer: atom.layer,
          dimensions: atom.dimensions,
          slotMappings: atom.slotMappings,
          status: atom.status,
        });
        // Also index in BM25
        await indexAtomBM25(atom.id, atom.title, atom.content);
      }
      return { indexed: atoms.length };
    }),

  search: protectedProcedure
    .input(z.object({
      query: z.string(),
      projectId: z.string(),
      topK: z.number().default(5),
    }))
    .query(async ({ input }) => {
      const results = await searchSimilar(input.projectId, input.query, input.topK);
      return results.map(r => ({
        id: r.id,
        score: r.score,
        payload: r.metadata,
        content: r.content,
      }));
    }),

  hybridSearch: protectedProcedure
    .input(z.object({
      query: z.string(),
      projectId: z.string(),
      topK: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const results = await hybridSearch(input.projectId, input.query, input.topK);

      // 反查 DB 获取完整 atom 信息
      const atoms = await prisma.atom.findMany({
        where: { id: { in: results.map(r => r.id) } },
      });

      return results.map(r => ({
        ...r,
        atom: atoms.find(a => a.id === r.id),
      }));
    }),

  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteProjectVectors(input.projectId);
      return { success: true };
    }),
});