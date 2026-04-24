import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export const gatewayRouter = router({
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    return prisma.apiKey.findMany({
      where: { ownerId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
    });
  }),

  createApiKey: protectedProcedure
    .input(z.object({
      name: z.string(),
      projectId: z.string(),
      rateLimit: z.number().default(60),
      callerType: z.enum(['INTERNAL','EXTERNAL']).default('EXTERNAL'),
    }))
    .mutation(async ({ input, ctx }) => {
      const key = `akb_${randomBytes(24).toString('hex')}`;
      return prisma.apiKey.create({
        data: {
          key,
          name: input.name,
          projectId: input.projectId,
          ownerId: ctx.session.user.id,
          rateLimit: input.rateLimit,
          callerType: input.callerType,
          isActive: true,
        },
      });
    }),

  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.apiKey.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
});