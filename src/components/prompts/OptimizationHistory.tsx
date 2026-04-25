'use client';

interface OptimizationHistoryProps {
  currentRound: number;
  maxRounds: number;
  score: number | null;
  optimizerUsed: string | null;
  status: string;
}

const OPTIMIZER_LABELS: Record<string, string> = {
  LYRA: 'Lyra 通用优化',
  JOHARI: '乔哈里窗口诊断',
  LQ22PRO: 'LQ-2.2Pro 结构重写',
  SYSTEM_PRO: '系统精修',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  OPTIMIZING: '优化中',
  READY: '已就绪',
  PUBLISHED: '已发布',
};

export function OptimizationHistory({
  currentRound,
  maxRounds,
  score,
  optimizerUsed,
  status,
}: OptimizationHistoryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span>
          状态：
          <span className="font-medium text-gray-700">{STATUS_LABELS[status] || status}</span>
        </span>
        <span>
          当前轮次：
          <span className="font-medium text-gray-700">
            {currentRound}/{maxRounds}
          </span>
        </span>
        {optimizerUsed && (
          <span>
            优化器：
            <span className="font-medium text-gray-700">
              {OPTIMIZER_LABELS[optimizerUsed] || optimizerUsed}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center">
        {Array.from({ length: maxRounds }, (_, i) => {
          const round = i + 1;
          const isCompleted = round < currentRound;
          const isCurrent = round === currentRound;
          const isPending = round > currentRound;

          return (
            <div key={round} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    isCompleted
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : isCurrent
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? '✓' : round}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    isCompleted
                      ? 'text-green-600'
                      : isCurrent
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-400'
                  }`}
                >
                  {isCompleted ? '已完成' : isCurrent ? '进行中...' : '待执行'}
                </span>
              </div>
              {i < maxRounds - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-300' : isCurrent ? 'bg-blue-200' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {score !== null && currentRound > 0 && (
        <div className="text-xs text-gray-500">
          当前评分：
          <span className="font-bold text-gray-700">
            {score.toFixed(2)} / 5.0
          </span>
        </div>
      )}
    </div>
  );
}
