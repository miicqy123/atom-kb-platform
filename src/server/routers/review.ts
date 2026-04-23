import { z } from "zod";
import { router, withPermission } from "../trpc";

export const reviewRouter = router({
  queue: withPermission("orchestration", "read")
    .input(z.object({ projectId: z.string(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.reviewTask.findMany({
        where: { workflowRun: { projectId: input.projectId }, ...(input.status ? { status: input.status as any } : {}) },
        orderBy: [{ urgency: "asc" }, { createdAt: "asc" }],
        include: { workflowRun: { include: { blueprint: { select: { name: true } } } }, assignee: true },
        take: 100,
      });
    }),
  getById: withPermission("orchestration", "read")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.reviewTask.findUnique({
        where: { id: input.id },
        include: { workflowRun: { include: { blueprint: { select: { name: true } } } }, assignee: true }
      });
    }),
  resolve: withPermission("orchestration", "write")
    .input(z.object({
      id: z.string(), status: z.string(), // APPROVED | MODIFIED_APPROVED | REJECTED | ESCALATED
      modifiedOutput: z.string().optional(), feedback: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.reviewTask.update({ where: { id: input.id }, data: { status: input.status as any, modifiedOutput: input.modifiedOutput, feedback: input.feedback, assigneeId: ctx.user.id } });
      await ctx.prisma.auditLog.create({ data: { userId: ctx.user.id, action: "review", entityType: "review_task", entityId: task.id, changeSummary: `审核结果: ${input.status}` } });
      return task;
    }),
  create: withPermission("orchestration", "write")
    .input(z.object({
      workflowRunId: z.string(),
      triggerReason: z.string(),
      urgency: z.enum(['RED', 'YELLOW', 'GREEN']),
      assigneeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.reviewTask.create({
        data: {
          workflowRunId: input.workflowRunId,
          triggerReason: input.triggerReason,
          urgency: input.urgency,
          assigneeId: input.assigneeId,
          status: 'PENDING',
          createdBy: ctx.user.id,
        }
      });

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "create_review_task",
          entityType: "review_task",
          entityId: task.id,
          changeSummary: `创建审核任务: ${input.triggerReason}`
        }
      });

      return task;
    }),
  update: withPermission("orchestration", "write")
    .input(z.object({
      id: z.string(),
      triggerReason: z.string().optional(),
      urgency: z.enum(['RED', 'YELLOW', 'GREEN']).optional(),
      assigneeId: z.string().optional(),
      status: z.string().optional(), // PENDING | APPROVED | REJECTED | IN_PROGRESS | etc.
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const task = await ctx.prisma.reviewTask.update({
        where: { id },
        data: updateData
      });

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "update_review_task",
          entityType: "review_task",
          entityId: task.id,
          changeSummary: `更新审核任务: ${JSON.stringify(updateData)}`
        }
      });

      return task;
    }),
  delete: withPermission("orchestration", "write")
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.reviewTask.findUnique({
        where: { id: input.id }
      });

      if (!task) {
        throw new Error('审核任务不存在');
      }

      const deletedTask = await ctx.prisma.reviewTask.delete({
        where: { id: input.id }
      });

      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "delete_review_task",
          entityType: "review_task",
          entityId: task.id,
          changeSummary: `删除审核任务`
        }
      });

      return deletedTask;
    }),
});