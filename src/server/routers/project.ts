import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const projectRouter = router({
  list: publicProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const projects = await ctx.prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        include: { workspace: true },
      });
      return projects;
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1, "项目名称不能为空"),
      description: z.string().optional(),
      type: z.string().default("client"),
    }))
    .mutation(async ({ ctx, input }) => {
      // 自动获取或创建 tenant → workspace → user
      let tenant = await ctx.prisma.tenant.findFirst();
      if (!tenant) {
        tenant = await ctx.prisma.tenant.create({
          data: { name: "默认租户", industry: "互联网" },
        });
      }

      let workspace = await ctx.prisma.workspace.findFirst({
        where: { tenantId: tenant.id },
      });
      if (!workspace) {
        workspace = await ctx.prisma.workspace.create({
          data: { name: "默认工作空间", tenantId: tenant.id },
        });
      }

      let user = await ctx.prisma.user.findFirst({
        where: { tenantId: tenant.id },
      });
      if (!user) {
        user = await ctx.prisma.user.create({
          data: {
            email: "dev@localhost.com",
            name: "开发者",
            role: "SUPER_ADMIN",
            tenantId: tenant.id,
          },
        });
      }

      const project = await ctx.prisma.project.create({
        data: {
          name: input.name,
          description: input.description || undefined,
          type: input.type,
          workspaceId: workspace.id,
          ownerId: user.id,
        },
        include: { workspace: true },
      });

      return project;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.id },
        include: { workspace: true, _count: { select: { raws: true, atoms: true, blueprints: true } } },
      })
    ),
});