import { z } from "zod";
import { publicProcedure, protectedProcedure, router, permissionProcedure } from "../trpc";

export const blueprintRouter = router({
  // 获取所有蓝图
  getAll: publicProcedure
    .input(z.object({
      projectId: z.string(),
      status: z.string().optional(),
      search: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, status, search, category, limit, offset } = input;

      const where: any = { projectId };

      if (status) where.status = status;
      if (search) where.name = { contains: search, mode: "insensitive" };
      if (category) where.category = category;

      const [items, total] = await Promise.all([
        ctx.prisma.blueprint.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { atoms: true, workflowRuns: true } },
            slotConfigs: { orderBy: { order: "asc" } }
          }
        }),
        ctx.prisma.blueprint.count({ where }),
      ]);

      return {
        items,
        totalCount: total,
        hasMore: offset + limit < total
      };
    }),

  // 根据ID获取单个蓝图
  getById: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.blueprint.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          slotConfigs: {
            orderBy: { order: "asc" },
            include: { fetchRules: true }
          },
          atoms: {
            include: { atom: true }
          }
        }
      });
    }),

  // 创建蓝图
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      projectId: z.string(),
      enterprise: z.string().optional(),
      position: z.string().optional(),
      taskName: z.string().optional(),
      workflowMode: z.enum(['DAG', 'REACT', 'ROLE_COLLABORATION', 'STATEFUL_GRAPH']).default("DAG"),
      description: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED', 'CONFIGURING', 'TESTING', 'ONLINE', 'DEPRECATED']).optional().default('DRAFT'),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional().default('INTERNAL'),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const bp = await ctx.prisma.blueprint.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          enterprise: input.enterprise,
          position: input.position,
          taskName: input.taskName,
          workflowMode: input.workflowMode,
          description: input.description,
          category: input.category,
          status: input.status,
          exposureLevel: input.exposureLevel,
          createdBy: ctx.session?.user?.id ?? "system",
        }
      });

      // 自动创建 S0-S10 的 SlotConfig
      const slots = ["S0","S1","S2","S3","S4","S6","S5","S10","S7","S8","S9"];
      await ctx.prisma.slotConfig.createMany({
        data: slots.map((s, i) => ({
          blueprintId: bp.id,
          slotKey: s,
          order: i,
        })),
      });

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.session?.user?.id ?? "system",
          action: "CREATE_BLUEPRINT",
          entityType: "blueprint",
          entityId: bp.id,
          entityName: bp.name,
        }
      });

      return bp;
    }),

  // 更新槽位配置
  updateSlotConfig: publicProcedure
    .input(z.object({
      slotConfigId: z.string(),
      maxTokens: z.number().optional(),
      conflictPriority: z.array(z.string()).optional(),
      dedupe: z.boolean().optional(),
      fallbackStrategy: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { slotConfigId, ...data } = input;

      // 检查用户是否有权限更新此槽位配置
      const slotConfig = await ctx.prisma.slotConfig.findUnique({
        where: { id: slotConfigId },
        include: {
          blueprint: {
            include: {
              project: true
            }
          }
        }
      });

      if (!slotConfig) {
        throw new Error('Slot config not found');
      }

      // 检查用户是否属于相关项目 - TODO: 恢复 Auth 后启用权限检查
      if (ctx.session?.user?.id) {
        const project = slotConfig.blueprint.project;
        const userMembership = await ctx.prisma.workspaceUser.findFirst({
          where: {
            workspaceId: project.workspaceId,
            userId: ctx.session.user.id,
          },
        });

        if (!userMembership && project.ownerId !== ctx.session.user.id) {
          throw new Error('Access denied');
        }
      }

      return ctx.prisma.slotConfig.update({
        where: { id: slotConfigId },
        data
      });
    }),

  // 从库选料 — 根据槽位推荐原子块
  recommendAtoms: publicProcedure
    .input(z.object({
      blueprintId: z.string(),
      slotKey: z.string(),
      topN: z.number().default(10),
      categories: z.array(z.string()).optional(),
      subcategories: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.findUniqueOrThrow({
        where: { id: input.blueprintId },
        include: { project: true },
      });

      const where: any = {
        projectId: bp.projectId,
        status: 'ACTIVE',
        slotMappings: { has: input.slotKey },
      };

      if (input.categories?.length) {
        where.category = { in: input.categories };
      }
      if (input.subcategories?.length) {
        where.subcategory = { in: input.subcategories };
      }

      return ctx.prisma.atom.findMany({
        where,
        take: input.topN,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { blueprints: true } } },
      });
    }),

  // 装配预览 — 拼装 System Prompt
  assemblePreview: publicProcedure
    .input(z.object({
      blueprintId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      // 检查用户是否有权限访问此蓝图 - TODO: 恢复 Auth 后启用权限检查
      const bp = await ctx.prisma.blueprint.findUniqueOrThrow({
        where: { id: input.blueprintId },
        include: {
          project: true,
          slotConfigs: { orderBy: { order: "asc" } },
          atoms: { include: { atom: true } }
        }
      });

      if (ctx.session?.user?.id) {
        const project = bp.project;
        const userMembership = await ctx.prisma.workspaceUser.findFirst({
          where: {
            workspaceId: project.workspaceId,
            userId: ctx.session.user.id,
          },
        });

        if (!userMembership && project.ownerId !== ctx.session.user.id) {
          throw new Error('Access denied');
        }
      }

      let prompt = "";
      let totalTokens = 0;
      const slotStats: { slot: string; tokens: number; atomCount: number }[] = [];

      for (const sc of bp.slotConfigs) {
        const slotAtoms = bp.atoms.filter(a => a.slotKey === sc.slotKey).map(a => a.atom);
        const content = slotAtoms.map(a => a.content).join("\n\n");
        const tokens = Math.ceil(content.length / 2); // 粗估
        prompt += `\n<!-- ${sc.slotKey} -->\n${content}\n`;
        totalTokens += tokens;
        slotStats.push({
          slot: sc.slotKey,
          tokens,
          atomCount: slotAtoms.length
        });
      }

      return { prompt, totalTokens, slotStats };
    }),

  // 状态流转
  updateStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED', 'CONFIGURING', 'TESTING', 'ONLINE', 'DEPRECATED'])
    }))
    .mutation(async ({ ctx, input }) => {
      const bp = await ctx.prisma.blueprint.findUnique({
        where: { id: input.id },
        include: { project: true }
      });

      if (!bp) {
        throw new Error('Blueprint not found');
      }

      // 检查用户是否有权限更新此蓝图 - TODO: 恢复 Auth 后启用权限检查
      if (ctx.session?.user?.id) {
        const project = bp.project;
        const userMembership = await ctx.prisma.workspaceUser.findFirst({
          where: {
            workspaceId: project.workspaceId,
            userId: ctx.session.user.id,
          },
        });

        if (!userMembership && project.ownerId !== ctx.session.user.id) {
          throw new Error('Access denied');
        }
      }

      const updatedBp = await ctx.prisma.blueprint.update({
        where: { id: input.id },
        data: {
          status: input.status,
          version: input.status === "APPROVED" ? { increment: 1 } : undefined
        }
      });

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.session?.user?.id ?? "system",
          action: "UPDATE_BLUEPRINT_STATUS",
          entityType: "blueprint",
          entityId: updatedBp.id,
          entityName: updatedBp.name,
          changeSummary: `Status changed to ${input.status}`
        }
      });

      return updatedBp;
    }),

  // 更新蓝图基本信息
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      enterprise: z.string().optional(),
      position: z.string().optional(),
      taskName: z.string().optional(),
      workflowMode: z.enum(['DAG', 'REACT', 'ROLE_COLLABORATION', 'STATEFUL_GRAPH']).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED', 'CONFIGURING', 'TESTING', 'ONLINE', 'DEPRECATED']).optional(),
      exposureLevel: z.enum(['INTERNAL', 'EXTERNAL', 'NEEDS_APPROVAL', 'STRICTLY_FORBIDDEN']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 检查用户是否有权限更新此蓝图 - TODO: 恢复 Auth 后启用权限检查
      const bp = await ctx.prisma.blueprint.findUnique({
        where: { id },
        include: { project: true }
      });

      if (!bp) {
        throw new Error('Blueprint not found');
      }

      if (ctx.session?.user?.id) {
        const project = bp.project;
        const userMembership = await ctx.prisma.workspaceUser.findFirst({
          where: {
            workspaceId: project.workspaceId,
            userId: ctx.session.user.id,
          },
        });

        if (!userMembership && project.ownerId !== ctx.session.user.id) {
          throw new Error('Access denied');
        }
      }

      return ctx.prisma.blueprint.update({
        where: { id },
        data: updateData
      });
    }),

  // 删除蓝图
  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查用户是否有权限删除此蓝图 - TODO: 恢复 Auth 后启用权限检查
      const bp = await ctx.prisma.blueprint.findUnique({
        where: { id: input.id },
        include: { project: true }
      });

      if (!bp) {
        throw new Error('Blueprint not found');
      }

      if (ctx.session?.user?.id) {
        const project = bp.project;
        const userMembership = await ctx.prisma.workspaceUser.findFirst({
          where: {
            workspaceId: project.workspaceId,
            userId: ctx.session.user.id,
          },
        });

        if (!userMembership && project.ownerId !== ctx.session.user.id) {
          throw new Error('Access denied');
        }
      }

      // 检查是否有工作流运行正在使用此蓝图
      const usageCount = await ctx.prisma.workflowRun.count({
        where: { blueprintId: input.id }
      });

      if (usageCount > 0) {
        throw new Error('Cannot delete blueprint in use by workflow runs');
      }

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.session?.user?.id ?? "system",
          action: "DELETE_BLUEPRINT",
          entityType: "blueprint",
          entityId: bp.id,
          entityName: bp.name,
        }
      });

      return ctx.prisma.blueprint.delete({
        where: { id: input.id },
      });
    }),

  // 获取蓝图统计
  getStats: publicProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // 检查用户是否有权限访问此项目 - TODO: 恢复 Auth 后启用权限检查
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      if (ctx.session?.user?.id) {
        const userMembership = await ctx.prisma.workspaceUser.findFirst({
          where: {
            workspaceId: project.workspaceId,
            userId: ctx.session.user.id,
          },
        });

        if (!userMembership && project.ownerId !== ctx.session.user.id) {
          throw new Error('Access denied');
        }
      }

      const [total, byStatus] = await Promise.all([
        ctx.prisma.blueprint.count({ where: { projectId: input.projectId } }),
        ctx.prisma.blueprint.groupBy({
          where: { projectId: input.projectId },
          by: ['status'],
          _count: { _all: true },
        })
      ]);

      return {
        total,
        byStatus,
      };
    }),

  assemble: publicProcedure
    .input(z.object({ blueprintId: z.string() }))
    .mutation(async ({ input }) => {
      const { assembleBlueprint } = await import('@/services/assemblyEngine');
      const result = await assembleBlueprint(input.blueprintId);
      return { assembled: result };
    }),

  preview: publicProcedure
    .input(z.object({ blueprintId: z.string() }))
    .query(async ({ input, ctx }) => {
      const slots = await ctx.prisma.slotConfig.findMany({
        where: { blueprintId: input.blueprintId },
        orderBy: { order: 'asc' },
      });
      return slots.map((s) => ({
        slotKey: s.slotKey,
        subSlotKey: s.subSlotKey,
        assembledContent: s.assembledContent,
      }));
    }),
});