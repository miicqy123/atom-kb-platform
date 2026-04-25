export const TASK_TYPE_MAP: Record<string, string> = {
  SHORT_VIDEO: '短视频文案',
  MOMENTS: '朋友圈文案',
  SALES_TALK: '销售话术',
  LIVE_TALK: '直播话术',
  BRAND_STORY: '品牌故事',
  IMAGE_PROMPT: '做图提示词',
  ANALYSIS: '选题分析',
  GENERAL: '通用',
  CUSTOM: '自定义',
};

export const PLATFORM_MAP: Record<string, string> = {
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  SHIPINHAO: '视频号',
  WECHAT_MOMENTS: '朋友圈',
  GENERAL: '通用',
};

export const AUDIENCE_MAP: Record<string, string> = {
  BOSS: '企业老板',
  EXECUTOR: '执行者',
  CONSUMER: 'C端消费者',
  GENERAL: '通用',
};

export const TASK_TYPE_OPTIONS = Object.entries(TASK_TYPE_MAP).map(([value, label]) => ({ value, label }));
export const PLATFORM_OPTIONS = Object.entries(PLATFORM_MAP).map(([value, label]) => ({ value, label }));
export const AUDIENCE_OPTIONS = Object.entries(AUDIENCE_MAP).map(([value, label]) => ({ value, label }));
