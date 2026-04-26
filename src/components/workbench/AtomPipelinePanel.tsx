'use client';
import { useEffect, useMemo } from 'react';
import { StepIndicator, StepDef, StepStatus } from './StepIndicator';
import { ClassificationBadge } from '../shared/ClassificationBadge';
import { trpc } from '@/lib/trpc';

interface Props {
  rawId: string;
  isRunning: boolean;
}

const ATOM_STEPS = [
  { key: 'parsing', label: 'Markdown 解析' },
  { key: 'classifying', label: '三级分类打标' },
  { key: 'deduping', label: '校验·去重' },
  { key: 'checking', label: '质量检查' },
  { key: 'saving', label: '入库确认' },
];

function mapStepStatus(stepKey: string, progress: any, pipelineStatus: string | null): StepStatus {
  if (!pipelineStatus || pipelineStatus === 'idle') return 'waiting';
  if (pipelineStatus === 'failed') return 'failed';
  if (pipelineStatus === 'done') return 'done';
  if (!progress) return 'waiting';
  const currentStepName = progress.stepName;
  const stepIndex = ATOM_STEPS.findIndex(s => s.key === stepKey);
  const currentIndex = ATOM_STEPS.findIndex(s => s.key === currentStepName);
  if (stepIndex < currentIndex) return 'done';
  if (stepIndex === currentIndex) return 'running';
  return 'waiting';
}

export function AtomPipelinePanel({ rawId, isRunning }: Props) {
  const { data: progress, refetch } = trpc.pipeline.getProgress.useQuery(
    { rawId },
    { refetchInterval: isRunning ? 1500 : false }
  );

  const steps: StepDef[] = useMemo(() => {
    if (!progress) {
      return ATOM_STEPS.map(s => ({ ...s, status: 'waiting' as StepStatus }));
    }
    const p = progress.atomPipelineProgress as any;
    return ATOM_STEPS.map(s => ({
      ...s,
      status: mapStepStatus(s.key, p, progress.atomPipelineStatus),
      processed: p?.stepName === s.key ? p.processed : undefined,
      total: p?.stepName === s.key ? p.total : undefined,
      summary: mapStepStatus(s.key, p, progress.atomPipelineStatus) === 'done' && s.key === 'saving'
        ? `${progress.atomCount ?? 0} 个原子块`
        : undefined,
    }));
  }, [progress]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🧩</span>
        <span className="font-semibold text-sm">原子化入库管线</span>
        {progress?.atomPipelineStatus === 'done' && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✅ 完成</span>
        )}
        {progress?.atomPipelineStatus === 'failed' && (
          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">❌ 失败</span>
        )}
      </div>

      <StepIndicator steps={steps} />

      {/* 当前步骤详情 */}
      {progress?.atomPipelineProgress && (
        <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-2">
          <div className="font-medium">
            Step {(progress.atomPipelineProgress as any).currentStep}：
            {(progress.atomPipelineProgress as any).stepName}
          </div>
          {(progress.atomPipelineProgress as any).total > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.round(((progress.atomPipelineProgress as any).processed / (progress.atomPipelineProgress as any).total) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
