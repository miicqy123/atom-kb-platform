import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const agentRouter = router({
  // 获取所有智能体
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
      category: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, status, category, search, limit, offset } = input;

      const whereClause: any = { projectId };

      if (status) {
        whereClause.status = status;
      }

      if (category) {
        whereClause.category = category;
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { role: { contains: search, mode: 'insensitive' } },
        ];
      }

      const agents = await ctx.prisma.agent.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          blueprints: {
            include: {
              blueprint: {
                select: { name: true }
              }
            }
          }
        }
      });

      const totalCount = await ctx.prisma.agent.count({
        where: whereClause
      });

      return {
        items: agents,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 根据ID获取单个智能体
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.agent.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          blueprints: {
            include: {
              blueprint: true
            }
          }
        }
      });
    }),

  // 创建智能体
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      projectId: z.string(),
      role: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional().default('DRAFT'),
      config: z.any().optional(), // 存储智能体的详细配置
      version: z.string().optional().default('1.0'),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional().default('INTERNAL'),
      capabilities: z.array(z.string()).optional().default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限在该项目中创建智能体
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.agent.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          role: input.role,
          description: input.description,
          category: input.category,
          status: input.status,
          config: input.config,
          version: input.version,
          exposureLevel: input.exposureLevel,
          capabilities: input.capabilities,
          createdBy: ctx.session.user.id,
        },
      });
    }),

  // 更新智能体
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      role: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
      config: z.any().optional(),
      version: z.string().optional(),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional(),
      capabilities: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否有权限更新此智能体
      const agent = await ctx.prisma.agent.findUnique({
        where: { id },
        include: { project: true }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // 检查用户是否有权限更新此项目
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: agent.project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && agent.project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      return ctx.prisma.agent.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除智能体
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限删除此智能体
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.id },
        include: { project: true }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // 检查用户是否有权限更新此项目
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: agent.project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && agent.project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      return ctx.prisma.agent.delete({
        where: { id: input.id },
      });
    }),

  // 发布智能体
  publish: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限发布此智能体
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.id },
        include: { project: true }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // 检查用户是否有权限更新此项目
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: agent.project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && agent.project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      // 更新状态为已批准
      return ctx.prisma.agent.update({
        where: { id: input.id },
        data: {
          status: 'APPROVED',
        },
      });
    }),

  // 获取智能体统计数据
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

      // 检查用户是否有权限访问此项目
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      const total = await ctx.prisma.agent.count({
        where: { projectId },
      });

      const byStatus = await ctx.prisma.agent.groupBy({
        where: { projectId },
        by: ['status'],
        _count: {
          _all: true,
        },
      });

      const byCategory = await ctx.prisma.agent.groupBy({
        where: { projectId },
        by: ['category'],
        _count: {
          _all: true,
        },
      });

      return {
        total,
        byStatus,
        byCategory,
      };
    }),

  // 批量操作
  batchDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查每个智能体的权限
      const agents = await ctx.prisma.agent.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
        include: { project: true }
      });

      if (agents.length !== input.ids.length) {
        throw new Error('Some agents not found');
      }

      // 检查用户是否有权限删除每个项目中的智能体
      for (const agent of agents) {
        const userMembership = await ctx.prisma.workspaceUser.findFirst({
          where: {
            workspaceId: agent.project.workspaceId,
            userId: ctx.session.user.id,
          },
        });

        if (!userMembership && agent.project.ownerId !== ctx.session.user.id) {
          throw new Error('Access denied for one or more agents');
        }
      }

      return ctx.prisma.agent.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),
});