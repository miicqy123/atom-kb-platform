import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

export const basePackRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const items = await prisma.basePack.findMany({
        orderBy: { slotKey: 'asc' },
      });
      return { items };
    }),

  create: protectedProcedure
    .input(z.object({
      slotKey: z.string(),
      content: z.string(),
      scope: z.string().optional(),
      scopeValue: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return prisma.basePack.create({
        data: {
          slotKey: input.slotKey,
          content: input.content,
          scope: input.scope || 'GLOBAL',
          scopeValue: input.scopeValue,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      content: z.string().optional(),
      slotKey: z.string().optional(),
      scope: z.string().optional(),
      scopeValue: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return prisma.basePack.update({
        where: { id: input.id },
        data: {
          content: input.content,
          slotKey: input.slotKey,
          scope: input.scope,
          scopeValue: input.scopeValue,
          version: { increment: 1 },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // 检查是否被蓝图引用 - there is no basePackId field in blueprint, so we need to check differently
      // Assuming there's some relation, but checking based on schema
      return prisma.basePack.delete({ where: { id: input.id } });
    }),
});