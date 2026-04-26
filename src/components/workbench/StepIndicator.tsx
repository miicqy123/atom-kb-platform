'use client';

export type StepStatus = 'waiting' | 'running' | 'done' | 'failed';

export interface StepDef {
  key: string;
  label: string;
  status: StepStatus;
  processed?: number;
  total?: number;
  summary?: string;
}

interface Props {
  steps: StepDef[];
  className?: string;
}

const STATUS_ICON: Record<StepStatus, string> = {
  waiting: '⏳',
  running: '🔄',
  done: '✅',
  failed: '❌',
};

const STATUS_COLOR: Record<StepStatus, string> = {
  waiting: 'text-gray-400 bg-gray-50 border-gray-200',
  running: 'text-blue-700 bg-blue-50 border-blue-300 ring-2 ring-blue-200',
  done: 'text-green-700 bg-green-50 border-green-300',
  failed: 'text-red-700 bg-red-50 border-red-300',
};

export function StepIndicator({ steps, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto ${className}`}>
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs transition-all min-w-[80px] ${STATUS_COLOR[step.status]}`}>
            <span className="text-base">{STATUS_ICON[step.status]}</span>
            <span className="font-medium mt-0.5">{step.label}</span>
            {step.status === 'running' && step.total != null && step.total > 0 && (
              <span className="text-[10px] mt-0.5">
                {step.processed ?? 0}/{step.total}
              </span>
            )}
            {step.status === 'done' && step.summary && (
              <span className="text-[10px] mt-0.5 text-green-600">{step.summary}</span>
            )}
          </div>
          {i < steps.length - 1 && (
            <span className={`mx-1 text-xs ${
              step.status === 'done' ? 'text-green-400' : 'text-gray-300'
            }`}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}
