// src/server/routers/clone.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const cloneRouter = router({
  // 创建复刻任务
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      inputType: z.enum(['text', 'url', 'image']),
      content: z.string(),  // 文本内容 / 链接 / 图片base64
      taskType: z.enum([
        'SHORT_VIDEO','MOMENTS','SALES_TALK','LIVE_TALK',
        'BRAND_STORY','IMAGE_PROMPT','ANALYSIS','GENERAL','CUSTOM'
      ]).optional(),
      platform: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 创建 Task 记录
      const task = await ctx.prisma.task.create({
        data: {
          projectId: input.projectId,
          type: input.taskType ?? 'GENERAL',
          description: `快速复刻 - ${input.inputType}`,
          platform: (input.platform as any) ?? 'GENERAL',
          audience: 'GENERAL',
          rawIds: [],
          status: 'processing',
        },
      });

      return { taskId: task.id, status: 'processing' };
    }),

  // STEP 反推（异步调用）
  reverse: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { stepReverse } = await import('@/services/stepReverseService');
      const result = await stepReverse(input.content);

      // 创建 Prompt 记录
      const prompt = await ctx.prisma.prompt.create({
        data: {
          projectId: (await ctx.prisma.task.findUniqueOrThrow({ where: { id: input.taskId } })).projectId,
          fullText: result.prompt,
          slots: result.slots,
          status: 'DRAFT',
          linkedAtomIds: [],
          linkedPackIds: [],
        },
      });

      await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: { promptId: prompt.id, status: 'done' },
      });

      return { promptId: prompt.id, rules: result.rules, prompt: result.prompt };
    }),

  // 将复刻结果拆解入库
  toAtoms: protectedProcedure
    .input(z.object({
      promptId: z.string(),
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const prompt = await ctx.prisma.prompt.findUniqueOrThrow({ where: { id: input.promptId } });
      const slots = prompt.slots as Record<string, string>;

      const { autoTag } = await import('@/services/pipelineService');

      const atoms = [];
      for (const [slotKey, content] of Object.entries(slots)) {
        if (!content?.trim()) continue;
        const tags = await autoTag(content);
        const atom = await ctx.prisma.atom.create({
          data: {
            title: `[复刻] ${content.slice(0, 50)}`,
            content,
            projectId: input.projectId,
            layer: tags.layer,
            granularity: 'ATOM',
            dimensions: tags.dimensions,
            slotMappings: [slotKey],
            experienceSource: 'E2_INDUSTRY',
            category: tags.category,
            subcategory: tags.subcategory,
            status: 'DRAFT',
            wordCount: content.length,
          },
        });
        atoms.push(atom);
      }

      return { atomsCreated: atoms.length };
    }),
});
