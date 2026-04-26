'use client';

export type PipelineStatus = 'idle' | 'running' | 'done' | 'error';

interface Props {
  mode: 'ATOM_ONLY' | 'QA_ONLY' | 'DUAL';
  atomStatus: PipelineStatus;
  qaStatus: PipelineStatus;
  atomCount: number;
  qaCount: number;
  error?: string | null;
}

export function ProcessingProgress({ mode, atomStatus, qaStatus, atomCount, qaCount, error }: Props) {
  const showAtom = mode === 'ATOM_ONLY' || mode === 'DUAL';
  const showQa = mode === 'QA_ONLY' || mode === 'DUAL';

  const modeLabels = {
    ATOM_ONLY: '🧩 原子化入库',
    QA_ONLY: '🔗 QA 向量入库',
    DUAL: '🚀 全量加工',
  };

  const statusIcon = (s: PipelineStatus) => {
    switch (s) {
      case 'idle': return '⏳';
      case 'running': return '🔄';
      case 'done': return '✅';
      case 'error': return '❌';
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">加工进度 — {modeLabels[mode]}</h3>
      </div>

      {showAtom && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span>{statusIcon(atomStatus)}</span>
            <span className="font-medium">管线 A：原子化入库</span>
            <span className="text-gray-400 ml-auto">产出 {atomCount} 个原子块</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                atomStatus === 'done' ? 'bg-blue-500 w-full' :
                atomStatus === 'running' ? 'bg-blue-400 w-1/2 animate-pulse' :
                atomStatus === 'error' ? 'bg-red-400 w-3/4' : 'w-0'
              }`}
            />
          </div>
        </div>
      )}

      {showQa && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span>{statusIcon(qaStatus)}</span>
            <span className="font-medium">管线 B：QA 向量入库</span>
            <span className="text-gray-400 ml-auto">产出 {qaCount} 个 QA 对</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                qaStatus === 'done' ? 'bg-purple-500 w-full' :
                qaStatus === 'running' ? 'bg-purple-400 w-1/2 animate-pulse' :
                qaStatus === 'error' ? 'bg-red-400 w-3/4' : 'w-0'
              }`}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2">
          ❌ 错误：{error}
        </div>
      )}

      {(atomStatus === 'done' || qaStatus === 'done') && !error && (
        <div className="text-xs text-green-600 bg-green-50 rounded-lg p-2">
          ✅ 加工完成！{atomCount > 0 ? `原子块 ${atomCount} 个` : ''}
          {atomCount > 0 && qaCount > 0 ? ' + ' : ''}
          {qaCount > 0 ? `QA 对 ${qaCount} 个` : ''}
        </div>
      )}
    </div>
  );
}
