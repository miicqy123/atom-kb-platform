import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

export const dimensionRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async () => {
      const existing = await prisma.dimensionConfig.findMany({
        orderBy: { number: 'asc' },
        take: 30,
      });

      if (existing.length > 0) return { items: existing };

      const LAYER_MAP: Record<number, 'A' | 'B' | 'C' | 'D'> = {
        1:'A',2:'A',3:'A',4:'A',5:'A',6:'A',7:'A',8:'A',9:'A',10:'A',
        11:'B',12:'B',13:'B',14:'B',15:'B',16:'B',17:'B',18:'B',19:'B',20:'B',
        21:'C',22:'C',23:'C',24:'C',25:'C',
        26:'D',27:'D',28:'D',29:'D',30:'D',
      };
      const created = await prisma.$transaction(
        Array.from({ length: 30 }, (_, i) => i + 1).map(idx =>
          prisma.dimensionConfig.create({
            data: {
              number: idx,
              layer: LAYER_MAP[idx],
              name: `维度 ${idx}`,
            } as any,
          })
        )
      );
      return { items: created };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      return prisma.dimensionConfig.update({
        where: { id: input.id },
        data: { name: input.name } as any,
      });
    }),
});