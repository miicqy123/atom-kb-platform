'use client';

const SOURCE_LABELS: Record<string, { text: string; color: string }> = {
  E1_COMPANY: { text: '企业', color: 'bg-blue-100 text-blue-800' },
  E2_INDUSTRY: { text: '行业', color: 'bg-purple-100 text-purple-800' },
  E3_BOOK: { text: '书本', color: 'bg-amber-100 text-amber-800' },
  E3_CROSS_INDUSTRY: { text: '跨行业', color: 'bg-orange-100 text-orange-800' },
};

const CATEGORY_LABELS: Record<string, { text: string; color: string }> = {
  CAT_WHO: { text: '身份与受众', color: 'bg-cyan-100 text-cyan-800' },
  CAT_WHAT: { text: '产品与卖点', color: 'bg-green-100 text-green-800' },
  CAT_HOW: { text: '方法与流程', color: 'bg-yellow-100 text-yellow-800' },
  CAT_STYLE: { text: '风格与表达', color: 'bg-pink-100 text-pink-800' },
  CAT_FENCE: { text: '红线与合规', color: 'bg-red-100 text-red-800' },
  CAT_PROOF: { text: '证据与案例', color: 'bg-indigo-100 text-indigo-800' },
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  WHO_BRAND: '品牌定位', WHO_ROLE: '角色人格', WHO_AUDIENCE: '受众画像', WHO_TERM: '术语规范',
  WHAT_PRODUCT: '产品信息', WHAT_USP: '差异卖点', WHAT_PRICE: '价格体系', WHAT_CERT: '权威背书',
  HOW_SOP: '标准流程', HOW_METHOD: '方法论', HOW_TACTIC: '技巧策略', HOW_BEST: '最佳实践',
  STYLE_HOOK: '钩子库', STYLE_WORD: '词库', STYLE_TONE: '语言风格', STYLE_RHYTHM: '结构节奏',
  FENCE_BAN: '禁用清单', FENCE_ALLOW: '白名单', FENCE_LAW: '法规合规', FENCE_BLUR: '模糊处理',
  PROOF_CASE: '成功案例', PROOF_DATA: '数据报告', PROOF_FAIL: '反面教训', PROOF_COMPARE: '对比分析',
};

const SUBCATEGORY_SLOTS: Record<string, string[]> = {
  WHO_BRAND: ['S0', 'S1'], WHO_ROLE: ['S1'], WHO_AUDIENCE: ['S0', 'S6'], WHO_TERM: ['S4'],
  WHAT_PRODUCT: ['S10'], WHAT_USP: ['S10', 'S5'], WHAT_PRICE: ['S10'], WHAT_CERT: ['S10', 'S8'],
  HOW_SOP: ['S5'], HOW_METHOD: ['S10', 'S5'], HOW_TACTIC: ['S5'], HOW_BEST: ['S10'],
  STYLE_HOOK: ['S10'], STYLE_WORD: ['S10'], STYLE_TONE: ['S7'], STYLE_RHYTHM: ['S7', 'S10'],
  FENCE_BAN: ['S4'], FENCE_ALLOW: ['S4'], FENCE_LAW: ['S4'], FENCE_BLUR: ['S4'],
  PROOF_CASE: ['S10', 'S8'], PROOF_DATA: ['S10', 'S8'], PROOF_FAIL: ['S8'], PROOF_COMPARE: ['S10'],
};

interface Props {
  experienceSource?: string | null;
  category?: string | null;
  subcategory?: string | null;
  showSlots?: boolean;
  compact?: boolean;
}

export function ClassificationBadge({ experienceSource, category, subcategory, showSlots = false, compact = false }: Props) {
  const source = experienceSource ? SOURCE_LABELS[experienceSource] : null;
  const cat = category ? CATEGORY_LABELS[category] : null;
  const subLabel = subcategory ? SUBCATEGORY_LABELS[subcategory] : null;
  const slots = subcategory ? SUBCATEGORY_SLOTS[subcategory] : null;

  if (!source && !cat && !subLabel) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px]">
        {source && <span className={`px-1.5 py-0.5 rounded ${source.color}`}>{source.text}</span>}
        {source && cat && <span className="text-gray-300">→</span>}
        {cat && <span className={`px-1.5 py-0.5 rounded ${cat.color}`}>{cat.text}</span>}
        {cat && subLabel && <span className="text-gray-300">→</span>}
        {subLabel && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{subLabel}</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {source && <span className={`px-2 py-0.5 rounded-full font-medium ${source.color}`}>{source.text}</span>}
      {source && cat && <span className="text-gray-300">→</span>}
      {cat && <span className={`px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.text}</span>}
      {cat && subLabel && <span className="text-gray-300">→</span>}
      {subLabel && <span className="px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">{subLabel}</span>}
      {showSlots && slots && (
        <span className="text-[10px] text-gray-400 ml-1">→ {slots.join(', ')}</span>
      )}
    </div>
  );
}
