import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const workbenchRouter = router({
  // 获取工作台进度
  getProgress: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      rawId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // 获取原始素材及其处理进度
      const raw = await ctx.prisma.raw.findUnique({
        where: { id: input.rawId },
        include: {
          processedChunks: true,
          processedTags: true,
          processedQaPairs: true,
        }
      });

      if (!raw) {
        throw new Error('Raw material not found');
      }

      // 计算各站点的处理进度
      const progress = {
        id: raw.id,
        title: raw.title,
        rawStatus: raw.conversionStatus,
        chunksCompleted: raw.processedChunks.length > 0,
        tagsCompleted: raw.processedTags.length > 0,
        qaPairsCompleted: raw.processedQaPairs.length > 0,
      };

      return progress;
    }),

  // 处理特定站点
  process: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      rawId: z.string(),
      station: z.string(), // 工作站名称，如 "chunking", "tagging", "qaGeneration"
      content: z.string(), // 处理后的内容
      title: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查权限
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 根据不同站点执行不同的处理逻辑
      switch (input.station) {
        case '智能切块':
        case '格式归一':
        case '切块':
        case 'chunking':
          // 创建或更新处理块
          await ctx.prisma.processedChunk.upsert({
            where: {
              rawId_station: {
                rawId: input.rawId,
                station: input.station,
              }
            },
            update: {
              content: input.content,
              title: input.title,
              tags: input.tags || [],
            },
            create: {
              rawId: input.rawId,
              station: input.station,
              content: input.content,
              title: input.title,
              tags: input.tags || [],
              processedBy: ctx.session.user.id,
              projectId: input.projectId,
            }
          });
          break;

        case '分类打标':
        case '标签':
        case 'tagging':
          // 创建或更新标签
          await ctx.prisma.processedTag.upsert({
            where: {
              rawId_station: {
                rawId: input.rawId,
                station: input.station,
              }
            },
            update: {
              tags: input.tags || [],
            },
            create: {
              rawId: input.rawId,
              station: input.station,
              tags: input.tags || [],
              processedBy: ctx.session.user.id,
              projectId: input.projectId,
            }
          });
          break;

        case 'QA 对生成':
        case 'qaGeneration':
          // 处理QA对生成
          // 这里可以根据输入的内容创建QA对记录
          // 暂时简化处理
          await ctx.prisma.qAPair.create({
            data: {
              question: `基于"${input.title}"生成的问题`,
              answer: input.content,
              projectId: input.projectId,
              rawId: input.rawId,
              tags: input.tags || [],
              difficulty: 'MEDIUM',
              materialType: 'THEORY',
              questionKeywords: [],
              scenarios: [],
              status: 'DRAFT',
              createdBy: ctx.session.user.id,
            }
          });
          break;

        default:
          // 通用处理
          await ctx.prisma.processedStep.create({
            data: {
              rawId: input.rawId,
              station: input.station,
              content: input.content,
              title: input.title,
              tags: input.tags || [],
              processedBy: ctx.session.user.id,
              projectId: input.projectId,
            }
          });
      }

      // 更新原始素材状态
      await ctx.prisma.raw.update({
        where: { id: input.rawId },
        data: {
          conversionStatus: 'CONVERTING', // 标记为正在处理中
        }
      });

      return { success: true, station: input.station, rawId: input.rawId };
    }),

  // 获取处理块
  getChunks: protectedProcedure
    .input(z.object({
      rawId: z.string(),
      station: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = { rawId: input.rawId };
      if (input.station) {
        whereClause.station = input.station;
      }

      return ctx.prisma.processedChunk.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
      });
    }),

  // 合并块
  mergeChunks: protectedProcedure
    .input(z.object({
      chunkIds: z.array(z.string()),
      mergedTitle: z.string(),
      mergedContent: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 获取所有待合并的块
      const chunks = await ctx.prisma.processedChunk.findMany({
        where: { id: { in: input.chunkIds } }
      });

      if (chunks.length === 0) {
        throw new Error('No chunks to merge');
      }

      // 创建合并后的块
      const mergedChunk = await ctx.prisma.processedChunk.create({
        data: {
          rawId: chunks[0].rawId,
          station: chunks[0].station,
          title: input.mergedTitle,
          content: input.mergedContent,
          tags: Array.from(new Set(chunks.flatMap(c => c.tags))),
          processedBy: ctx.session.user.id,
          projectId: chunks[0].projectId,
        }
      });

      // 删除原始块
      await ctx.prisma.processedChunk.deleteMany({
        where: { id: { in: input.chunkIds } }
      });

      return mergedChunk;
    }),

  // 拆分块
  splitChunk: protectedProcedure
    .input(z.object({
      chunkId: z.string(),
      splits: z.array(z.object({
        title: z.string(),
        content: z.string(),
        tags: z.array(z.string()),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const originalChunk = await ctx.prisma.processedChunk.findUnique({
        where: { id: input.chunkId }
      });

      if (!originalChunk) {
        throw new Error('Chunk not found');
      }

      // 创建拆分后的块
      const newChunks = await Promise.all(input.splits.map(split =>
        ctx.prisma.processedChunk.create({
          data: {
            rawId: originalChunk.rawId,
            station: originalChunk.station,
            title: split.title,
            content: split.content,
            tags: split.tags,
            processedBy: ctx.session.user.id,
            projectId: originalChunk.projectId,
          }
        })
      ));

      // 删除原始块
      await ctx.prisma.processedChunk.delete({
        where: { id: input.chunkId }
      });

      return newChunks;
    }),
});