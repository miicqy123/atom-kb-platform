import { z } from "zod";
import { protectedProcedure, router, permissionProcedure } from "../trpc";

export const atomRouter = router({
  // 获取所有原子块
  getAll: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      layer: z.enum(['A', 'B', 'C', 'D']).optional(),
      granularity: z.enum(['ATOM', 'MODULE', 'PACK']).optional(),
      status: z.enum(['DRAFT', 'TESTING', 'ACTIVE', 'ARCHIVED']).optional(),
      category: z.enum([
        'CAT_WHO', 'CAT_WHAT', 'CAT_HOW',
        'CAT_STYLE', 'CAT_FENCE', 'CAT_PROOF'
      ]).optional(),
      subcategory: z.enum([
        'WHO_BRAND', 'WHO_ROLE', 'WHO_AUDIENCE', 'WHO_TERM',
        'WHAT_PRODUCT', 'WHAT_USP', 'WHAT_PRICE', 'WHAT_CERT',
        'HOW_SOP', 'HOW_METHOD', 'HOW_TACTIC', 'HOW_BEST',
        'STYLE_HOOK', 'STYLE_WORD', 'STYLE_TONE', 'STYLE_RHYTHM',
        'FENCE_BAN', 'FENCE_ALLOW', 'FENCE_LAW', 'FENCE_BLUR',
        'PROOF_CASE', 'PROOF_DATA', 'PROOF_FAIL', 'PROOF_COMPARE'
      ]).optional(),
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
      if (input.category) {
        whereClause.category = input.category;
      }
      if (input.subcategory) {
        whereClause.subcategory = input.subcategory;
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
        include: {
          blueprints: {
            include: {
              blueprint: { select: { id: true, name: true } }
            }
          },
          raw: { select: { id: true, title: true } },
        },
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
      experienceSource: z.enum(['E1_COMPANY', 'E2_INDUSTRY', 'E3_BOOK']),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).default('INTERNAL'),
      status: z.enum(['DRAFT', 'TESTING', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
      dimensions: z.array(z.number()).optional(),
      slotMappings: z.array(z.string()).optional(),
      wordCount: z.number().optional(),
      tokenEstimate: z.number().optional(),
      category: z.enum([
        'CAT_WHO','CAT_WHAT','CAT_HOW','CAT_STYLE','CAT_FENCE','CAT_PROOF'
      ]).optional(),
      subcategory: z.enum([
        'WHO_BRAND','WHO_ROLE','WHO_AUDIENCE','WHO_TERM',
        'WHAT_PRODUCT','WHAT_USP','WHAT_PRICE','WHAT_CERT',
        'HOW_SOP','HOW_METHOD','HOW_TACTIC','HOW_BEST',
        'STYLE_HOOK','STYLE_WORD','STYLE_TONE','STYLE_RHYTHM',
        'FENCE_BAN','FENCE_ALLOW','FENCE_LAW','FENCE_BLUR',
        'PROOF_CASE','PROOF_DATA','PROOF_FAIL','PROOF_COMPARE'
      ]).optional(),
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
          category: input.category,
          subcategory: input.subcategory,
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
      experienceSource: z.enum(['E1_COMPANY', 'E2_INDUSTRY', 'E3_BOOK']).optional(),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional(),
      status: z.enum(['DRAFT', 'TESTING', 'ACTIVE', 'ARCHIVED']).optional(),
      dimensions: z.array(z.number()).optional(),
      slotMappings: z.array(z.string()).optional(),
      wordCount: z.number().optional(),
      tokenEstimate: z.number().optional(),
      category: z.enum([
        'CAT_WHO','CAT_WHAT','CAT_HOW','CAT_STYLE','CAT_FENCE','CAT_PROOF'
      ]).optional(),
      subcategory: z.enum([
        'WHO_BRAND','WHO_ROLE','WHO_AUDIENCE','WHO_TERM',
        'WHAT_PRODUCT','WHAT_USP','WHAT_PRICE','WHAT_CERT',
        'HOW_SOP','HOW_METHOD','HOW_TACTIC','HOW_BEST',
        'STYLE_HOOK','STYLE_WORD','STYLE_TONE','STYLE_RHYTHM',
        'FENCE_BAN','FENCE_ALLOW','FENCE_LAW','FENCE_BLUR',
        'PROOF_CASE','PROOF_DATA','PROOF_FAIL','PROOF_COMPARE'
      ]).optional(),
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

      // 修改原子块前，查出关联蓝图并通知
      const linkedBlueprints = await ctx.prisma.atomBlueprint.findMany({
        where: { atomId: input.id },
        include: { blueprint: { select: { id: true, name: true } } },
      });

      // 执行实际更新
      const updated = await ctx.prisma.atom.update({
        where: { id: input.id },
        data: updateData,
      });

      // 返回关联蓝图清单，前端弹出提示
      return { atom: updated, affectedBlueprints: linkedBlueprints.map(lb => lb.blueprint) };
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

      // 删除前检查：有关联蓝图则拒绝
      const linkedCount = await ctx.prisma.atomBlueprint.count({ where: { atomId: input.id } });
      if (linkedCount > 0) {
        throw new Error(`该原子块被 ${linkedCount} 条蓝图引用，请先解除关联再删除`);
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

      const byCategory = await ctx.prisma.atom.groupBy({
        where: { projectId },
        by: ['category'],
        _count: { _all: true },
      });

      return {
        total,
        byLayer: stats,
        byStatus: statusCount,
        byCategory,
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

  // 批量激活原子块
  batchActivate: permissionProcedure('atom:activate')
    .input(z.object({
      ids: z.array(z.string()),
      projectId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.atom.updateMany({
        where: {
          id: { in: input.ids },
          projectId: input.projectId
        },
        data: { status: 'ACTIVE' },
      });
      return { count: result.count };
    }),

  // 批量归档原子块
  batchArchive: permissionProcedure('atom:archive')
    .input(z.object({
      ids: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.atom.updateMany({
        where: { id: { in: input.ids } },
        data: { status: 'ARCHIVED' },
      });
      return { count: result.count };
    }),

  // 更新标签
  updateTags: protectedProcedure
    .input(z.object({
      id: z.string(),
      layer: z.enum(['A','B','C','D']),
      slotMappings: z.array(z.string()),
      dimensions: z.array(z.number()),
      granularity: z.enum(['ATOM','MODULE','PACK']),
      category: z.enum([
        'CAT_WHO','CAT_WHAT','CAT_HOW','CAT_STYLE','CAT_FENCE','CAT_PROOF'
      ]).optional(),
      subcategory: z.enum([
        'WHO_BRAND','WHO_ROLE','WHO_AUDIENCE','WHO_TERM',
        'WHAT_PRODUCT','WHAT_USP','WHAT_PRICE','WHAT_CERT',
        'HOW_SOP','HOW_METHOD','HOW_TACTIC','HOW_BEST',
        'STYLE_HOOK','STYLE_WORD','STYLE_TONE','STYLE_RHYTHM',
        'FENCE_BAN','FENCE_ALLOW','FENCE_LAW','FENCE_BLUR',
        'PROOF_CASE','PROOF_DATA','PROOF_FAIL','PROOF_COMPARE'
      ]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.atom.update({
        where: { id: input.id },
        data: {
          layer: input.layer,
          slotMappings: input.slotMappings,
          dimensions: input.dimensions,
          granularity: input.granularity,
          category: input.category,
          subcategory: input.subcategory,
        },
      });
    }),

  // 创建新版本（保留旧版本快照）
  createVersion: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const original = await ctx.prisma.atom.findUniqueOrThrow({ where: { id: input.id } });

      // 将当前版本快照存入 AuditLog
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: 'VERSION_SNAPSHOT',
          entityType: 'ATOM',
          entityId: input.id,
          entityName: original.title,
          changeSummary: `Version ${original.version} snapshot`,
          diff: {
            before: original,
            reason: input.reason,
          },
        },
      });

      // 升级版本号
      const updated = await ctx.prisma.atom.update({
        where: { id: input.id },
        data: { version: { increment: 1 } },
      });

      return { atom: updated, snapshotVersion: original.version };
    }),

  // 获取历史版本列表
  getVersionHistory: protectedProcedure
    .input(z.object({ atomId: z.string() }))
    .query(async ({ input, ctx }) => {
      const logs = await ctx.prisma.auditLog.findMany({
        where: {
          entityId: input.atomId,
          entityType: 'ATOM',
          action: 'VERSION_SNAPSHOT',
        },
        orderBy: { createdAt: 'desc' },
      });
      return logs.map(l => ({
        id: l.id,
        version: (l.diff as any)?.before?.version,
        content: (l.diff as any)?.before?.content,
        reason: (l.diff as any)?.reason,
        createdAt: l.createdAt,
      }));
    }),
});
