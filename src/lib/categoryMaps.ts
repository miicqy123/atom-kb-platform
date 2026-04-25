// src/lib/categoryMaps.ts

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  CAT_WHO: '身份与受众',
  CAT_WHAT: '产品与卖点',
  CAT_HOW: '方法与流程',
  CAT_STYLE: '风格与表达',
  CAT_FENCE: '红线与合规',
  CAT_PROOF: '证据与案例',
};

export const SUBCATEGORY_LABEL_MAP: Record<string, string> = {
  WHO_BRAND: '品牌定位',
  WHO_ROLE: '角色人格',
  WHO_AUDIENCE: '受众画像',
  WHO_TERM: '术语规范',
  WHAT_PRODUCT: '产品信息',
  WHAT_USP: '差异卖点',
  WHAT_PRICE: '价格体系',
  WHAT_CERT: '权威背书',
  HOW_SOP: '标准流程',
  HOW_METHOD: '方法论框架',
  HOW_TACTIC: '技巧策略',
  HOW_BEST: '最佳实践',
  STYLE_HOOK: '钩子库',
  STYLE_WORD: '词库',
  STYLE_TONE: '语言风格',
  STYLE_RHYTHM: '结构节奏',
  FENCE_BAN: '禁用清单',
  FENCE_ALLOW: '可用白名单',
  FENCE_LAW: '法规合规',
  FENCE_BLUR: '模糊处理',
  PROOF_CASE: '成功案例',
  PROOF_DATA: '数据报告',
  PROOF_FAIL: '反面教训',
  PROOF_COMPARE: '对比分析',
};

// 类别→子类别联动映射
export const CATEGORY_SUBCATEGORY_MAP: Record<string, string[]> = {
  CAT_WHO: ['WHO_BRAND', 'WHO_ROLE', 'WHO_AUDIENCE', 'WHO_TERM'],
  CAT_WHAT: ['WHAT_PRODUCT', 'WHAT_USP', 'WHAT_PRICE', 'WHAT_CERT'],
  CAT_HOW: ['HOW_SOP', 'HOW_METHOD', 'HOW_TACTIC', 'HOW_BEST'],
  CAT_STYLE: ['STYLE_HOOK', 'STYLE_WORD', 'STYLE_TONE', 'STYLE_RHYTHM'],
  CAT_FENCE: ['FENCE_BAN', 'FENCE_ALLOW', 'FENCE_LAW', 'FENCE_BLUR'],
  CAT_PROOF: ['PROOF_CASE', 'PROOF_DATA', 'PROOF_FAIL', 'PROOF_COMPARE'],
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL_MAP).map(([value, label]) => ({
  value,
  label,
}));

export function getSubcategoryOptions(category?: string) {
  if (!category) return [];
  const subs = CATEGORY_SUBCATEGORY_MAP[category] || [];
  return subs.map(value => ({
    value,
    label: SUBCATEGORY_LABEL_MAP[value] || value,
  }));
}
