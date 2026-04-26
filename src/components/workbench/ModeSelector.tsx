'use client';
export type ProcessingMode = 'ATOM_ONLY' | 'QA_ONLY' | 'DUAL';

const MODES: Array<{
  key: ProcessingMode;
  icon: string;
  title: string;
  description: string;
  usage: string;
  borderColor: string;
  hoverBg: string;
}> = [
  {
    key: 'ATOM_ONLY',
    icon: '🧩',
    title: '原子化入库',
    description: 'LLM 结构化提取 → 分类打标 → 校验去重 → 写入结构化知识库',
    usage: '拼装 Prompt 蓝图',
    borderColor: 'border-blue-500',
    hoverBg: 'hover:bg-blue-50',
  },
  {
    key: 'QA_ONLY',
    icon: '🔗',
    title: 'QA 向量入库',
    description: 'LLM 生成 QA 对 → 写入 QAPair 表',
    usage: 'RAG 智能体检索',
    borderColor: 'border-purple-500',
    hoverBg: 'hover:bg-purple-50',
  },
  {
    key: 'DUAL',
    icon: '🚀',
    title: '全量加工',
    description: '两条管线并行执行，原子化 + QA 同时入库',
    usage: '完整知识沉淀',
    borderColor: 'border-green-500',
    hoverBg: 'hover:bg-green-50',
  },
];

export function ModeSelector({
  onSelect,
  disabled,
  selected,
}: {
  onSelect: (mode: ProcessingMode) => void;
  disabled?: boolean;
  selected?: ProcessingMode | null;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">选择加工模式</h3>
      <div className="grid grid-cols-3 gap-4">
        {MODES.map((mode) => (
          <div
            key={mode.key}
            className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
              selected === mode.key
                ? `${mode.borderColor} bg-opacity-10 shadow-sm`
                : `border-gray-200 ${mode.hoverBg}`
            } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => !disabled && onSelect(mode.key)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{mode.icon}</span>
              <span className="text-sm font-bold">{mode.title}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{mode.description}</p>
            <p className="text-[10px] text-gray-400">用途：{mode.usage}</p>
            {selected === mode.key && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">✓</div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        💡 不确定选哪个？推荐「全量加工」一次性完成两种入库
      </p>
    </div>
  );
}
