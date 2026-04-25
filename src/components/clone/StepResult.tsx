'use client';

interface StepResultProps {
  result: {
    prompt: string;
    slots: Record<string, string>;
    rules: string[];
  } | null;
  loading: boolean;
}

const STEPS = [
  { key: 'S', label: 'Sample 解析', color: 'blue', desc: '分析内容的结构、风格、钩子、论证方式' },
  { key: 'T', label: 'Template 模板', color: 'green', desc: '提炼可复用的结构模板和写作规则' },
  { key: 'E', label: 'Examine 验证', color: 'orange', desc: '验证提炼的规则是否能复现原内容' },
  { key: 'P', label: 'Prompt 生成', color: 'purple', desc: '输出结构化提示词' },
];

const STEP_ICONS: Record<string, string> = { S: '🔍', T: '📐', E: '🧪', P: '📝' };

const BG_COLORS: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  orange: 'bg-orange-50 border-orange-200',
  purple: 'bg-purple-50 border-purple-200',
};

export default function StepResult({ result, loading }: StepResultProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-5 space-y-3">
        {STEPS.map((step) => (
          <div key={step.key} className={`rounded-lg border p-4 ${BG_COLORS[step.color] || 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{STEP_ICONS[step.key]}</span>
              <span className="text-sm font-medium">{step.key} - {step.label}</span>
            </div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="rounded-xl border bg-white p-5 space-y-3">
      {/* S - Sample */}
      <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 mb-1">
          <span>🔍</span>
          <span className="text-sm font-medium">S - Sample 解析</span>
        </div>
        <p className="text-xs text-gray-600">已完成内容解析</p>
      </div>

      {/* T - Template */}
      <div className="rounded-lg border p-4 bg-green-50 border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <span>📐</span>
          <span className="text-sm font-medium">T - Template 模板</span>
        </div>
        <p className="text-xs text-gray-500 mb-1.5">提炼的规则：</p>
        <ul className="space-y-1">
          {result.rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
              <span className="text-gray-400 mt-0.5">·</span>
              <span>{rule}</span>
            </li>
          ))}
          {result.rules.length === 0 && (
            <li className="text-xs text-gray-400 italic">暂无规则</li>
          )}
        </ul>
      </div>

      {/* E - Examine */}
      <div className="rounded-lg border p-4 bg-orange-50 border-orange-200">
        <div className="flex items-center gap-2 mb-1">
          <span>🧪</span>
          <span className="text-sm font-medium">E - Examine 验证</span>
        </div>
        <p className="text-xs text-gray-600">规则数量：{result.rules.length} 条</p>
      </div>

      {/* P - Prompt */}
      <div className="rounded-lg border p-4 bg-purple-50 border-purple-200">
        <div className="flex items-center gap-2 mb-1">
          <span>📝</span>
          <span className="text-sm font-medium">P - Prompt 生成</span>
        </div>
        <p className="text-xs text-gray-600">→ 见下方提示词预览</p>
      </div>
    </div>
  );
}
