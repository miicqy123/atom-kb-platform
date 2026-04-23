import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// 预定义的角色数据
const PREDEFINED_ROLES = [
  { id: "SUPER_ADMIN", name: "超级管理员", description: "系统最高权限，可管理所有资源", permissions: ["ALL"] },
  { id: "ADMIN", name: "管理员", description: "管理租户和用户，配置系统设置", permissions: ["USER_MANAGE", "PROJECT_MANAGE", "SYSTEM_CONFIG"] },
  { id: "TENANT_ADMIN", name: "租户管理员", description: "管理特定租户内的资源", permissions: ["PROJECT_CREATE", "USER_ASSIGN", "BILLING_VIEW"] },
  { id: "PROJECT_OWNER", name: "项目所有者", description: "管理特定项目的全部资源", permissions: ["WORKFLOW_CREATE", "BLUEPRINT_MANAGE", "TEAM_MANAGE"] },
  { id: "PROJECT_MEMBER", name: "项目成员", description: "参与项目开发和执行", permissions: ["WORKFLOW_EXECUTE", "BLUEPRINT_USE", "ANALYTICS_VIEW"] },
  { id: "AUDITOR", name: "审计员", description: "查看系统审计日志和合规报告", permissions: ["AUDIT_VIEW", "REPORT_GENERATE", "COMPLIANCE_CHECK"] },
];

export const roleRouter = router({
  // 获取所有角色
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // 检查用户是否为平台管理员
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only platform admins can list roles.');
      }

      // 返回预定义的角色
      return PREDEFINED_ROLES;
    }),

  // 获取单个角色
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
        throw new Error('Access denied. Only platform admins can view roles.');
      }

      const role = PREDEFINED_ROLES.find(r => r.id === input.id);
      if (!role) {
        throw new Error('Role not found');
      }

      return role;
    }),

  // 更新角色权限（仅管理员可操作）
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否为平台管理员
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'TENANT_ADMIN') {
        throw new Error('Access denied. Only platform admins can update roles.');
      }

      // 暂时不支持自定义角色的修改，只返回预定义角色数据
      // 在实际应用中，这里应该更新数据库中的角色定义
      const role = PREDEFINED_ROLES.find(r => r.id === input.id);
      if (!role) {
        throw new Error('Role not found');
      }

      // 模拟更新（在真实应用中，这会更新数据库记录）
      const updatedRole = {
        ...role,
        ...input,
        name: input.name ?? role.name,
        description: input.description ?? role.description,
        permissions: input.permissions ?? role.permissions,
      };

      return updatedRole;
    }),
});