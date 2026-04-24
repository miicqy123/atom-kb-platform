import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const qaRouter = router({
  // 获取所有问答对
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional(), // 状态过滤
      search: z.string().optional(), // 搜索关键词
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, status, search, limit, offset } = input;

      const whereClause: any = { projectId };

      if (status) {
        whereClause.status = status;
      }

      if (search) {
        whereClause.OR = [
          { question: { contains: search, mode: 'insensitive' } },
          { answer: { contains: search, mode: 'insensitive' } },
        ];
      }

      const qaPairs = await ctx.prisma.qAPair.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      const totalCount = await ctx.prisma.qAPair.count({
        where: whereClause
      });

      return {
        items: qaPairs,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 根据ID获取单个问答对
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.qAPair.findUnique({
        where: { id: input.id },
      });
    }),

  // 创建问答对
  create: protectedProcedure
    .input(z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      projectId: z.string(),
      tags: z.array(z.string()).optional().default([]),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional().default('DRAFT'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限在该项目中创建问答对
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.qAPair.create({
        data: {
          question: input.question,
          answer: input.answer,
          projectId: input.projectId,
          tags: input.tags,
          status: input.status as any,
        } as any,
      });
    }),

  // 更新问答对
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      question: z.string().min(1).optional(),
      answer: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否有权限更新此问答对
      const qaPair = await ctx.prisma.qAPair.findUnique({
        where: { id },
      });

      if (!qaPair) {
        throw new Error('Q&A pair not found');
      }

      // 确保用户属于该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: qaPair.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.qAPair.update({
        where: { id },
        data: updateData as any,
      });
    }),

  // 删除问答对
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限删除此问答对
      const qaPair = await ctx.prisma.qAPair.findUnique({
        where: { id: input.id },
      });

      if (!qaPair) {
        throw new Error('Q&A pair not found');
      }

      // 确保用户属于该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: qaPair.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.qAPair.delete({
        where: { id: input.id },
      });
    }),

  // 批量操作
  batchDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查每个问答对的权限
      const qaPairs = await ctx.prisma.qAPair.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });

      if (qaPairs.length !== input.ids.length) {
        throw new Error('Some Q&A pairs not found');
      }

      // 确保所有问答对都在用户的项目中
      const uniqueProjectIds = Array.from(new Set(qaPairs.map(qa => qa.projectId)));
      for (const projectId of uniqueProjectIds) {
        const project = await ctx.prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          throw new Error(`Project ${projectId} not found`);
        }
      }

      return ctx.prisma.qAPair.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),

  // 获取统计数据
  getStats: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;

      // 检查项目访问权限
      const project = await ctx.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const total = await ctx.prisma.qAPair.count({
        where: { projectId },
      });

      const byStatus = await ctx.prisma.qAPair.groupBy({
        where: { projectId },
        by: ['status'],
        _count: {
          _all: true,
        },
      });

      // 统计最常用的标签
      const qaPairs = await ctx.prisma.qAPair.findMany({
        where: { projectId },
        select: { tags: true },
      });

      const tagCount: Record<string, number> = {};
      qaPairs.forEach(qa => {
        qa.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      });

      return {
        total,
        byStatus,
        topTags: Object.entries(tagCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10) // 只返回前10个标签
          .map(([name, count]) => ({ name, count })),
      };
    }),
});