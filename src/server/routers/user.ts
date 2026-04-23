import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
  // 获取用户列表
  list: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      workspaceId: z.string().optional(), // 添加工作空间ID过滤
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
      search: z.string().optional(), // 添加搜索参数
    }))
    .query(async ({ ctx, input }) => {
      const { tenantId, workspaceId, limit, offset, search } = input;

      const whereClause: any = {};

      // 如果指定了租户ID，则过滤该租户下的用户
      if (tenantId) {
        whereClause.tenantId = tenantId;
      }

      // 如果指定了工作空间ID，则通过工作空间成员关系过滤用户
      if (workspaceId) {
        whereClause.workspaces = {
          some: {
            workspaceId: workspaceId,
          },
        };
      }

      // 如果提供了搜索词，对姓名和邮箱进行搜索
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const users = await ctx.prisma.user.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: { select: { name: true } },
          workspaces: {
            include: {
              workspace: true,
            },
          },
        },
      });

      const totalCount = await ctx.prisma.user.count({
        where: whereClause
      });

      return {
        items: users,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 获取当前用户信息
  getCurrent: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          tenant: true,
          workspaces: {
            include: {
              workspace: true,
            },
          },
        },
      });
    }),

  // 根据ID获取单个用户
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查用户是否有权限获取该用户信息
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          tenant: true,
          workspaces: {
            include: {
              workspace: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 检查是否是查询自己的信息或者是管理员
      if (ctx.session.user.id !== input.id) {
        // 检查当前用户是否为管理员
        const currentUser = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
        });

        if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
          throw new Error('Access denied. Only admins can view other users.');
        }
      }

      return user;
    }),

  // 更新用户角色
  updateRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(['SUPER_ADMIN', 'TENANT_ADMIN', 'KNOWLEDGE_EDITOR', 'PROMPT_ENGINEER', 'OPERATOR', 'REVIEWER', 'READONLY']),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only admins can update user roles.');
      }

      const targetUser = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (targetUser?.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. Only super admins can modify other super admins.');
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
    }),

  // 更新用户资料
  updateProfile: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      avatar: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id !== ctx.session.user.id) {
        const currentUser = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
        });

        if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
          throw new Error('Access denied. Can only update own profile.');
        }
      }

      return ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          email: input.email,
          avatar: input.avatar,
          status: input.status,
        },
      });
    }),

  // 获取用户统计数据
  getStats: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查权限
      if (ctx.session.user.id !== input.id) {
        const currentUser = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
        });

        if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
          throw new Error('Access denied. Only admins can view user stats.');
        }
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const [userProjects, userWorkspaces, userActivity] = await Promise.all([
        ctx.prisma.project.count({
          where: { ownerId: input.id },
        }),
        ctx.prisma.workspaceUser.count({
          where: { userId: input.id },
        }),
        ctx.prisma.auditLog.count({
          where: { userId: input.id },
        }),
      ]);

      return {
        projectsCount: userProjects,
        workspacesCount: userWorkspaces,
        activityCount: userActivity,
      };
    }),
});