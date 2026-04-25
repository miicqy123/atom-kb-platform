import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const rawRouter = router({
  list: publicProcedure
    .input(z.object({
      projectId: z.string(),
      format: z.string().optional(),
      conversionStatus: z.string().optional(),
      search: z.string().optional(),
      titlePrefix: z.string().optional(),
      materialType: z.string().optional(),
      experienceSource: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.format) where.format = input.format;
      if (input.conversionStatus) where.conversionStatus = input.conversionStatus;
      if (input.search) where.title = { contains: input.search, mode: "insensitive" };
      else if (input.titlePrefix) where.title = { startsWith: input.titlePrefix };
      if (input.materialType) where.materialType = input.materialType;
      if (input.experienceSource) where.experienceSource = input.experienceSource;

      const [items, total] = await Promise.all([
        ctx.prisma.raw.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { atoms: true, qaPairs: true } } },
        }),
        ctx.prisma.raw.count({ where }),
      ]);

      return { items, total, totalPages: Math.ceil(total / input.pageSize) };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.raw.findUniqueOrThrow({
        where: { id: input.id },
        include: { atoms: { take: 50 }, qaPairs: { take: 50 } },
      })
    ),

  getByIds: publicProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(({ ctx, input }) =>
      ctx.prisma.raw.findMany({
        where: { id: { in: input.ids } },
        include: { atoms: { take: 50 }, qaPairs: { take: 50 } },
      })
    ),

  create: publicProcedure
    .input(z.object({
      title: z.string(),
      projectId: z.string(),
      format: z.string(),
      materialType: z.string(),
      experienceSource: z.string(),
      originalFileUrl: z.string().optional(),
      originalFileName: z.string().optional(),
      fileSize: z.number().optional(),
      exposureLevel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.create({ data: input as any });
      // auditLog 跳过（开发阶段无 session）
      return raw;
    }),

  update: publicProcedure
    .input(z.object({ id: z.string(), data: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.update({
        where: { id: input.id },
        data: input.data as any,
      });
      return raw;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.raw.delete({ where: { id: input.id } });
      return { success: true };
    }),

  addToKnowledgeBase: publicProcedure
    .input(z.object({
      rawId: z.string(),
      projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.findUniqueOrThrow({ where: { id: input.rawId } });
      const atom = await ctx.prisma.atom.create({
        data: {
          title: raw.title,
          content: raw.markdownContent || "",
          projectId: input.projectId,
          rawId: raw.id,
          layer: "A" as const,
          experienceSource: raw.experienceSource,
          status: "DRAFT" as const,
        },
      });
      return atom;
    }),

  createFromSurvey: publicProcedure
    .input(z.object({
      projectId: z.string(),
      title: z.string(),
      markdownContent: z.string(),
      materialType: z.string().default("INTERNAL_WIKI"),
      experienceSource: z.string().default("E1_COMPANY"),
    }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.create({
        data: {
          title: input.title,
          projectId: input.projectId,
          format: "WORD" as any,
          materialType: (input.materialType || "INTERNAL_WIKI") as any,
          experienceSource: (input.experienceSource || "E1_COMPANY") as any,
          markdownContent: input.markdownContent,
          conversionStatus: "CONVERTED" as any,
          verificationStatus: "unverified",
          exposureLevel: "INTERNAL",
        },
      });
      return raw;
    }),

  startConversion: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.findUniqueOrThrow({ where: { id: input.id } });
      if (!raw.originalFileUrl) {
        throw new Error("No file URL associated");
      }
      const { runConversion } = await import("@/server/services/conversion");
      await runConversion(input.id);
      return { success: true, message: "done" };
    }),

  ocrImage: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const raw = await ctx.prisma.raw.findUniqueOrThrow({ where: { id: input.id } });
      if (!raw.originalFileUrl) throw new Error("No file URL");
      if (raw.format !== "SCREENSHOT") throw new Error("Only SCREENSHOT format supports OCR");

      const { parseDocument } = await import("@/server/services/document-parse-service");

      const response = await fetch(raw.originalFileUrl);
      const buf = Buffer.from(await response.arrayBuffer());

      const mimeType = raw.originalFileName?.endsWith(".png") ? "image/png" : "image/jpeg";
      const { markdown, provider, model } = await parseDocument(buf, mimeType, "IMAGE_OCR");

      await ctx.prisma.raw.update({
        where: { id: input.id },
        data: {
          markdownContent: markdown,
          conversionStatus: "CONVERTED",
          metadata: { ocrProvider: provider, ocrModel: model } as any,
        },
      });

      return { success: true, provider, model, length: markdown.length };
    }),
});
