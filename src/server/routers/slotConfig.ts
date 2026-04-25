// src/server/routers/slotConfig.ts
import { z } from 'zod';
import { router, protectedProcedure, permissionProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

export const slotConfigRouter = router({
  create: permissionProcedure('blueprint:configure')
    .input(z.object({
      blueprintId: z.string(),
      slotKey: z.string(),
      subSlotKey: z.string().optional(),
      topN: z.number().default(3),
      layers: z.array(z.enum(['A', 'B', 'C', 'D'])),
      dimensions: z.array(z.number()),
      categories: z.array(z.enum([
        'CAT_WHO','CAT_WHAT','CAT_HOW','CAT_STYLE','CAT_FENCE','CAT_PROOF'
      ])).default([]),
      subcategories: z.array(z.enum([
        'WHO_BRAND','WHO_ROLE','WHO_AUDIENCE','WHO_TERM',
        'WHAT_PRODUCT','WHAT_USP','WHAT_PRICE','WHAT_CERT',
        'HOW_SOP','HOW_METHOD','HOW_TACTIC','HOW_BEST',
        'STYLE_HOOK','STYLE_WORD','STYLE_TONE','STYLE_RHYTHM',
        'FENCE_BAN','FENCE_ALLOW','FENCE_LAW','FENCE_BLUR',
        'PROOF_CASE','PROOF_DATA','PROOF_FAIL','PROOF_COMPARE'
      ])).default([]),
      conflictPriority: z.array(z.enum(['A', 'B', 'C', 'D'])).default(['D','C','B','A']),
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
              layers: input.layers,
              dimensions: input.dimensions,
              categories: input.categories,
              subcategories: input.subcategories,
            },
          },
        },
      });
      return slotConfig;
    }),

  delete: permissionProcedure('blueprint:configure')
    .input(z.object({ blueprintId: z.string(), slotKey: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.slotConfig.deleteMany({
        where: { blueprintId: input.blueprintId, slotKey: input.slotKey },
      });
      return { success: true };
    }),
});
