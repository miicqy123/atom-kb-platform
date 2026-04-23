import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const atomRouter = router({
  // 获取所有原子块
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      layer: z.enum(['A', 'B', 'C', 'D']).optional(),
      granularity: z.enum(['ATOM', 'MODULE', 'PACK']).optional(),
      status: z.enum(['DRAFT', 'TESTING', 'ACTIVE', 'ARCHIVED']).optional(),
      search: z.string().optional(), // 添加搜索参数
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, layer, granularity, status, search, limit, offset } = input;

      const whereClause: any = { projectId };

      if (layer) {
        whereClause.layer = layer;
      }

      if (granularity) {
        whereClause.granularity = granularity;
      }

      if (status) {
        whereClause.status = status;
      }

      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      const atoms = await ctx.prisma.atom.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      const totalCount = await ctx.prisma.atom.count({
        where: whereClause
      });

      return {
        items: atoms,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 根据ID获取单个原子块
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.atom.findUnique({
        where: { id: input.id },
      });
    }),

  // 创建原子块
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      content: z.string().min(1),
      projectId: z.string(),
      layer: z.enum(['A', 'B', 'C', 'D']),
      granularity: z.enum(['ATOM', 'MODULE', 'PACK']).default('ATOM'),
      experienceSource: z.enum(['E1_COMPANY', 'E2_INDUSTRY', 'E3_CROSS_INDUSTRY']),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).default('INTERNAL'),
      status: z.enum(['DRAFT', 'TESTING', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
      dimensions: z.array(z.number()).optional(),
      slotMappings: z.array(z.string()).optional(),
      wordCount: z.number().optional(),
      tokenEstimate: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限在该项目中创建原子块
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.atom.create({
        data: {
          title: input.title,
          content: input.content,
          projectId: input.projectId,
          layer: input.layer,
          granularity: input.granularity,
          experienceSource: input.experienceSource,
          exposureLevel: input.exposureLevel,
          status: input.status,
          dimensions: input.dimensions || [],
          slotMappings: input.slotMappings || [],
          wordCount: input.wordCount,
          tokenEstimate: input.tokenEstimate,
        },
      });
    }),

  // 更新原子块
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(255).optional(),
      content: z.string().min(1).optional(),
      layer: z.enum(['A', 'B', 'C', 'D']).optional(),
      granularity: z.enum(['ATOM', 'MODULE', 'PACK']).optional(),
      experienceSource: z.enum(['E1_COMPANY', 'E2_INDUSTRY', 'E3_CROSS_INDUSTRY']).optional(),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional(),
      status: z.enum(['DRAFT', 'TESTING', 'ACTIVE', 'ARCHIVED']).optional(),
      dimensions: z.array(z.number()).optional(),
      slotMappings: z.array(z.string()).optional(),
      wordCount: z.number().optional(),
      tokenEstimate: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否有权限更新此原子块
      const atom = await ctx.prisma.atom.findUnique({
        where: { id },
      });

      if (!atom) {
        throw new Error('Atom not found');
      }

      // 确保用户属于该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: atom.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.atom.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除原子块
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限删除此原子块
      const atom = await ctx.prisma.atom.findUnique({
        where: { id: input.id },
      });

      if (!atom) {
        throw new Error('Atom not found');
      }

      // 确保用户属于该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: atom.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.atom.delete({
        where: { id: input.id },
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

      const stats = await ctx.prisma.atom.groupBy({
        where: { projectId },
        by: ['layer'],
        _count: {
          _all: true,
        },
      });

      const total = await ctx.prisma.atom.count({
        where: { projectId },
      });

      const statusCount = await ctx.prisma.atom.groupBy({
        where: { projectId },
        by: ['status'],
        _count: {
          _all: true,
        },
      });

      return {
        total,
        byLayer: stats,
        byStatus: statusCount,
      };
    }),

  // 批量操作
  batchDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查每个原子块的权限
      const atoms = await ctx.prisma.atom.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });

      if (atoms.length !== input.ids.length) {
        throw new Error('Some atoms not found');
      }

      // 确保所有原子块都在用户的项目中
      const projectIds = Array.from(new Set(atoms.map(atom => atom.projectId)));
      for (const projectId of projectIds) {
        const project = await ctx.prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          throw new Error(`Project ${projectId} not found`);
        }
      }

      return ctx.prisma.atom.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),
});
