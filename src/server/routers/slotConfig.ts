// src/server/routers/slotConfig.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

export const slotConfigRouter = router({
  create: protectedProcedure
    .input(z.object({
      blueprintId: z.string(),
      slotKey: z.string(),
      subSlotKey: z.string().optional(),
      topN: z.number().default(3),
      layers: z.array(z.string()),
      dimensions: z.array(z.number()),
      conflictPriority: z.array(z.string()).default(['D','C','B','A']),
    }))
    .mutation(async ({ input }) => {
      // 获取当前最大 order
      const maxOrder = await prisma.slotConfig.aggregate({
        _max: { order: true },
        where: { blueprintId: input.blueprintId },
      });

      const slotConfig = await prisma.slotConfig.create({
        data: {
          blueprintId: input.blueprintId,
          slotKey: input.slotKey,
          subSlotKey: input.subSlotKey,
          conflictPriority: input.conflictPriority,
          order: (maxOrder._max.order ?? 0) + 1,
          fetchRules: {
            create: {
              topN: input.topN,
              layers: input.layers as any,
              dimensions: input.dimensions,
            },
          },
        },
      });
      return slotConfig;
    }),

  delete: protectedProcedure
    .input(z.object({ blueprintId: z.string(), slotKey: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.slotConfig.deleteMany({
        where: { blueprintId: input.blueprintId, slotKey: input.slotKey },
      });
      return { success: true };
    }),
});