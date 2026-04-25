// src/services/thinkingModelMatcher.ts
import type { TaskType } from '@prisma/client';

export type ThinkingModel =
  | 'COT'
  | 'TOULMIN'
  | 'MULTI_PERSPECTIVE'
  | 'STEP_BACK_COT'
  | 'THINK_TUNED'
  | 'STEP_BY_STEP';

// 任务类型 → 思考模型映射
const TASK_THINKING_MAP: Record<TaskType, ThinkingModel> = {
  SHORT_VIDEO:  'COT',
  MOMENTS:      'COT',
  SALES_TALK:   'TOULMIN',
  LIVE_TALK:    'TOULMIN',
  BRAND_STORY:  'MULTI_PERSPECTIVE',
  IMAGE_PROMPT: 'STEP_BY_STEP',
  ANALYSIS:     'MULTI_PERSPECTIVE',
  GENERAL:      'COT',
  CUSTOM:       'COT',
};

// 思考模型 → 注入 S5 的提示词前缀
const THINKING_PROMPTS: Record<ThinkingModel, string> = {
  COT: '请使用链式思考（Chain of Thought）方法，逐步分析后给出结果。',
  TOULMIN: '请使用图尔敏论证模型：主张(Claim) → 依据(Data) → 保证(Warrant) → 支撑(Backing) → 限定(Qualifier) → 反驳(Rebuttal)，构建完整的说服逻辑链。',
  MULTI_PERSPECTIVE: '请从至少 3 个不同维度/视角进行分析，每个视角独立推理后综合得出结论。',
  STEP_BACK_COT: '请先后退一步思考（Step-Back），明确问题的本质和更高层次的原则，然后再逐步推理解决方案。',
  THINK_TUNED: '请使用 Think 方法：先在<think>标签中完成内部推理和排查，再给出最终输出。',
  STEP_BY_STEP: '请逐步推理，每一步明确输入条件和输出结果，最终给出对比和选择建议。',
};

export function matchThinkingModel(taskType: TaskType): ThinkingModel {
  return TASK_THINKING_MAP[taskType] || 'COT';
}

export function getThinkingPrompt(model: ThinkingModel): string {
  return THINKING_PROMPTS[model];
}
