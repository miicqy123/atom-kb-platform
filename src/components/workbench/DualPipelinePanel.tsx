'use client';
import { AtomPipelinePanel } from './AtomPipelinePanel';
import { QAPipelinePanel } from './QAPipelinePanel';
import { trpc } from '@/lib/trpc';

interface Props {
  rawId: string;
  isRunning: boolean;
}

export function DualPipelinePanel({ rawId, isRunning }: Props) {
  const { data: progress } = trpc.pipeline.getProgress.useQuery(
    { rawId },
    { refetchInterval: isRunning ? 1500 : false }
  );

  const atomDone = progress?.atomPipelineStatus === 'done';
  const qaDone = progress?.qaPipelineStatus === 'done';
  const atomFailed = progress?.atomPipelineStatus === 'failed';
  const qaFailed = progress?.qaPipelineStatus === 'failed';
  const allDone = atomDone && qaDone;

  // 计算总进度百分比
  const atomP = progress?.atomPipelineProgress as any;
  const qaP = progress?.qaPipelineProgress as any;
  const atomPct = atomDone ? 100 : atomFailed ? 0 : (atomP?.total ? Math.round((atomP.processed / atomP.total) * 100) : 0);
  const qaPct = qaDone ? 100 : qaFailed ? 0 : (qaP?.total ? Math.round((qaP.processed / qaP.total) * 100) : 0);
  const totalPct = Math.round((atomPct + qaPct) / 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <span className="font-semibold text-sm">全量加工 · 双管线并行</span>
        </div>
        <span className="text-xs text-gray-500">总进度 {totalPct}%</span>
      </div>

      {/* 总进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${totalPct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 border rounded-xl">
          <AtomPipelinePanel rawId={rawId} isRunning={isRunning && !atomDone && !atomFailed} />
        </div>
        <div className="p-4 border rounded-xl">
          <QAPipelinePanel rawId={rawId} isRunning={isRunning && !qaDone && !qaFailed} />
        </div>
      </div>

      {allDone && (
        <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700 text-center">
          ✅ 全量加工完成！原子块 {progress?.atomCount ?? 0} 个 + QA 对 {progress?.qaCount ?? 0} 个
        </div>
      )}
    </div>
  );
}
