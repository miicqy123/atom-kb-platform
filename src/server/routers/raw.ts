import { z } from "zod";
import { protectedProcedure, router, publicProcedure } from "../trpc";

export const rawRouter = router({
  // 获取所有Raw素材
  getAll: publicProcedure
    .input(z.object({
      projectId: z.string(),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
      search: z.string().optional(), // 添加搜索参数
      materialType: z.string().optional(), // 添加类型过滤
      experienceSource: z.string().optional(), // 添加来源过滤
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, limit, offset, search, materialType, experienceSource } = input;

      const whereClause: any = { projectId };

      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { originalFileName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (materialType && materialType !== 'ALL') {
        whereClause.materialType = materialType;
      }

      if (experienceSource && experienceSource !== 'ALL') {
        whereClause.experienceSource = experienceSource;
      }

      const rawMaterials = await ctx.prisma.raw.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      const totalCount = await ctx.prisma.raw.count({
        where: whereClause
      });

      return {
        items: rawMaterials,
        totalCount,
        hasMore: offset + limit < totalCount
      };
    }),

  // 根据ID获取单个Raw素材
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.raw.findUnique({
        where: { id: input.id },
      });
    }),

  // 创建Raw素材
  create: publicProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      projectId: z.string(),
      format: z.enum(['WORD', 'PDF', 'PPT', 'EXCEL', 'AUDIO', 'VIDEO', 'SCREENSHOT', 'WEB_LINK']),
      materialType: z.enum([
        'THEORY', 'CASE_STUDY', 'METHODOLOGY', 'FAQ', 'SCRIPT',
        'REGULATION', 'PRODUCT_DOC', 'TRAINING_MATERIAL', 'MEETING_RECORD',
        'CUSTOMER_VOICE', 'INDUSTRY_REPORT', 'COMPETITOR_ANALYSIS',
        'INTERNAL_WIKI', 'OTHER'
      ]),
      experienceSource: z.enum(['E1_COMPANY', 'E2_INDUSTRY', 'E3_CROSS_INDUSTRY']),
      originalFileName: z.string().optional(),
      originalFileUrl: z.string().optional(), // 添加这个字段
      markdownContent: z.string().optional(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.create({
        data: input as any,
      });

      // TODO: 上线前恢复审计日志
      // await ctx.prisma.auditLog.create({
      //   data: {
      //     userId: ctx.user.id,
      //     action: "create",
      //     entityType: "raw",
      //     entityId: raw.id,
      //     entityName: raw.title
      //   }
      // });

      return raw;
    }),

  // 更新Raw素材
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(255).optional(),
      format: z.enum(['WORD', 'PDF', 'PPT', 'EXCEL', 'AUDIO', 'VIDEO', 'SCREENSHOT', 'WEB_LINK']).optional(),
      materialType: z.enum([
        'THEORY', 'CASE_STUDY', 'METHODOLOGY', 'FAQ', 'SCRIPT',
        'REGULATION', 'PRODUCT_DOC', 'TRAINING_MATERIAL', 'MEETING_RECORD',
        'CUSTOMER_VOICE', 'INDUSTRY_REPORT', 'COMPETITOR_ANALYSIS',
        'INTERNAL_WIKI', 'OTHER'
      ]).optional(),
      experienceSource: z.enum(['E1_COMPANY', 'E2_INDUSTRY', 'E3_CROSS_INDUSTRY']).optional(),
      originalFileName: z.string().optional(),
      markdownContent: z.string().optional(),
      conversionStatus: z.enum(['PENDING', 'CONVERTING', 'CONVERTED', 'FAILED']).optional(),
      verificationStatus: z.string().optional(),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否有权限更新此素材
      const rawMaterial = await ctx.prisma.raw.findUnique({
        where: { id },
      });

      if (!rawMaterial) {
        throw new Error('Raw material not found');
      }

      // 确保用户属于该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: rawMaterial.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.raw.update({
        where: { id },
        data: updateData,
      });
    }),

  // 删除Raw素材
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限删除此素材
      const rawMaterial = await ctx.prisma.raw.findUnique({
        where: { id: input.id },
      });

      if (!rawMaterial) {
        throw new Error('Raw material not found');
      }

      // 确保用户属于该项目
      const project = await ctx.prisma.project.findUnique({
        where: { id: rawMaterial.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return ctx.prisma.raw.delete({
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

      const stats = await ctx.prisma.raw.groupBy({
        where: { projectId },
        by: ['materialType'],
        _count: {
          _all: true,
        },
      });

      const total = await ctx.prisma.raw.count({
        where: { projectId },
      });

      const statusCount = await ctx.prisma.raw.groupBy({
        where: { projectId },
        by: ['conversionStatus'],
        _count: {
          _all: true,
        },
      });

      return {
        total,
        byType: stats,
        byStatus: statusCount,
      };
    }),

  // 批量操作
  batchDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查每个素材的权限
      const rawMaterials = await ctx.prisma.raw.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });

      if (rawMaterials.length !== input.ids.length) {
        throw new Error('Some raw materials not found');
      }

      // 确保所有素材都在用户的项目中
      const uniqueProjectIds = Array.from(new Set(rawMaterials.map(rm => rm.projectId)));
      for (const projectId of uniqueProjectIds) {
        const project = await ctx.prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          throw new Error(`Project ${projectId} not found`);
        }
      }

      return ctx.prisma.raw.deleteMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });
    }),
});
