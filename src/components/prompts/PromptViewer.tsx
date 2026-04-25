'use client';

import { Badge } from '@/components/ui/Badge';

const SLOT_LABELS: Record<string, string> = {
  S0: '系统角色',
  S1: '品牌人格',
  S2: '任务目标',
  S3: '输入要求',
  S4: '红线约束',
  S5: '方法论',
  S6: '受众定义',
  S7: '语言风格',
  S8: '证据引用',
  S9: '输出格式',
  S10: '行业素材',
};

const SLOT_COLORS: Record<string, string> = {
  S0: 'bg-blue-50 border-blue-200',
  S1: 'bg-purple-50 border-purple-200',
  S2: 'bg-green-50 border-green-200',
  S3: 'bg-orange-50 border-orange-200',
  S4: 'bg-red-50 border-red-200',
  S5: 'bg-indigo-50 border-indigo-200',
  S6: 'bg-pink-50 border-pink-200',
  S7: 'bg-teal-50 border-teal-200',
  S8: 'bg-cyan-50 border-cyan-200',
  S9: 'bg-amber-50 border-amber-200',
  S10: 'bg-gray-50 border-gray-200',
};

interface PromptViewerProps {
  fullText: string;
  slots: Record<string, string> | null;
  thinkingModel?: string | null;
}

export function PromptViewer({ fullText, slots, thinkingModel }: PromptViewerProps) {
  if (!slots || Object.keys(slots).length === 0) {
    return (
      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
        {fullText}
      </pre>
    );
  }

  const sortedKeys = Object.keys(slots).sort((a, b) => {
    const numA = parseInt(a.replace('S', ''));
    const numB = parseInt(b.replace('S', ''));
    return numA - numB;
  });

  return (
    <div className="space-y-3">
      {sortedKeys.map((key) => {
        const text = slots[key];
        if (!text) return null;
        return (
          <div
            key={key}
            className={`rounded-lg border p-3 ${SLOT_COLORS[key] || 'bg-gray-50 border-gray-200'}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-gray-400">{key}</span>
              <span className="text-xs font-medium text-gray-700">{SLOT_LABELS[key] || key}</span>
              {key === 'S5' && thinkingModel && (
                <Badge variant="secondary" className="text-[10px]">{thinkingModel}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{text}</p>
          </div>
        );
      })}
    </div>
  );
}
