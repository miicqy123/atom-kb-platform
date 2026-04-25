import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const documentParseConfigRouter = router({
  // 查询当前所有解析配置
  list: publicProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.documentParseConfig.findMany({
        where: input.tenantId ? { tenantId: input.tenantId } : {},
        orderBy: [{ taskType: "asc" }, { priority: "desc" }],
      });
    }),

  // 创建或更新配置
  upsert: publicProcedure
    .input(z.object({
      id: z.string().optional(),
      tenantId: z.string().optional(),
      taskType: z.enum(["PDF_EXTRACT", "IMAGE_OCR", "SCAN_PDF_OCR"]),
      providerType: z.enum(["OPENAI", "QWEN", "LOCAL_PDFJS", "CUSTOM"]),
      modelName: z.string(),
      apiEndpoint: z.string().optional(),
      apiKey: z.string().optional(),
      config: z.record(z.unknown()).optional(),
      enabled: z.boolean().default(true),
      priority: z.number().default(0),
      monthlyLimit: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        return ctx.prisma.documentParseConfig.update({
          where: { id: input.id },
          data: {
            taskType: input.taskType,
            providerType: input.providerType,
            modelName: input.modelName,
            apiEndpoint: input.apiEndpoint || null,
            apiKey: input.apiKey || null,
            config: input.config || {},
            enabled: input.enabled,
            priority: input.priority,
            monthlyLimit: input.monthlyLimit,
          },
        });
      }
      return ctx.prisma.documentParseConfig.create({
        data: {
          tenantId: input.tenantId || null,
          taskType: input.taskType,
          providerType: input.providerType,
          modelName: input.modelName,
          apiEndpoint: input.apiEndpoint || null,
          apiKey: input.apiKey || null,
          config: input.config || {},
          enabled: input.enabled,
          priority: input.priority,
          monthlyLimit: input.monthlyLimit,
        },
      });
    }),

  // 删除配置
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.documentParseConfig.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // 测试配置（用测试文本验证连通性）
  testConnection: publicProcedure
    .input(z.object({
      providerType: z.string(),
      modelName: z.string(),
      apiEndpoint: z.string().optional(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const OpenAI = (await import("openai")).default;
        const client = new OpenAI({
          apiKey: input.apiKey || process.env.OPENAI_API_KEY,
          baseURL: input.apiEndpoint || undefined,
        });
        const res = await client.chat.completions.create({
          model: input.modelName,
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 10,
        });
        const reply = res.choices[0]?.message?.content || "";
        return { success: true, message: `连接成功！模型回复: ${reply}` };
      } catch (e: any) {
        return { success: false, message: `连接失败: ${e.message}` };
      }
    }),

  // 重置月度用量
  resetMonthlyUsage: publicProcedure
    .mutation(async ({ ctx }) => {
      await ctx.prisma.documentParseConfig.updateMany({
        data: { monthlyUsed: 0 },
      });
      return { success: true };
    }),
});
