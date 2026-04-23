import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const dashboardRouter = router({
  // 获取用户个人仪表板数据
  getUserDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      // 获取用户相关的统计数据
      const [
        userProjectsCount,
        userWorkspaces,
        recentActivity,
        pendingApprovals
      ] = await Promise.all([
        // 获取用户拥有的项目数量
        ctx.prisma.project.count({
          where: { ownerId: userId },
        }),
        // 获取用户所属的工作空间
        ctx.prisma.workspace.findMany({
          where: {
            members: {
              some: {
                userId: userId,
              },
            },
          },
          include: {
            _count: {
              select: {
                projects: true,
              },
            },
          },
          take: 5,
        }),
        ctx.prisma.auditLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        // 获取待审批项
        ctx.prisma.workflow.count({
          where: {
            projectId: {
              in: (await ctx.prisma.project.findMany({
                where: { ownerId: userId },
                select: { id: true },
              })).map(p => p.id),
            },
            status: 'REVIEW',
          },
        }),
      ]);

      return {
        userStats: {
          projectsCount: userProjectsCount,
          workspacesCount: userWorkspaces.length,
          pendingApprovals,
        },
        recentWorkspaces: userWorkspaces,
        recentActivity,
      };
    }),

  // 获取项目仪表板数据
  getProjectDashboard: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;

      // 检查用户是否有权限访问该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && project.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      // 获取项目相关的统计数据
      const [
        assetCounts,
        recentWorkflows,
        workflowStats,
        resourceUsage
      ] = await Promise.all([
        // 获取各类资源的数量
        ctx.prisma.project.findUnique({
          where: { id: projectId },
          include: {
            _count: {
              select: {
                raws: true,
                atoms: true,
                qaPairs: true,
                blueprints: true,
                workflowRuns: true,
                agents: true,
              }
            }
          }
        }),
        // 获取最近运行的工作流
        ctx.prisma.workflowRun.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            blueprint: {
              select: {
                name: true,
              }
            }
          }
        }),
        // 获取工作流统计
        ctx.prisma.workflowRun.groupBy({
          where: { projectId },
          by: ['status'],
          _count: {
            _all: true,
          },
          _avg: {
            duration: true,
            tokenUsage: true,
          }
        }),
        // 获取资源使用情况
        ctx.prisma.raw.groupBy({
          where: { projectId },
          by: ['conversionStatus'],
          _count: {
            _all: true,
          },
        })
      ]);

      const counts = (assetCounts as any)?._count ?? { raws: 0, atoms: 0, qaPairs: 0, blueprints: 0, workflowRuns: 0, agents: 0 };
      return {
        assetCounts: counts,
        totalAssets: (counts.raws ?? 0) + (counts.atoms ?? 0) + (counts.qaPairs ?? 0),
        recentWorkflows,
        workflowStats,
        resourceStatus: resourceUsage,
      };
    }),

  // 获取工作空间仪表板数据
  getWorkspaceDashboard: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { workspaceId } = input;

      // 检查用户是否有权限访问该工作空间
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId,
          userId: ctx.session.user.id,
        },
      });

      const workspaceOwner = await ctx.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!userMembership) {
        throw new Error('Access denied');
      }

      // 获取工作空间相关的统计数据
      const [
        projectStats,
        memberStats,
        resourceStats,
        activityStats
      ] = await Promise.all([
        // 项目统计
        ctx.prisma.project.groupBy({
          where: { workspaceId },
          by: ['status'], // 假设项目有状态字段
          _count: {
            _all: true,
          },
        }),
        // 成员统计
        ctx.prisma.workspaceUser.count({
          where: { workspaceId },
        }),
        // 资源统计
        ctx.prisma.$transaction([
          ctx.prisma.raw.count({ where: { project: { workspaceId } } }),
          ctx.prisma.atom.count({ where: { project: { workspaceId } } }),
          ctx.prisma.qAPair.count({ where: { project: { workspaceId } } }),
        ]),
        // 活动统计（最近30天）
        ctx.prisma.auditLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
            user: {
              workspaces: {
                some: {
                  workspaceId,
                },
              },
            },
          },
        })
      ]);

      const [rawCount, atomCount, qaCount] = resourceStats;

      return {
        projectStats,
        memberCount: memberStats,
        resourceCounts: {
          raws: rawCount,
          atoms: atomCount,
          qaPairs: qaCount,
        },
        activityCount: activityStats,
      };
    }),

  // 获取系统总体仪表板数据（仅限平台管理员）
  getSystemDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      // 检查用户是否为平台管理员
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only platform admins can view system dashboard.');
      }

      // 获取系统级别的统计数据
      const [
        userCount,
        tenantCount,
        workspaceCount,
        projectCount,
        resourceCount
      ] = await Promise.all([
        ctx.prisma.user.count(),
        ctx.prisma.tenant.count(),
        ctx.prisma.workspace.count(),
        ctx.prisma.project.count(),
        ctx.prisma.raw.count(), // 使用raw作为资源总量的代表
      ]);

      return {
        totalCounts: {
          users: userCount,
          tenants: tenantCount,
          workspaces: workspaceCount,
          projects: projectCount,
          resources: resourceCount,
        },
        systemHealth: {
          status: 'OK', // 简化的系统健康状态
          uptime: 'N/A', // 实际应用中这里会接入系统监控
        },
      };
    }),
});