'use client';
import { useState } from 'react';
import { AtomPipelinePanel } from './AtomPipelinePanel';
import { QAPipelinePanel } from './QAPipelinePanel';
import { DualPipelinePanel } from './DualPipelinePanel';
import { QualityCheckPanel } from './QualityCheckPanel';
import { ClassificationBadge } from '@/components/shared/ClassificationBadge';
import { trpc } from '@/lib/trpc';

interface Props {
  rawId: string;
  projectId: string;
  fileName: string;
  experienceSource: string | null;
}

type ProcessingMode = 'ATOM_ONLY' | 'QA_ONLY' | 'DUAL';

const MODE_OPTIONS: Array<{ value: ProcessingMode; label: string; icon: string; desc: string }> = [
  { value: 'ATOM_ONLY', label: '原子化入库', icon: '🧩', desc: 'Markdown → 切块 → 分类 → 入库' },
  { value: 'QA_ONLY', label: 'QA 向量入库', icon: '🔗', desc: 'Markdown → QA生成 → Embedding → Qdrant' },
  { value: 'DUAL', label: '全量加工', icon: '🚀', desc: '原子化 + QA 双管线并行' },
];

export function WorkbenchDrawerContent({ rawId, projectId, fileName, experienceSource }: Props) {
  const [selectedMode, setSelectedMode] = useState<ProcessingMode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'preview' | 'results' | 'quality'>('process');

  const { data: rawDetail } = trpc.raw.getById.useQuery(
    { id: rawId },
    { enabled: !!rawId }
  );

  const processWithMode = trpc.pipeline.processWithMode.useMutation({
    onSuccess: () => setIsRunning(false),
    onError: () => setIsRunning(false),
  });

  const handleStart = (mode: ProcessingMode) => {
    setSelectedMode(mode);
    setIsRunning(true);
    processWithMode.mutate({ rawId, projectId, mode });
  };

  const { data: progress } = trpc.pipeline.getProgress.useQuery(
    { rawId },
    { refetchInterval: isRunning ? 1500 : false }
  );

  // ── 状态计算：按 mode 分别判断 ──
  const mode = selectedMode || progress?.processingMode;
  const atomStatus = progress?.atomPipelineStatus;
  const qaStatus = progress?.qaPipelineStatus;

  const atomStarted = !!atomStatus && atomStatus !== 'idle';
  const qaStarted = !!qaStatus && qaStatus !== 'idle';
  const atomDone = atomStatus === 'done';
  const qaDone = qaStatus === 'done';
  const atomFailed = atomStatus === 'failed';
  const qaFailed = qaStatus === 'failed';
  const atomTerminal = atomDone || atomFailed;
  const qaTerminal = qaDone || qaFailed;

  const hasPipelineRun =
    mode === 'ATOM_ONLY'  ? !!atomStatus
    : mode === 'QA_ONLY'  ? !!qaStatus
    : mode === 'DUAL'     ? (!!atomStatus || !!qaStatus)
    : (!!atomStatus || !!qaStatus);

  const pipelineDone =
    mode === 'ATOM_ONLY'  ? atomDone
    : mode === 'QA_ONLY'  ? qaDone
    : mode === 'DUAL'     ? (atomDone && qaDone)
    : (atomDone || qaDone);

  const pipelinePartialDone =
    mode === 'DUAL' &&
    ((atomDone && qaFailed) || (atomFailed && qaDone));

  const pipelineFailed =
    mode === 'ATOM_ONLY'  ? atomFailed
    : mode === 'QA_ONLY'  ? qaFailed
    : mode === 'DUAL'     ? (atomFailed && qaFailed)
    : (atomFailed || qaFailed);

  const pipelineTerminal =
    mode === 'ATOM_ONLY'  ? atomTerminal
    : mode === 'QA_ONLY'  ? qaTerminal
    : mode === 'DUAL'     ? (atomTerminal && qaTerminal)
    : (atomTerminal || qaTerminal);

  const detail = rawDetail as { wordCount?: number | null; markdownContent?: string | null } | undefined;

  return (
    <div className="h-full flex flex-col">
      {/* Tab 切换 */}
      <div className="flex border-b px-6 shrink-0">
        {[
          { key: 'process', label: '⚙️ 加工' },
          { key: 'preview', label: '📄 Markdown' },
          { key: 'results', label: '📊 结果' },
          { key: 'quality', label: '🔍 质量检查' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Tab: 加工 ── */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            {/* 文件信息 */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="font-medium text-sm">{fileName}</span>
              </div>
              <ClassificationBadge experienceSource={experienceSource} />
              {detail?.wordCount && (
                <span className="text-xs text-gray-400">📏 {detail.wordCount} 字</span>
              )}
            </div>

            {/* 模式选择（未开始时显示） */}
            {!hasPipelineRun && !isRunning && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">选择加工模式</div>
                <div className="grid grid-cols-1 gap-3">
                  {MODE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleStart(opt.value)}
                      className="flex items-start gap-3 p-4 border-2 rounded-xl text-left hover:border-blue-300 hover:bg-blue-50/50 transition"
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <div className="font-medium text-sm">{opt.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pipeline 面板（运行中或已完成时显示） */}
            {(hasPipelineRun || isRunning) && (
              <div className="space-y-4">
                {(selectedMode === 'ATOM_ONLY' || progress?.processingMode === 'ATOM_ONLY') && (
                  <AtomPipelinePanel rawId={rawId} isRunning={isRunning} />
                )}
                {(selectedMode === 'QA_ONLY' || progress?.processingMode === 'QA_ONLY') && (
                  <QAPipelinePanel rawId={rawId} isRunning={isRunning} />
                )}
                {(selectedMode === 'DUAL' || progress?.processingMode === 'DUAL') && (
                  <DualPipelinePanel rawId={rawId} isRunning={isRunning} />
                )}

                {/* 完成后显示重新加工按钮 */}
                {pipelineTerminal && !isRunning && (
                  <button
                    onClick={() => {
                      setSelectedMode(null);
                    }}
                    className="w-full py-2 text-xs text-gray-500 hover:text-blue-600 transition"
                  >
                    🔄 重新选择加工模式
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Markdown 预览 ── */}
        {activeTab === 'preview' && (
          <div className="prose prose-sm max-w-none">
            {detail?.markdownContent ? (
              <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-4 rounded-xl overflow-auto max-h-[70vh]">
                {detail.markdownContent}
              </pre>
            ) : (
              <div className="text-center text-gray-400 py-12">暂无 Markdown 内容</div>
            )}
          </div>
        )}

        {/* ── Tab: 加工结果 ── */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {!hasPipelineRun && (
              <div className="text-center text-gray-400 py-12">
                请先在「加工」Tab 中启动加工流程
              </div>
            )}

            {hasPipelineRun && !pipelineTerminal && (
              <div className="text-center text-gray-400 py-12">
                ⏳ 加工进行中，请稍后查看结果
              </div>
            )}

            {pipelineDone && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-700">{progress?.atomCount ?? 0}</div>
                    <div className="text-xs text-green-600 mt-1">🧱 原子块</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-700">{progress?.qaCount ?? 0}</div>
                    <div className="text-xs text-purple-600 mt-1">❓ QA 对</div>
                  </div>
                </div>
                <div className="text-xs text-green-600 text-center font-medium">
                  ✅ 加工全部完成
                </div>
                <div className="text-xs text-gray-400 text-center">
                  详细原子块和 QA 列表请前往「分类体系」或「QA 库」页面查看
                </div>
              </>
            )}

            {pipelinePartialDone && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-xl text-center ${atomDone ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="text-2xl font-bold text-green-700">{progress?.atomCount ?? 0}</div>
                    <div className="text-xs mt-1">{atomDone ? '🧱 原子块 ✅' : '🧱 原子块 ❌'}</div>
                  </div>
                  <div className={`p-4 rounded-xl text-center ${qaDone ? 'bg-purple-50' : 'bg-red-50'}`}>
                    <div className="text-2xl font-bold text-purple-700">{progress?.qaCount ?? 0}</div>
                    <div className="text-xs mt-1">{qaDone ? '❓ QA 对 ✅' : '❓ QA 对 ❌'}</div>
                  </div>
                </div>
                <div className="text-xs text-amber-600 text-center font-medium">
                  ⚠️ 部分完成：一条管线成功，另一条失败。请查看加工 Tab 中的管线状态
                </div>
              </>
            )}

            {pipelineFailed && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-red-700">{progress?.atomCount ?? 0}</div>
                    <div className="text-xs text-red-600 mt-1">🧱 原子块 ❌</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-red-700">{progress?.qaCount ?? 0}</div>
                    <div className="text-xs text-red-600 mt-1">❓ QA 对 ❌</div>
                  </div>
                </div>
                <div className="text-xs text-red-600 text-center font-medium">
                  ❌ 加工失败：请查看加工 Tab 中的错误状态后重新加工
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab: 质量检查 ── */}
        {activeTab === 'quality' && (
          pipelineDone || pipelinePartialDone ? (
            <QualityCheckPanel rawId={rawId} />
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">
              请先完成至少一条加工管线，再进行质量检查
            </div>
          )
        )}
      </div>
    </div>
  );
}
