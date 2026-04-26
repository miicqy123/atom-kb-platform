'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';
import { RawFileCard } from '@/components/workbench/RawFileCard';
import { WorkbenchDrawer } from '@/components/workbench/WorkbenchDrawer';
import { WorkbenchDrawerContent } from '@/components/workbench/WorkbenchDrawerContent';

type StatusFilter =
  | ''
  | 'PENDING'
  | 'UPLOADED'
  | 'CONVERTED'
  | 'ATOM_PROCESSING'
  | 'QA_PROCESSING'
  | 'DUAL_PROCESSING'
  | 'ATOM_DONE'
  | 'QA_DONE'
  | 'DUAL_DONE'
  | 'FAILED';

type SourceFilter = '' | 'E1_COMPANY' | 'E2_INDUSTRY' | 'E3_BOOK';
type CategoryFilter = '' | 'CAT_WHO' | 'CAT_WHAT' | 'CAT_HOW' | 'CAT_STYLE' | 'CAT_FENCE' | 'CAT_PROOF';
type SubCategoryFilter = string;

const CATEGORY_LABELS: Record<string, { text: string; icon: string }> = {
  CAT_WHO: { text: '身份与受众', icon: '👤' },
  CAT_WHAT: { text: '产品与卖点', icon: '📦' },
  CAT_HOW: { text: '方法与流程', icon: '⚙️' },
  CAT_STYLE: { text: '风格与表达', icon: '🎨' },
  CAT_FENCE: { text: '红线与合规', icon: '🚫' },
  CAT_PROOF: { text: '证据与案例', icon: '📊' },
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  WHO_BRAND: '品牌定位', WHO_ROLE: '角色人格', WHO_AUDIENCE: '受众画像', WHO_TERM: '术语规范',
  WHAT_PRODUCT: '产品信息', WHAT_USP: '差异卖点', WHAT_PRICE: '价格体系', WHAT_CERT: '权威背书',
  HOW_SOP: '标准流程', HOW_METHOD: '方法论', HOW_TACTIC: '技巧策略', HOW_BEST: '最佳实践',
  STYLE_HOOK: '钩子库', STYLE_WORD: '词库', STYLE_TONE: '语言风格', STYLE_RHYTHM: '结构节奏',
  FENCE_BAN: '禁用清单', FENCE_ALLOW: '白名单', FENCE_LAW: '法规合规', FENCE_BLUR: '模糊处理',
  PROOF_CASE: '成功案例', PROOF_DATA: '数据报告', PROOF_FAIL: '反面教训', PROOF_COMPARE: '对比分析',
};

const SUBCATEGORY_MAP: Record<string, string[]> = {
  CAT_WHO: ['WHO_BRAND', 'WHO_ROLE', 'WHO_AUDIENCE', 'WHO_TERM'],
  CAT_WHAT: ['WHAT_PRODUCT', 'WHAT_USP', 'WHAT_PRICE', 'WHAT_CERT'],
  CAT_HOW: ['HOW_SOP', 'HOW_METHOD', 'HOW_TACTIC', 'HOW_BEST'],
  CAT_STYLE: ['STYLE_HOOK', 'STYLE_WORD', 'STYLE_TONE', 'STYLE_RHYTHM'],
  CAT_FENCE: ['FENCE_BAN', 'FENCE_ALLOW', 'FENCE_LAW', 'FENCE_BLUR'],
  CAT_PROOF: ['PROOF_CASE', 'PROOF_DATA', 'PROOF_FAIL', 'PROOF_COMPARE'],
};

interface RawListItem {
  id: string;
  title?: string | null;
  originalFileName?: string | null;
  originalFileUrl?: string | null;
  format: string;
  materialType: string;
  experienceSource?: string | null;
  exposureLevel?: string | null;
  conversionStatus: string;
  processingMode?: string | null;
  atomPipelineStatus?: string | null;
  qaPipelineStatus?: string | null;
  atomCount?: number | null;
  qaCount?: number | null;
  wordCount?: number | null;
  markdownContent?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待处理' },
  { value: 'UPLOADED', label: '已上传' },
  { value: 'CONVERTED', label: '已转换' },
  { value: 'ATOM_PROCESSING', label: '原子化中' },
  { value: 'QA_PROCESSING', label: 'QA 生成中' },
  { value: 'DUAL_PROCESSING', label: '全量加工中' },
  { value: 'ATOM_DONE', label: '原子完成' },
  { value: 'QA_DONE', label: 'QA 完成' },
  { value: 'DUAL_DONE', label: '全量完成' },
  { value: 'FAILED', label: '失败' },
];

const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: '', label: '全部来源' },
  { value: 'E1_COMPANY', label: '企业经验' },
  { value: 'E2_INDUSTRY', label: '行业经验' },
  { value: 'E3_BOOK', label: '书本经验' },
];

const PROCESSING_STATUSES = new Set([
  'ATOM_PROCESSING',
  'QA_PROCESSING',
  'DUAL_PROCESSING',
]);

const DONE_STATUSES = new Set([
  'ATOM_DONE',
  'QA_DONE',
  'DUAL_DONE',
]);

export default function WorkbenchPage() {
  const { currentProject } = useProjectStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('');
  const [subCategoryFilter, setSubCategoryFilter] = useState<SubCategoryFilter>('');
  const [selectedRawId, setSelectedRawId] = useState<string | null>(null);

  const projectId = currentProject?.id ?? '';

  const { data, isLoading } = trpc.raw.list.useQuery(
    {
      projectId,
      search: search || undefined,
      conversionStatus: statusFilter || undefined,
      experienceSource: sourceFilter || undefined,
      contentCategory: categoryFilter || undefined,
      contentSubCategory: subCategoryFilter || undefined,
      page: 1,
      pageSize: 100,
    },
    {
      enabled: !!projectId,
      refetchInterval: 5000,
    }
  );

  const rawItems: RawListItem[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items as RawListItem[];
  }, [data]);

  const selectedRaw = rawItems.find((raw) => raw.id === selectedRawId) ?? null;

  const total = data?.total ?? rawItems.length;
  const processingCount = rawItems.filter((raw) =>
    PROCESSING_STATUSES.has(raw.conversionStatus)
  ).length;
  const doneCount = rawItems.filter((raw) =>
    DONE_STATUSES.has(raw.conversionStatus)
  ).length;
  const convertedCount = rawItems.filter(
    (raw) => raw.conversionStatus === 'CONVERTED'
  ).length;

  return (
    <div className="p-6 space-y-5">
      {/* ── 顶部 Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            知识加工工作台
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            读取 RAW 素材库中的已有素材，点击卡片后进入加工抽屉，选择原子化入库、QA 向量入库或全量加工。
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>当前项目：{currentProject?.name ?? '未选择项目'}</span>
            <span>素材总数：{total}</span>
            <span>加工中：{processingCount}</span>
            <span>已完成：{doneCount}</span>
            <span>已转换待加工：{convertedCount}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Link
            href="/knowledge/raw"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
          >
            前往 RAW 素材管理
          </Link>
          <p className="max-w-[220px] text-right text-xs text-gray-400">
            素材上传、转换、编辑和删除请在 RAW 素材管理中完成。
          </p>
        </div>
      </div>

      {/* 未选择 Project */}
      {!currentProject && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          请先在顶部选择一个 Project，再进入知识加工工作台。
        </div>
      )}

      {/* ── 筛选栏 ── */}
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm md:flex-row md:items-center">
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索素材名称..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value as CategoryFilter); setSubCategoryFilter(''); }}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">全部内容类别</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.text}</option>
          ))}
        </select>

        <select
          value={subCategoryFilter}
          onChange={(e) => setSubCategoryFilter(e.target.value as SubCategoryFilter)}
          disabled={!categoryFilter}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">全部子类别</option>
          {categoryFilter && (SUBCATEGORY_MAP[categoryFilter] || []).map((sc) => (
            <option key={sc} value={sc}>{SUBCATEGORY_LABELS[sc] || sc}</option>
          ))}
        </select>
      </div>

      {/* ── 文件卡片网格 ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-xl border bg-gray-50"
            />
          ))}
        </div>
      ) : rawItems.length === 0 ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed bg-white">
          <div className="max-w-md text-center">
            <div className="mb-3 text-4xl">📭</div>
            <h2 className="text-base font-semibold text-gray-900">
              暂无可加工素材
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              工作台只加工已有 RAW 素材。请先到 RAW 素材管理中上传、转换或创建素材。
            </p>
            <Link
              href="/knowledge/raw"
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              前往 RAW 素材管理
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rawItems.map((raw) => (
            <RawFileCard
              key={raw.id}
              raw={raw as any}
              isSelected={raw.id === selectedRawId}
              onClick={() => setSelectedRawId(raw.id)}
            />
          ))}
        </div>
      )}

      {/* ── 侧滑抽屉 ── */}
      <WorkbenchDrawer
        isOpen={!!selectedRawId}
        onClose={() => setSelectedRawId(null)}
        title={selectedRaw?.originalFileName || selectedRaw?.title || '素材加工'}
      >
        {selectedRaw && selectedRawId && projectId && (
          <WorkbenchDrawerContent
            rawId={selectedRawId}
            projectId={projectId}
            fileName={
              selectedRaw.originalFileName ||
              selectedRaw.title ||
              `素材 ${selectedRaw.id.slice(0, 6)}`
            }
            experienceSource={selectedRaw.experienceSource ?? null}
          />
        )}
      </WorkbenchDrawer>
    </div>
  );
}
