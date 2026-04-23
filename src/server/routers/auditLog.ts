import { z } from "zod";
import { router, withPermission } from "../trpc";

export const auditLogRouter = router({
  list: withPermission("governance", "read").input(z.object({ entityType: z.string().optional(), userId: z.string().optional(), from: z.string().optional(), to: z.string().optional(), page: z.number().default(1) })).query(async ({ ctx, input }) => {
    const where: any = {};
    if (input.entityType) where.entityType = input.entityType;
    if (input.userId) where.userId = input.userId;
    if (input.from) where.createdAt = { gte: new Date(input.from) };
    const [items, total] = await Promise.all([ctx.prisma.auditLog.findMany({ where, skip: (input.page - 1) * 50, take: 50, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }), ctx.prisma.auditLog.count({ where })]);
    return { items, total };
  }),
});