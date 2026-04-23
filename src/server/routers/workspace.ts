import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const workspaceRouter = router({
  // 获取工作空间列表
  list: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, offset, search } = input;

      const whereClause: any = {
        members: {
          some: {
            userId: ctx.session.user.id,
          },
        },
      };

      if (search) {
        whereClause.name = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const workspaces = await ctx.prisma.workspace.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
            }
          }
        }
      });

      const totalCount = await ctx.prisma.workspace.count({
        where: whereClause
      });

      return {
        items: workspaces,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 根据ID获取单个工作空间
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                }
              }
            }
          },
          _count: {
            select: {
              members: true,
              projects: true,
            }
          }
        }
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // 检查用户是否有权限访问该工作空间
      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && workspace.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      return workspace;
    }),

  // 创建工作空间
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.enum(['PERSONAL', 'TEAM', 'ENTERPRISE']).optional().default('TEAM'),
      visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional().default('PRIVATE'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 创建工作空间
      const workspace = await ctx.prisma.workspace.create({
        data: {
          name: input.name,
          description: input.description,
          type: input.type,
          visibility: input.visibility,
          tenantId: ctx.session.user.tenantId,
          ownerId: ctx.session.user.id,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: 'TENANT_ADMIN', // 创建者默认为拥有者
            },
          },
        },
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
            }
          }
        }
      });

      return workspace;
    }),

  // 更新工作空间
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      type: z.enum(['PERSONAL', 'TEAM', 'ENTERPRISE']).optional(),
      visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否为工作空间拥有者
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      if (workspace.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied. Only workspace owner can update the workspace.');
      }

      return ctx.prisma.workspace.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除工作空间
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否为工作空间拥有者
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.id },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      if (workspace.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied. Only workspace owner can delete the workspace.');
      }

      return ctx.prisma.workspace.delete({
        where: { id: input.id },
      });
    }),

  // 邀请用户加入工作空间
  inviteUser: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      userEmail: z.string().email(),
      role: z.enum(['MEMBER', 'SUPER_ADMIN', 'TENANT_ADMIN']),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限邀请他人
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // 检查当前用户是否具有足够权限（至少管理员）
      const membership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!membership || (membership.role !== 'SUPER_ADMIN' && membership.role !== 'TENANT_ADMIN')) {
        throw new Error('Access denied. Only admins and owners can invite users.');
      }

      // 查找被邀请的用户
      const invitedUser = await ctx.prisma.user.findFirst({
        where: { email: input.userEmail },
      });

      if (!invitedUser) {
        throw new Error('User with this email not found');
      }

      // 检查用户是否已经是成员
      const existingMember = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: invitedUser.id,
        },
      });

      if (existingMember) {
        throw new Error('User is already a member of this workspace');
      }

      // 添加用户到工作空间
      return ctx.prisma.workspaceUser.create({
        data: {
          workspaceId: input.workspaceId,
          userId: invitedUser.id,
          role: input.role,
        },
      });
    }),

  // 移除工作空间成员
  removeMember: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限移除成员
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // 检查当前用户是否具有足够权限（至少管理员）
      const membership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!membership || (membership.role !== 'SUPER_ADMIN' && membership.role !== 'TENANT_ADMIN')) {
        throw new Error('Access denied. Only admins and owners can remove members.');
      }

      // 拥有者不能移除自己
      if (input.userId === ctx.session.user.id && membership.role === 'TENANT_ADMIN') {
        throw new Error('Owner cannot remove themselves. Transfer ownership first.');
      }

      // 移除成员
      return ctx.prisma.workspaceUser.delete({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
      });
    }),

  // 获取工作空间统计
  getStats: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查用户是否有权限访问该工作空间
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.id },
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const userMembership = await ctx.prisma.workspaceUser.findFirst({
        where: {
          workspaceId: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!userMembership && workspace.ownerId !== ctx.session.user.id) {
        throw new Error('Access denied');
      }

      const [projectsCount, membersCount, assetsCount] = await Promise.all([
        ctx.prisma.project.count({ where: { workspaceId: input.id } }),
        ctx.prisma.workspaceUser.count({ where: { workspaceId: input.id } }),
        ctx.prisma.$queryRaw<{ count: bigint }[]>`SELECT SUM(p.total_assets) as count FROM (
          SELECT COUNT(*) as total_assets FROM "Raw" WHERE "projectId" IN (SELECT id FROM "Project" WHERE "workspaceId" = ${input.id})
          UNION ALL
          SELECT COUNT(*) as total_assets FROM "Atom" WHERE "projectId" IN (SELECT id FROM "Project" WHERE "workspaceId" = ${input.id})
          UNION ALL
          SELECT COUNT(*) as total_assets FROM "QAPair" WHERE "projectId" IN (SELECT id FROM "Project" WHERE "workspaceId" = ${input.id})
        ) p`,
      ]);

      return {
        projectsCount,
        membersCount,
        assetsCount: Number(assetsCount[0].count),
      };
    }),
});