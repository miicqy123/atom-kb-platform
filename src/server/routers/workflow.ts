import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const workflowRouter = router({
  // 获取所有工作流
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
        ];
      }

      const workflows = await ctx.prisma.workflow.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      const totalCount = await ctx.prisma.workflow.count({
        where: whereClause
      });

      return {
        items: workflows,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 根据ID获取单个工作流
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.workflow.findUnique({
        where: { id: input.id },
      });
    }),

  // 创建工作流
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      projectId: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional().default('DRAFT'),
      config: z.any().optional(), // 存储工作流的详细配置
      version: z.string().optional().default('1.0'),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional().default('INTERNAL'),
      triggerType: z.enum(['MANUAL', 'SCHEDULED', 'EVENT']).optional().default('MANUAL'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限在该项目中创建工作流
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.workflow.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          description: input.description,
          category: input.category,
          status: input.status,
          config: input.config,
          version: input.version,
          exposureLevel: input.exposureLevel,
          triggerType: input.triggerType,
          createdBy: ctx.session.user.id,
        },
      });
    }),

  // 更新工作流
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED']).optional(),
      config: z.any().optional(),
      version: z.string().optional(),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional(),
      triggerType: z.enum(['MANUAL', 'SCHEDULED', 'EVENT']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否有权限更新此工作流
      const workflow = await ctx.prisma.workflow.findUnique({
        where: { id },
        include: { project: true }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // 检查用户是否有权限更新此项目
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: workflow.project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && workflow.project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      return ctx.prisma.workflow.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除工作流
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限删除此工作流
      const workflow = await ctx.prisma.workflow.findUnique({
        where: { id: input.id },
        include: { project: true }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // 检查用户是否有权限更新此项目
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: workflow.project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && workflow.project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      return ctx.prisma.workflow.delete({
        where: { id: input.id },
      });
    }),

  // 发布工作流
  publish: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限发布此工作流
      const workflow = await ctx.prisma.workflow.findUnique({
        where: { id: input.id },
        include: { project: true }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // 检查用户是否有权限更新此项目
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: workflow.project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && workflow.project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      // 更新状态为已批准
      return ctx.prisma.workflow.update({
        where: { id: input.id },
        data: {
          status: 'APPROVED',
        },
      });
    }),

  // 运行工作流
  run: protectedProcedure
    .input(z.object({
      id: z.string(),
      input: z.any().optional(), // 工作流输入数据
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限运行此工作流
      const workflow = await ctx.prisma.workflow.findUnique({
        where: { id: input.id },
        include: { project: true }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // 检查用户是否有权限运行此项目的工作流
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: workflow.project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && workflow.project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      if (workflow.status !== 'APPROVED') {
        throw new Error('Cannot run workflow that is not approved');
      }

      // 创建工作流运行记录
      const run = await ctx.prisma.workflowRun.create({
        data: {
          workflowId: input.id,
          projectId: workflow.projectId,
          status: 'RUNNING',
          input: input.input,
          startedBy: ctx.session.user.id,
        },
      });

      // 这里可以启动实际的工作流执行逻辑
      // 目前我们只是标记为运行中，实际的执行可能需要后台任务
      return run;
    }),

  // 获取工作流统计数据
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

      const total = await ctx.prisma.workflow.count({
        where: { projectId },
      });

      const byStatus = await ctx.prisma.workflow.groupBy({
        where: { projectId },
        by: ['status'],
        _count: {
          _all: true,
        },
      });

      const byCategory = await ctx.prisma.workflow.groupBy({
        where: { projectId },
        by: ['category'],
        _count: {
          _all: true,
        },
      });

      // 获取运行统计
      const runStats = await ctx.prisma.workflowRun.groupBy({
        where: { projectId },
        by: ['status'],
        _count: {
          _all: true,
        },
      });

      return {
        total,
        byStatus,
        byCategory,
        runStats,
      };
    }),

  // 批量操作
  batchDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查每个工作流的权限
      const workflows = await ctx.prisma.workflow.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
        include: { project: true }
      });

      if (workflows.length !== input.ids.length) {
        throw new Error('Some workflows not found');
      }

      // 检查用户是否有权限删除每个项目中的工作流
      for (const workflow of workflows) {
        const userMembership = await ctx.prisma.workspaceUser.findFirst({
          where: {
            workspaceId: workflow.project.workspaceId,
            userId: ctx.session.user.id,
          },
        });

        if (!userMembership && workflow.project.ownerId !== ctx.session.user.id) {
          throw new Error('Access denied for one or more workflows');
        }
      }

      return ctx.prisma.workflow.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),
});