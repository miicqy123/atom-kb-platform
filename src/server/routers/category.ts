import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const categoryRouter = router({
  // 获取所有分类
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      type: z.string().optional(), // 分类类型
      parentId: z.string().optional(), // 父分类ID，用于获取子分类
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
      search: z.string().optional(), // 添加搜索参数
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, type, parentId, limit, offset, search } = input;

      const whereClause: any = { projectId };

      if (type) {
        whereClause.type = type;
      }

      if (parentId !== undefined) {
        whereClause.parentId = parentId;
      } else {
        // 如果没有指定parentId，则查找顶级分类（parentId为null或undefined）
        whereClause.parentId = null;
      }

      if (search) {
        whereClause.name = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const categories = await ctx.prisma.category.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { order: 'asc' },
      });

      const totalCount = await ctx.prisma.category.count({
        where: whereClause
      });

      return {
        items: categories,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 根据ID获取单个分类
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.category.findUnique({
        where: { id: input.id },
      });
    }),

  // 创建分类
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      projectId: z.string(),
      type: z.string().optional(), // 分类类型
      parentId: z.string().optional(), // 父分类ID
      description: z.string().optional(),
      order: z.number().optional().default(0),
      color: z.string().optional(), // 分类颜色
      icon: z.string().optional(), // 分类图标
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限在该项目中创建分类
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 如果有父分类，检查父分类是否属于同一项目
      if (input.parentId) {
        const parentCategory = await ctx.prisma.category.findUnique({
          where: { id: input.parentId },
        });

        if (!parentCategory || parentCategory.projectId !== input.projectId) {
          throw new Error('Parent category not found in the same project');
        }
      }

      return ctx.prisma.category.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          type: input.type,
          parentId: input.parentId,
          description: input.description,
          order: input.order,
          color: input.color,
          icon: input.icon,
          createdBy: ctx.session.user.id,
        },
      });
    }),

  // 更新分类
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      type: z.string().optional(),
      parentId: z.string().optional(),
      description: z.string().optional(),
      order: z.number().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否有权限更新此分类
      const category = await ctx.prisma.category.findUnique({
        where: { id },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      // 确保用户属于该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: category.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 如果有新的父分类，检查它是否属于同一项目
      if (updateData.parentId !== undefined) {
        if (updateData.parentId) {
          const parentCategory = await ctx.prisma.category.findUnique({
            where: { id: updateData.parentId },
          });

          if (!parentCategory || parentCategory.projectId !== category.projectId) {
            throw new Error('Parent category not found in the same project');
          }
        } else {
          // 允许设置为顶级分类（parentId为null）
        }
      }

      return ctx.prisma.category.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除分类
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限删除此分类
      const category = await ctx.prisma.category.findUnique({
        where: { id: input.id },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      // 确保用户属于该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: category.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 检查是否有子分类，如果有则不允许删除（或者可以选择级联删除）
      const childCategories = await ctx.prisma.category.count({
        where: { parentId: input.id },
      });

      if (childCategories > 0) {
        throw new Error('Cannot delete category with child categories. Please remove child categories first.');
      }

      return ctx.prisma.category.delete({
        where: { id: input.id },
      });
    }),

  // 获取分类树
  getTree: protectedProcedure
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

      // 递归获取分类树
      const buildTree = async (parentId: string | null = null): Promise<any[]> => {
        const categories = await ctx.prisma.category.findMany({
          where: {
            projectId,
            parentId,
          },
          orderBy: { order: 'asc' },
        });

        const tree = [];

        for (const category of categories) {
          const children = await buildTree(category.id);
          tree.push({
            ...category,
            children,
          });
        }

        return tree;
      };

      return buildTree();
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

      const total = await ctx.prisma.category.count({
        where: { projectId },
      });

      const byType = await ctx.prisma.category.groupBy({
        where: { projectId },
        by: ['type'],
        _count: {
          _all: true,
        },
      });

      // 计算顶级分类数量
      const topLevelCount = await ctx.prisma.category.count({
        where: {
          projectId,
          parentId: null,
        },
      });

      return {
        total,
        topLevelCount,
        byType,
      };
    }),
});