'use client';
import { useMemo } from 'react';
import { StepIndicator, StepDef, StepStatus } from './StepIndicator';
import { trpc } from '@/lib/trpc';

interface Props {
  rawId: string;
  isRunning: boolean;
}

const QA_STEPS = [
  { key: 'parsing', label: 'Markdown 解析' },
  { key: 'generating', label: 'LLM QA 生成' },
  { key: 'embedding', label: 'Qwen 向量化' },
  { key: 'saving', label: '向量存储入库' },
];

function mapStepStatus(stepKey: string, progress: any, pipelineStatus: string | null): StepStatus {
  if (!pipelineStatus || pipelineStatus === 'idle') return 'waiting';
  if (pipelineStatus === 'failed') return 'failed';
  if (pipelineStatus === 'done') return 'done';
  if (!progress) return 'waiting';
  const currentStepName = progress.stepName;
  const stepIndex = QA_STEPS.findIndex(s => s.key === stepKey);
  const currentIndex = QA_STEPS.findIndex(s => s.key === currentStepName);
  if (stepIndex < currentIndex) return 'done';
  if (stepIndex === currentIndex) return 'running';
  return 'waiting';
}

export function QAPipelinePanel({ rawId, isRunning }: Props) {
  const { data: progress } = trpc.pipeline.getProgress.useQuery(
    { rawId },
    { refetchInterval: isRunning ? 1500 : false }
  );

  const steps: StepDef[] = useMemo(() => {
    if (!progress) {
      return QA_STEPS.map(s => ({ ...s, status: 'waiting' as StepStatus }));
    }
    const p = progress.qaPipelineProgress as any;
    return QA_STEPS.map(s => ({
      ...s,
      status: mapStepStatus(s.key, p, progress.qaPipelineStatus),
      processed: p?.stepName === s.key ? p.processed : undefined,
      total: p?.stepName === s.key ? p.total : undefined,
      summary: mapStepStatus(s.key, p, progress.qaPipelineStatus) === 'done' && s.key === 'saving'
        ? `${progress.qaCount ?? 0} 个 QA 对`
        : undefined,
    }));
  }, [progress]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔗</span>
        <span className="font-semibold text-sm">QA 向量入库管线</span>
        {progress?.qaPipelineStatus === 'done' && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✅ 完成</span>
        )}
        {progress?.qaPipelineStatus === 'failed' && (
          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">❌ 失败</span>
        )}
      </div>

      <StepIndicator steps={steps} />

      {progress?.qaPipelineProgress && (
        <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-2">
          <div className="font-medium">
            Step {(progress.qaPipelineProgress as any).currentStep}：
            {(progress.qaPipelineProgress as any).stepName}
          </div>
          {(progress.qaPipelineProgress as any).total > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.round(((progress.qaPipelineProgress as any).processed / (progress.qaPipelineProgress as any).total) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
