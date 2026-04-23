import { z } from "zod";
import { router, withPermission } from "../trpc";

export const qaPairRouter = router({
  list: withPermission("knowledge", "read")
    .input(z.object({
      projectId: z.string(), difficulty: z.string().optional(), materialType: z.string().optional(),
      status: z.string().optional(), search: z.string().optional(),
      page: z.number().default(1), pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.difficulty) where.difficulty = input.difficulty;
      if (input.status) where.status = input.status;
      if (input.search) where.OR = [{ question: { contains: input.search, mode: "insensitive" } }, { answer: { contains: input.search, mode: "insensitive" } }];
      const [items, total] = await Promise.all([
        ctx.prisma.qAPair.findMany({ where, skip: (input.page - 1) * input.pageSize, take: input.pageSize, orderBy: { updatedAt: "desc" }, include: { _count: { select: { atoms: true } } } }),
        ctx.prisma.qAPair.count({ where }),
      ]);
      return { items, total, totalPages: Math.ceil(total / input.pageSize) };
    }),
  getById: withPermission("knowledge", "read")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.qAPair.findUniqueOrThrow({ where: { id: input.id }, include: { raw: true, atoms: { include: { atom: true } } } })
    ),
  create: withPermission("knowledge", "write")
    .input(z.object({
      question: z.string(), answer: z.string(), projectId: z.string(), rawId: z.string().optional(),
      tags: z.array(z.string()), difficulty: z.string(), scenarios: z.array(z.string()),
      questionKeywords: z.array(z.string()), materialType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const qa = await ctx.prisma.qAPair.create({ data: input as any });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.session.user.id, action: "create", entityType: "qa_pair", entityId: qa.id, entityName: qa.question.substring(0, 50) } });
      return qa;
    }),
  update: withPermission("knowledge", "write")
    .input(z.object({
      id: z.string(),
      question: z.string().optional(),
      answer: z.string().optional(),
      tags: z.array(z.string()).optional(),
      difficulty: z.string().optional(),
      scenarios: z.array(z.string()).optional(),
      questionKeywords: z.array(z.string()).optional(),
      materialType: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const qa = await ctx.prisma.qAPair.update({
        where: { id },
        data: updateData,
      });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "update", entityType: "qa_pair", entityId: qa.id, entityName: qa.question.substring(0, 50) } });
      return qa;
    }),
  delete: withPermission("knowledge", "write")
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const qa = await ctx.prisma.qAPair.findUniqueOrThrow({
        where: { id: input.id },
      });

      const deletedQa = await ctx.prisma.qAPair.delete({
        where: { id: input.id },
      });

      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "delete", entityType: "qa_pair", entityId: qa.id, entityName: qa.question.substring(0, 50) } });
      return deletedQa;
    }),
  // RAG 检索测试 (KC-04 / KC-07)
  searchSimilar: withPermission("knowledge", "read")
    .input(z.object({ projectId: z.string(), question: z.string(), topN: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      // TODO: 调用向量检索服务
      // 临时使用关键词搜索
      return ctx.prisma.qAPair.findMany({
        where: { projectId: input.projectId, question: { contains: input.question, mode: "insensitive" } },
        take: input.topN, orderBy: { qualityScore: "desc" },
      });
    }),
});