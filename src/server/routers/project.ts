import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const projectRouter = router({
  // 获取项目列表 - 按工作空间（原有功能）
  listByWorkspace: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { workspaceId, limit, offset, search } = input;

      const whereClause: any = { workspaceId };

      if (search) {
        whereClause.name = {
          contains: search,
          mode: 'insensitive',
        };
      }

      // 检查用户是否有权限访问该工作空间
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const projects = await ctx.prisma.project.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: "desc" },
        include: {
          owner: { select: { name: true } },
          _count: {
            select: {
              raws: true,
              atoms: true,
              qaPairs: true,
              blueprints: true,
              workflowRuns: true
            }
          }
        }
      });

      const totalCount = await ctx.prisma.project.count({
        where: whereClause
      });

      return {
        items: projects,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 获取项目列表 - 按租户（新增功能）
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.session.user as any;

      // 查询用户所属租户下所有工作空间的项目
      const projects = await ctx.prisma.project.findMany({
        where: {
          workspace: {
            tenantId: user.tenantId
          },
          status: "ACTIVE",
        },
        orderBy: { updatedAt: "desc" },
        include: {
          workspace: true,
        }
      });

      return projects;
    }),

  // 根据ID获取单个项目
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          owner: true,
          _count: {
            select: {
              raws: true,
              atoms: true,
              qaPairs: true,
              blueprints: true,
              workflowRuns: true
            }
          }
        }
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 检查用户是否有权限访问该项目
      const userWorkspace = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userWorkspace && project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      return project;
    }),

  // 创建项目
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      workspaceId: z.string(),
      type: z.string().optional(),
      description: z.string().optional(),
      visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional().default('PRIVATE'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限在该工作空间中创建项目
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // 检查用户是否是工作空间成员或拥有者
      const userWorkspace = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userWorkspace && workspace.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      return ctx.prisma.project.create({
        data: {
          name: input.name,
          workspaceId: input.workspaceId,
          type: input.type,
          description: input.description,
          ownerId: ctx.session.user.id,
        }
      });
    }),

  // 更新项目
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      type: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否有权限更新该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 检查用户是否是项目拥有者
      if (project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied. Only project owner can update the project.');
      }

      return ctx.prisma.project.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除项目
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限删除该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 检查用户是否是项目拥有者
      if (project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied. Only project owner can delete the project.');
      }

      return ctx.prisma.project.delete({
        where: { id: input.id },
      });
    }),

  // 获取项目资产概览
  assetOverview: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查用户是否有权限访问该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 检查用户是否有权限访问该项目
      const userWorkspace = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userWorkspace && project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      const [rawCount, atomStats, qaCount, bpStats, runStats] = await Promise.all([
        ctx.prisma.raw.count({ where: { projectId: input.id } }),
        ctx.prisma.atom.groupBy({
          by: ["granularity"],
          where: { projectId: input.id },
          _count: true
        }),
        ctx.prisma.qAPair.count({ where: { projectId: input.id } }),
        ctx.prisma.blueprint.groupBy({
          by: ["status"],
          where: { projectId: input.id },
          _count: true
        }),
        ctx.prisma.workflowRun.aggregate({
          where: { projectId: input.id },
          _count: true,
          _avg: { tokenUsage: true }
        }),
      ]);

      return { rawCount, atomStats, qaCount, bpStats, runStats };
    }),

  // 获取项目统计
  getStats: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查用户是否有权限访问该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 检查用户是否有权限访问该项目
      const userWorkspace = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userWorkspace && project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      const assetCounts = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              raws: true,
              atoms: true,
              qaPairs: true,
              blueprints: true,
              workflows: true,
              agents: true,
            }
          }
        }
      });

      if (!assetCounts) {
        throw new Error('Project not found');
      }

      return {
        totalAssets: assetCounts._count.raws + assetCounts._count.atoms + assetCounts._count.qaPairs,
        breakdown: {
          raws: assetCounts._count.raws,
          atoms: assetCounts._count.atoms,
          qaPairs: assetCounts._count.qaPairs,
          blueprints: assetCounts._count.blueprints,
          workflows: assetCounts._count.workflows,
          agents: assetCounts._count.agents,
        }
      };
    }),
});