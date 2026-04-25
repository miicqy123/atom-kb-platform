// src/server/routers/prompt.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const promptRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.prompt.findUniqueOrThrow({
        where: { id: input.id },
        include: { task: true },
      });
    }),

  optimize: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ input }) => {
      const { optimizationLoop } = await import('@/services/optimizationLoop');
      return optimizationLoop(input.promptId);
    }),
});
