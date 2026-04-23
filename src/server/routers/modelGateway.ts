import { z } from "zod";
import { router, withPermission } from "../trpc";

export const modelGatewayRouter = router({
  // 获取所有模型提供商
  getProviders: withPermission("governance", "read").query(({ ctx }) => {
    return ctx.prisma.modelProvider.findMany({
      include: {
        models: true,
        _count: {
          select: { models: true }
        }
      },
      orderBy: { name: "asc" }
    });
  }),

  // 获取特定提供商的模型
  getModelsByProvider: withPermission("governance", "read").input(z.object({
    providerId: z.string()
  })).query(({ ctx, input }) => {
    return ctx.prisma.model.findMany({
      where: { providerId: input.providerId },
      orderBy: { name: "asc" }
    });
  }),

  // 获取路由规则
  getRoutingRules: withPermission("governance", "read").input(z.object({
    projectId: z.string().optional()
  })).query(({ ctx, input }) => {
    return ctx.prisma.routingRule.findMany({
      where: input.projectId ? { projectId: input.projectId } : {},
      include: {
        modelConnections: {
          include: {
            model: true
          }
        }
      },
      orderBy: { priority: "asc" }
    });
  }),

  // 创建路由规则
  createRoutingRule: withPermission("governance", "write").input(z.object({
    name: z.string(),
    providerId: z.string(),
    modelIds: z.array(z.string()),
    weight: z.number().min(0).max(100),
    priority: z.number(),
    enabled: z.boolean().default(true),
    projectId: z.string().optional()
  })).mutation(({ ctx, input }) => {
    return ctx.prisma.routingRule.create({
      data: {
        name: input.name,
        providerId: input.providerId,
        weight: input.weight,
        priority: input.priority,
        enabled: input.enabled,
        projectId: input.projectId,
        createdBy: ctx.session.user.id,
        modelConnections: {
          create: input.modelIds.map(modelId => ({
            modelId: modelId
          }))
        }
      }
    });
  }),

  // 更新路由规则
  updateRoutingRule: withPermission("governance", "write").input(z.object({
    id: z.string(),
    name: z.string().optional(),
    providerId: z.string().optional(),
    modelIds: z.array(z.string()).optional(),
    weight: z.number().min(0).max(100).optional(),
    priority: z.number().optional(),
    enabled: z.boolean().optional()
  })).mutation(async ({ ctx, input }) => {
    const { id, modelIds, ...updateData } = input;

    // 更新路由规则基本信息
    const updatedRule = await ctx.prisma.routingRule.update({
      where: { id },
      data: updateData
    });

    // 如果提供了模型ID，则更新关联关系
    if (modelIds !== undefined) {
      // 删除现有的关联
      await ctx.prisma.routingRuleModelConnection.deleteMany({
        where: { ruleId: id }
      });

      // 创建新的关联
      if (modelIds.length > 0) {
        await ctx.prisma.routingRuleModelConnection.createMany({
          data: modelIds.map(modelId => ({
            ruleId: id,
            modelId: modelId
          }))
        });
      }
    }

    return updatedRule;
  }),

  // 删除路由规则
  deleteRoutingRule: withPermission("governance", "write").input(z.object({
    id: z.string()
  })).mutation(({ ctx, input }) => {
    return ctx.prisma.routingRule.delete({
      where: { id: input.id }
    });
  }),

  // 获取端点列表
  getEndpoints: withPermission("governance", "read").input(z.object({
    providerId: z.string().optional()
  })).query(({ ctx, input }) => {
    return ctx.prisma.modelEndpoint.findMany({
      where: input.providerId ? { providerId: input.providerId } : {},
      orderBy: { region: "asc" }
    });
  }),

  // 创建端点
  createEndpoint: withPermission("governance", "write").input(z.object({
    providerId: z.string(),
    region: z.string(),
    endpointUrl: z.string().url(),
    apiKey: z.string(),
    rateLimit: z.number().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "DEGRADED"]).default("ACTIVE")
  })).mutation(({ ctx, input }) => {
    return ctx.prisma.modelEndpoint.create({
      data: {
        providerId: input.providerId,
        region: input.region,
        endpointUrl: input.endpointUrl,
        apiKey: input.apiKey, // 实际部署中应加密存储
        rateLimit: input.rateLimit,
        status: input.status,
        createdBy: ctx.session.user.id
      }
    });
  }),

  // 更新端点
  updateEndpoint: withPermission("governance", "write").input(z.object({
    id: z.string(),
    region: z.string().optional(),
    endpointUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
    rateLimit: z.number().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "DEGRADED"]).optional()
  })).mutation(({ ctx, input }) => {
    const { id, ...updateData } = input;
    return ctx.prisma.modelEndpoint.update({
      where: { id },
      data: updateData
    });
  }),

  // 删除端点
  deleteEndpoint: withPermission("governance", "write").input(z.object({
    id: z.string()
  })).mutation(({ ctx, input }) => {
    return ctx.prisma.modelEndpoint.delete({
      where: { id: input.id }
    });
  }),

  // 测试端点连接
  testEndpoint: withPermission("governance", "read").input(z.object({
    id: z.string()
  })).mutation(async ({ ctx, input }) => {
    const endpoint = await ctx.prisma.modelEndpoint.findUnique({
      where: { id: input.id }
    });

    if (!endpoint) {
      throw new Error("端点不存在");
    }

    // 这里应该实际调用端点进行测试，这里简化处理
    // 实际实现中会向该端点发送测试请求
    return {
      id: endpoint.id,
      connected: true, // 模拟连接成功
      latency: Math.floor(Math.random() * 300) + 50, // 模拟延迟 50-350ms
      lastTested: new Date()
    };
  })
});