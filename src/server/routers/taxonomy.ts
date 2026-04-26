import { z } from 'zod';
import { router, withPermission, protectedProcedure } from "../trpc";

// ── 枚举定义（与 Prisma schema 一致）──
const EXPERIENCE_SOURCES = ['E1_COMPANY', 'E2_INDUSTRY', 'E3_BOOK'] as const;

const CATEGORIES = ['CAT_WHO', 'CAT_WHAT', 'CAT_HOW', 'CAT_STYLE', 'CAT_FENCE', 'CAT_PROOF'] as const;

const CATEGORY_SUBCATEGORY_MAP: Record<string, readonly string[]> = {
  CAT_WHO: ['WHO_BRAND', 'WHO_ROLE', 'WHO_AUDIENCE', 'WHO_TERM'],
  CAT_WHAT: ['WHAT_PRODUCT', 'WHAT_USP', 'WHAT_PRICE', 'WHAT_CERT'],
  CAT_HOW: ['HOW_SOP', 'HOW_METHOD', 'HOW_TACTIC', 'HOW_BEST'],
  CAT_STYLE: ['STYLE_HOOK', 'STYLE_WORD', 'STYLE_TONE', 'STYLE_RHYTHM'],
  CAT_FENCE: ['FENCE_BAN', 'FENCE_ALLOW', 'FENCE_LAW', 'FENCE_BLUR'],
  CAT_PROOF: ['PROOF_CASE', 'PROOF_DATA', 'PROOF_FAIL', 'PROOF_COMPARE'],
};

const SUBCATEGORY_SLOTS: Record<string, string[]> = {
  WHO_BRAND: ['S0', 'S1'], WHO_ROLE: ['S1'], WHO_AUDIENCE: ['S0', 'S6'], WHO_TERM: ['S4'],
  WHAT_PRODUCT: ['S10'], WHAT_USP: ['S10', 'S5'], WHAT_PRICE: ['S10'], WHAT_CERT: ['S10', 'S8'],
  HOW_SOP: ['S5'], HOW_METHOD: ['S10', 'S5'], HOW_TACTIC: ['S5'], HOW_BEST: ['S10'],
  STYLE_HOOK: ['S10'], STYLE_WORD: ['S10'], STYLE_TONE: ['S7'], STYLE_RHYTHM: ['S7', 'S10'],
  FENCE_BAN: ['S4'], FENCE_ALLOW: ['S4'], FENCE_LAW: ['S4'], FENCE_BLUR: ['S4'],
  PROOF_CASE: ['S10', 'S8'], PROOF_DATA: ['S10', 'S8'], PROOF_FAIL: ['S8'], PROOF_COMPARE: ['S10'],
};

const CATEGORY_LABELS: Record<string, string> = {
  CAT_WHO: '身份与受众',
  CAT_WHAT: '产品与卖点',
  CAT_HOW: '方法与流程',
  CAT_STYLE: '风格与表达',
  CAT_FENCE: '红线与合规',
  CAT_PROOF: '证据与案例',
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  WHO_BRAND: '品牌定位', WHO_ROLE: '角色人格', WHO_AUDIENCE: '受众画像', WHO_TERM: '术语规范',
  WHAT_PRODUCT: '产品信息', WHAT_USP: '差异卖点', WHAT_PRICE: '价格体系', WHAT_CERT: '权威背书',
  HOW_SOP: '标准流程', HOW_METHOD: '方法论', HOW_TACTIC: '技巧策略', HOW_BEST: '最佳实践',
  STYLE_HOOK: '钩子库', STYLE_WORD: '词库', STYLE_TONE: '语言风格', STYLE_RHYTHM: '结构节奏',
  FENCE_BAN: '禁用清单', FENCE_ALLOW: '白名单', FENCE_LAW: '法规合规', FENCE_BLUR: '模糊处理',
  PROOF_CASE: '成功案例', PROOF_DATA: '数据报告', PROOF_FAIL: '反面教训', PROOF_COMPARE: '对比分析',
};

const SOURCE_LABELS: Record<string, string> = {
  E1_COMPANY: '企业经验',
  E2_INDUSTRY: '行业通识',
  E3_BOOK: '书籍理论',
};

export const taxonomyRouter = router({
  // ── 保留原有的 dimension / scenarioTag CRUD ──
  dimensions: withPermission("knowledge", "read").input(z.object({ tenantId: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.dimensionConfig.findMany({ where: input.tenantId ? { tenantId: input.tenantId as any } : {}, orderBy: { number: "asc" } })),
  scenarioTags: withPermission("knowledge", "read").input(z.object({ type: z.string().optional() })).query(({ ctx, input }) => ctx.prisma.scenarioTag.findMany({ where: input.type ? { type: input.type } : {}, orderBy: { name: "asc" } })),
  createTag: withPermission("knowledge", "write").input(z.object({ type: z.string(), name: z.string() })).mutation(({ ctx, input }) => ctx.prisma.scenarioTag.create({ data: input as any })),
  updateTag: withPermission("knowledge", "write").input(z.object({ id: z.string(), type: z.string().optional(), name: z.string().optional() })).mutation(({ ctx, input }) => ctx.prisma.scenarioTag.update({ where: { id: input.id }, data: input })),
  deleteTag: withPermission("knowledge", "write").input(z.object({ id: z.string() })).mutation(({ ctx, input }) => ctx.prisma.scenarioTag.delete({ where: { id: input.id } })),
  createDimension: withPermission("knowledge", "write").input(z.object({ number: z.number(), name: z.string(), layer: z.enum(['A', 'B', 'C', 'D']), tenantId: z.string() })).mutation(({ ctx, input }) => ctx.prisma.dimensionConfig.create({ data: input as any })),
  updateDimension: withPermission("knowledge", "write").input(z.object({ id: z.string(), number: z.number().optional(), name: z.string().optional(), layer: z.enum(['A', 'B', 'C', 'D']).optional() })).mutation(({ ctx, input }) => ctx.prisma.dimensionConfig.update({ where: { id: input.id }, data: input })),
  deleteDimension: withPermission("knowledge", "write").input(z.object({ id: z.string() })).mutation(({ ctx, input }) => ctx.prisma.dimensionConfig.delete({ where: { id: input.id } })),

  // ── P6.10 新增：三级分类树聚合统计 ──
  getTree: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      const prisma = ctx.prisma;

      // 聚合原子块：按 experienceSource × category × subcategory 分组
      const atomCounts = await prisma.atom.groupBy({
        by: ['experienceSource', 'category', 'subcategory'],
        where: { projectId },
        _count: { _all: true },
      });

      // 聚合 QA 对：按 raw 的 experienceSource 分组
      const qaCounts = await prisma.$queryRaw<
        Array<{ experienceSource: string; count: bigint }>
      >`
        SELECT r."experienceSource", COUNT(q.id)::bigint as count
        FROM "QAPair" q
        JOIN "Raw" r ON q."rawId" = r.id
        WHERE q."projectId" = ${projectId}
        GROUP BY r."experienceSource"
      `;

      const atomMap = new Map<string, number>();
      for (const row of atomCounts) {
        const key = `${row.experienceSource}|${row.category}|${row.subcategory}`;
        atomMap.set(key, row._count._all);
      }

      const qaMap = new Map<string, number>();
      for (const row of qaCounts) {
        qaMap.set(row.experienceSource, Number(row.count));
      }

      const tree = EXPERIENCE_SOURCES.map(source => {
        let sourceAtomTotal = 0;
        const categories = CATEGORIES.map(cat => {
          const subcategories = (CATEGORY_SUBCATEGORY_MAP[cat] || []).map(sub => {
            const atomCount = atomMap.get(`${source}|${cat}|${sub}`) || 0;
            sourceAtomTotal += atomCount;
            return {
              key: sub,
              label: SUBCATEGORY_LABELS[sub] || sub,
              atomCount,
              slots: SUBCATEGORY_SLOTS[sub] || [],
            };
          });
          const catAtomCount = subcategories.reduce((sum, s) => sum + s.atomCount, 0);
          return {
            key: cat,
            label: CATEGORY_LABELS[cat] || cat,
            atomCount: catAtomCount,
            subcategories,
          };
        });
        return {
          key: source,
          label: SOURCE_LABELS[source] || source,
          atomCount: sourceAtomTotal,
          qaCount: qaMap.get(source) || 0,
          categories,
        };
      });

      const totalAtoms = tree.reduce((s, t) => s + t.atomCount, 0);
      const totalQA = tree.reduce((s, t) => s + t.qaCount, 0);

      return { tree, totalAtoms, totalQA };
    }),

  // ── P6.10 新增：按分类筛选原子块详情 ──
  getAtomsByClassification: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      experienceSource: z.string(),
      category: z.string().optional(),
      subcategory: z.string().optional(),
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId, experienceSource, category, subcategory, limit, offset } = input;
      const prisma = ctx.prisma;
      const where: any = { projectId, experienceSource };
      if (category) where.category = category;
      if (subcategory) where.subcategory = subcategory;

      const [atoms, total] = await Promise.all([
        prisma.atom.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            layer: true,
            granularity: true,
            category: true,
            subcategory: true,
            wordCount: true,
            createdAt: true,
          },
        }),
        prisma.atom.count({ where }),
      ]);

      return { atoms, total };
    }),
});