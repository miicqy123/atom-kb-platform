import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const tenantRouter = router({
  // 获取所有租户
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // 检查用户是否为平台管理员
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only platform admins can list tenants.');
      }

      return ctx.prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              users: true,
              workspaces: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }),

  // 根据ID获取单个租户
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查用户是否为平台管理员
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only platform admins can view tenants.');
      }

      return ctx.prisma.tenant.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          workspaces: true
        }
      });
    }),

  // 创建租户
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "租户名称不能为空"),
      domain: z.string().min(1, "域名不能为空"),
      plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
      status: z.enum(['ACTIVE', 'SUSPENDED', 'TRIAL']).default('TRIAL'),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否为平台管理员
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only platform admins can create tenants.');
      }

      // 检查域名是否已存在
      const existingDomain = await ctx.prisma.tenant.findFirst({
        where: { domain: input.domain }
      });

      if (existingDomain) {
        throw new Error('域名已存在');
      }

      // 创建新租户
      const tenant = await ctx.prisma.tenant.create({
        data: {
          name: input.name,
          domain: input.domain,
          plan: input.plan,
          status: input.status,
          createdBy: ctx.session.user.id,
        }
      });

      // 创建默认工作空间
      await ctx.prisma.workspace.create({
        data: {
          name: `${input.name} - 默认工作空间`,
          tenantId: tenant.id,
          ownerId: ctx.session.user.id,
        }
      });

      return tenant;
    }),

  // 更新租户
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      domain: z.string().optional(),
      plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
      status: z.enum(['ACTIVE', 'SUSPENDED', 'TRIAL']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否为平台管理员
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only platform admins can update tenants.');
      }

      // 如果修改了域名，检查域名是否已存在
      if (input.domain) {
        const existingDomain = await ctx.prisma.tenant.findFirst({
          where: {
            domain: input.domain,
            id: { not: input.id } // 排除当前租户
          }
        });

        if (existingDomain) {
          throw new Error('域名已存在');
        }
      }

      return ctx.prisma.tenant.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除租户
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否为平台管理员
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only platform admins can delete tenants.');
      }

      // 删除租户及其关联数据（使用事务确保数据一致性）
      return await ctx.prisma.$transaction(async (tx) => {
        // 删除关联的工作空间
        await tx.workspace.deleteMany({
          where: { tenantId: input.id }
        });

        // 删除租户
        const deletedTenant = await tx.tenant.delete({
          where: { id: input.id }
        });

        return deletedTenant;
      });
    }),
});