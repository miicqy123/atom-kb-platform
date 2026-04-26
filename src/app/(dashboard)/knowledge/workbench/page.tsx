'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Split,
  Workflow,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';
import { AtomPipelinePanel } from '@/components/workbench/AtomPipelinePanel';
import { QAPipelinePanel } from '@/components/workbench/QAPipelinePanel';
import { DualPipelinePanel } from '@/components/workbench/DualPipelinePanel';

type ProcessingMode = 'ATOM_ONLY' | 'QA_ONLY' | 'DUAL';

interface RawItem {
  id: string;
  title?: string | null;
  originalFileName?: string | null;
  format: string;
  materialType: string;
  experienceSource: string;
  exposureLevel?: string | null;
  conversionStatus: string;
  processingMode?: string | null;
  atomPipelineStatus?: string | null;
  qaPipelineStatus?: string | null;
  atomCount?: number | null;
  qaCount?: number | null;
  markdownContent?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const MODE_OPTIONS: Array<{
  value: ProcessingMode;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
}> = [
  {
    value: 'ATOM_ONLY',
    title: '原子化加工',
    subtitle: 'Atom 入库',
    description: 'Markdown → 智能切块 → 三级分类 → 去重校验 → 原子块入库',
    icon: '🧩',
    accent: 'border-blue-200 bg-blue-50 hover:border-blue-400',
  },
  {
    value: 'QA_ONLY',
    title: 'QA 向量库加工',
    subtitle: 'QA + Embedding',
    description: 'Markdown → 段落分组 → QA 生成 → Embedding → Qdrant 向量入库',
    icon: '🔗',
    accent: 'border-purple-200 bg-purple-50 hover:border-purple-400',
  },
  {
    value: 'DUAL',
    title: '全量加工',
    subtitle: '双管线并行',
    description: '原子化入库与 QA 向量入库同时执行，适合完整知识资产构建',
    icon: '🚀',
    accent: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400',
  },
];

const SOURCE_LABELS: Record<string, string> = {
  E1_COMPANY: '企业经验',
  E2_INDUSTRY: '行业经验',
  E3_BOOK: '书本经验',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待处理',
  UPLOADED: '已上传',
  CONVERTING: '转换中',
  CONVERTED: '已转换',
  FAILED: '失败',
  ATOM_PROCESSING: '原子化中',
  QA_PROCESSING: 'QA 生成中',
  DUAL_PROCESSING: '全量加工中',
  ATOM_DONE: '原子完成',
  QA_DONE: 'QA 完成',
  DUAL_DONE: '全量完成',
};

function getRawTitle(raw: RawItem) {
  return raw.originalFileName || raw.title || `素材 ${raw.id.slice(0, 6)}`;
}

function getModeTitle(mode: ProcessingMode | null) {
  if (!mode) return '';
  return MODE_OPTIONS.find((item) => item.value === mode)?.title ?? mode;
}

export default function WorkbenchPage() {
  const searchParams = useSearchParams();
  const { currentProject } = useProjectStore();
  const [selectedMode, setSelectedMode] = useState<ProcessingMode | null>(null);
  const [runningRawIds, setRunningRawIds] = useState<Set<string>>(new Set());
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const rawIds = useMemo(() => {
    const rawIdsParam =
      searchParams.get('rawIds') || searchParams.get('rawId') || '';
    return Array.from(new Set(
      rawIdsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    ));
  }, [searchParams]);

  const projectId = currentProject?.id ?? '';

  const {
    data: rawData,
    isLoading,
    refetch,
  } = trpc.raw.getByIds.useQuery(
    { ids: rawIds },
    {
      enabled: rawIds.length > 0,
      refetchInterval: isBatchRunning ? 5000 : false,
    }
  );

  const processWithMode = trpc.pipeline.processWithMode.useMutation();

  const raws: RawItem[] = useMemo(() => {
    const list = ((rawData ?? []) as RawItem[]).filter(Boolean);
    const map = new Map<string, RawItem>(list.map((raw) => [raw.id, raw]));
    return rawIds.map((id) => map.get(id)).filter(Boolean) as RawItem[];
  }, [rawData, rawIds]);

  const rawTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const raw of raws) {
      map.set(raw.id, getRawTitle(raw));
    }
    return map;
  }, [raws]);

  const handleStart = async (mode: ProcessingMode) => {
    if (!projectId || rawIds.length === 0) return;
    setSelectedMode(mode);
    setBatchError(null);
    setIsBatchRunning(true);
    setRunningRawIds(new Set(rawIds));

    try {
      const results = await Promise.allSettled(
        rawIds.map((rawId) =>
          processWithMode.mutateAsync({
            rawId,
            projectId,
            mode,
          })
        )
      );

      const rejectedCount = results.filter(
        (result) => result.status === 'rejected'
      ).length;
      if (rejectedCount > 0) {
        const msg = `${rejectedCount} 条素材启动或加工失败，请查看下方流程状态`;
        setBatchError(msg);
        console.error(`[Workbench] ${rejectedCount} raw(s) failed`, results);
      }
    } finally {
      await refetch();
      setIsBatchRunning(false);
      setRunningRawIds(new Set());
    }
  };

  // ── 无 rawIds：引导页 ──
  if (rawIds.length === 0) {
    return (
      <div className="p-6">
        <div className="mx-auto mt-24 max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-4xl">📥</div>
          <h1 className="text-lg font-semibold text-gray-900">
            请先选择 RAW 素材
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            知识加工工作台用于加工已选择的 RAW 素材。请先到 RAW
            素材管理中选择一个或多个素材进入工作台。
          </p>
          <Link
            href="/knowledge/raw"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            前往 RAW 素材管理
          </Link>
        </div>
      </div>
    );
  }

  // ── 未选择 Project ──
  if (!currentProject) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          请先在顶部选择一个 Project，再进入知识加工工作台。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
            <Link
              href="/knowledge/raw"
              className="inline-flex items-center gap-1 hover:text-blue-600"
            >
              <ArrowLeft size={14} />
              返回 RAW 素材管理
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            知识加工工作台
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            对已选择的 RAW 素材进行原子化加工、QA 向量库加工或全量加工。
          </p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-right shadow-sm">
          <div className="text-xs text-gray-400">当前项目</div>
          <div className="mt-1 text-sm font-medium text-gray-900">
            {currentProject.name}
          </div>
        </div>
      </div>

      {/* ── 已选择素材 ── */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              已选择 RAW 素材：{rawIds.length} 条
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              这些素材将作为本次加工任务的输入。你可以返回 RAW 素材管理重新选择。
            </p>
          </div>
          <Link
            href="/knowledge/raw"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            重新选择
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            正在加载已选择素材...
          </div>
        ) : raws.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-gray-50 p-8 text-center text-sm text-gray-400">
            未找到对应素材。请返回 RAW 素材管理重新选择。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {raws.map((raw) => (
              <div
                key={raw.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-lg">📄</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {getRawTitle(raw)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-gray-500">
                      <span>{raw.format}</span>
                      <span>{SOURCE_LABELS[raw.experienceSource] ?? raw.experienceSource}</span>
                      <span>{STATUS_LABELS[raw.conversionStatus] ?? raw.conversionStatus}</span>
                    </div>
                    <div className="mt-2 flex gap-3 text-[11px] text-gray-400">
                      <span>Atom {raw.atomCount ?? 0}</span>
                      <span>QA {raw.qaCount ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 加工模式 ── */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">选择加工模式</h2>
          <p className="mt-1 text-xs text-gray-500">
            选择一个模式后，系统会对当前已选择的所有素材执行对应加工流程。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {MODE_OPTIONS.map((mode) => {
            const active = selectedMode === mode.value;
            const disabled = isBatchRunning;

            return (
              <button
                key={mode.value}
                disabled={disabled}
                onClick={() => handleStart(mode.value)}
                className={`rounded-2xl border-2 p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : mode.accent
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl">{mode.icon}</span>
                  {active && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                      <CheckCircle2 size={14} />
                      当前选择
                    </span>
                  )}
                </div>
                <div className="text-base font-semibold text-gray-900">
                  {mode.title}
                </div>
                <div className="mt-1 text-xs font-medium text-gray-500">
                  {mode.subtitle}
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-600">
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 加工流程 ── */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">加工流程</h2>
            <p className="mt-1 text-xs text-gray-500">
              {selectedMode
                ? `当前模式：${getModeTitle(selectedMode)}`
                : '请选择上方加工模式，启动后将在这里展示每条素材的执行流程。'}
            </p>
          </div>
          {isBatchRunning && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
              <Loader2 size={12} className="animate-spin" />
              正在启动 / 加工中
            </span>
          )}
        </div>

        {batchError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {batchError}
          </div>
        )}

        {!selectedMode ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed bg-gray-50">
            <div className="text-center">
              <Workflow className="mx-auto mb-3 text-gray-300" size={32} />
              <div className="text-sm font-medium text-gray-700">
                等待选择加工模式
              </div>
              <p className="mt-1 text-xs text-gray-400">
                选择原子化、QA 向量库或全量加工后，将在此处展示执行流程。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {rawIds.map((rawId) => {
              const isRunning = isBatchRunning || runningRawIds.has(rawId);
              const title =
                rawTitleMap.get(rawId) || `素材 ${rawId.slice(0, 6)}`;

              return (
                <div
                  key={rawId}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {title}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        Raw ID：{rawId}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] ${
                        isRunning
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isRunning ? '运行中' : '等待 / 已结束'}
                    </span>
                  </div>

                  {selectedMode === 'ATOM_ONLY' && (
                    <AtomPipelinePanel rawId={rawId} isRunning={isRunning} />
                  )}
                  {selectedMode === 'QA_ONLY' && (
                    <QAPipelinePanel rawId={rawId} isRunning={isRunning} />
                  )}
                  {selectedMode === 'DUAL' && (
                    <DualPipelinePanel rawId={rawId} isRunning={isRunning} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 结果入口 ── */}
      {selectedMode && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              加工结果与后续操作
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              加工完成后，可以前往原子块浏览器、QA 数据集或分类体系查看入库结果。
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Link
              href="/knowledge/atoms"
              className="rounded-xl border bg-gray-50 p-4 hover:border-blue-300 hover:bg-blue-50"
            >
              <PackageCheck className="mb-2 text-blue-600" size={22} />
              <div className="text-sm font-medium text-gray-900">
                查看原子块
              </div>
              <p className="mt-1 text-xs text-gray-500">
                查看本次生成的 Atom 原子块。
              </p>
            </Link>
            <Link
              href="/knowledge/qa-pairs"
              className="rounded-xl border bg-gray-50 p-4 hover:border-purple-300 hover:bg-purple-50"
            >
              <Split className="mb-2 text-purple-600" size={22} />
              <div className="text-sm font-medium text-gray-900">
                查看 QA 数据集
              </div>
              <p className="mt-1 text-xs text-gray-500">
                查看生成的问答对和向量入库结果。
              </p>
            </Link>
            <Link
              href="/knowledge/taxonomy"
              className="rounded-xl border bg-gray-50 p-4 hover:border-emerald-300 hover:bg-emerald-50"
            >
              <PackageCheck className="mb-2 text-emerald-600" size={22} />
              <div className="text-sm font-medium text-gray-900">
                查看分类体系
              </div>
              <p className="mt-1 text-xs text-gray-500">
                按三级分类查看沉淀的知识资产。
              </p>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
