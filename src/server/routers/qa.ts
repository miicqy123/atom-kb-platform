import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const qaRouter = router({
  // 获取所有问答对
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      categoryId: z.string().optional(), // 分类ID过滤
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional(), // 状态过滤
      search: z.string().optional(), // 搜索关键词
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, categoryId, status, search, limit, offset } = input;

      const whereClause: any = { projectId };

      if (categoryId) {
        whereClause.categoryId = categoryId;
      }

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
        include: {
          category: true, // 包含分类信息
        },
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
        include: {
          category: true,
        },
      });
    }),

  // 创建问答对
  create: protectedProcedure
    .input(z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      projectId: z.string(),
      categoryId: z.string().optional(),
      tags: z.array(z.string()).optional().default([]),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional().default('DRAFT'),
      priority: z.number().optional().default(0),
      source: z.string().optional(), // 来源说明
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional().default('INTERNAL'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限在该项目中创建问答对
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 如果指定了分类，检查分类是否属于同一项目
      if (input.categoryId) {
        const category = await ctx.prisma.category.findUnique({
          where: { id: input.categoryId },
        });

        if (!category || category.projectId !== input.projectId) {
          throw new Error('Category not found in the same project');
        }
      }

      return ctx.prisma.qAPair.create({
        data: {
          question: input.question,
          answer: input.answer,
          projectId: input.projectId,
          categoryId: input.categoryId,
          tags: input.tags,
          status: input.status,
          priority: input.priority,
          source: input.source,
          exposureLevel: input.exposureLevel,
          createdBy: ctx.session.user.id,
        },
      });
    }),

  // 更新问答对
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      question: z.string().min(1).optional(),
      answer: z.string().min(1).optional(),
      categoryId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
      priority: z.number().optional(),
      source: z.string().optional(),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional(),
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

      // 如果有新的分类ID，检查它是否属于同一项目
      if (updateData.categoryId !== undefined) {
        if (updateData.categoryId) {
          const category = await ctx.prisma.category.findUnique({
            where: { id: updateData.categoryId },
          });

          if (!category || category.projectId !== qaPair.projectId) {
            throw new Error('Category not found in the same project');
          }
        }
      }

      return ctx.prisma.qAPair.update({
        where: { id },
        data: updateData,
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
      const projectIds = [...new Set(qaPairs.map(qa => qa.projectId))];
      for (const projectId of projectIds) {
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