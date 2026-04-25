import { z } from "zod";
import { protectedProcedure, router, publicProcedure } from "../trpc";

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
  list: publicProcedure
    .query(async ({ ctx }) => {
      // 开发阶段返回所有项目，不考虑权限
      const projects = await ctx.prisma.project.findMany({
        where: {
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
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1, "项目名称不能为空"),
      description: z.string().optional(),
      type: z.string().default("client"),
    }))
    .mutation(async ({ ctx, input }) => {
      // 自动关联到第一个可用的 workspace 和 owner
      // 开发阶段简化处理，上线前需改为从 session 取当前用户
      let workspace = await ctx.prisma.workspace.findFirst();
      if (!workspace) {
        // 如果连 workspace 都没有，自动创建整套基础数据
        let tenant = await ctx.prisma.tenant.findFirst();
        if (!tenant) {
          tenant = await ctx.prisma.tenant.create({
            data: { name: "默认企业", industry: "互联网" },
          });
        }
        workspace = await ctx.prisma.workspace.create({
          data: { name: "默认工作空间", tenantId: tenant.id },
        });
      }
      let owner = await ctx.prisma.user.findFirst();
      if (!owner) {
        const tenant = await ctx.prisma.tenant.findFirstOrThrow();
        owner = await ctx.prisma.user.create({
          data: {
            email: "admin@demo.com",
            name: "管理员",
            role: "SUPER_ADMIN",
            tenantId: tenant.id,
          },
        });
      }

      const project = await ctx.prisma.project.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          type: input.type,
          workspaceId: workspace.id,
          ownerId: owner.id,
        },
      });

      return project;
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