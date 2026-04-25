"use client";

import { z } from "zod";

// ===================== 表单数据类型 =====================

export const DEPARTMENTS = [
  "销售部", "市场部", "产品部", "技术研发部", "运营部",
  "客服售后", "人力资源", "财务部", "行政综合", "其他",
] as const;

export const LEVELS = ["初级", "中级", "高级", "专家", "管理层"] as const;

export const YEARS_IN_ROLE = [
  "1年以下", "1-3年", "3-5年", "5-10年", "10年以上",
] as const;

export const SOP_STATUS_OPTIONS = ["完善", "部分有", "基本没有"] as const;

export const EXPERIENCE_DEPENDENCY_OPTIONS = ["极高", "高", "中等", "较低"] as const;

export const AI_POTENTIAL_OPTIONS = ["高", "中", "低"] as const;

// ===================== 模块类型 =====================

export interface PositionSurveyData {
  // A: 基础信息
  name: string;
  department: string;
  departmentCustom: string;
  position: string;
  level: string;
  yearsInRole: string;
  surveyDate: string;
  // B: 岗位职责与高频任务
  jobDescription: string;
  frequentTasks: string;
  referenceDocuments: string;
  industryTerms: string;
  sopStatus: string;
  // C: 工作经验与决策规则
  valuableExperience: string;
  ifThenRules: string;
  decisionPoints: string;
  hardToTeach: string;
  experienceDependency: string;
  aiPotential: string;
  // D: 思维框架与任务拆解
  firstStep: string;
  workflow: string;
  timeConsumingStep: string;
  thinkingFrameworks: string;
  halfTimePriority: string;
  // E: 避坑经验与质量标准
  rookieMistakes: string;
  redLines: string;
  commonMisconceptions: string;
  qualityChecklist: string;
  bestCaseExample: string;
  coreEssence: string;
  // F: 知识资产与AI协作
  aiWishlist: string;
  personalAssets: string;
  frequentFeedback: string;
  aiCapabilityBoundary: string;
  promptSuggestions: string;
  // G: 附件
  attachments: { name: string; url: string }[];
}

// ===================== Zod 校验 schema =====================

export const positionSurveySchema = z.object({
  // A
  name: z.string().min(1, "请填写填写人姓名"),
  department: z.string().min(1, "请选择所属部门"),
  departmentCustom: z.string().optional().default(""),
  position: z.string().min(1, "请填写岗位名称"),
  level: z.string().min(1, "请选择岗位级别"),
  yearsInRole: z.string().min(1, "请选择工作年限"),
  surveyDate: z.string().min(1, "请选择调研日期"),
  // B
  jobDescription: z.string().min(1, "请填写岗位核心职责"),
  frequentTasks: z.string().min(1, "请填写高频任务清单"),
  referenceDocuments: z.string().optional().default(""),
  industryTerms: z.string().optional().default(""),
  sopStatus: z.string().min(1, "请选择 SOP 文档情况"),
  // C
  valuableExperience: z.string().min(1, "请填写工作经验总结"),
  ifThenRules: z.string().min(1, "请填写工作中的规则"),
  decisionPoints: z.string().min(1, "请填写关键决策点"),
  hardToTeach: z.string().optional().default(""),
  experienceDependency: z.string().min(1, "请评估经验依赖度"),
  aiPotential: z.string().min(1, "请评估 AI 辅助潜力"),
  // D
  firstStep: z.string().min(1, "请填写核心任务第一步"),
  workflow: z.string().min(1, "请填写完整工作流程"),
  timeConsumingStep: z.string().optional().default(""),
  thinkingFrameworks: z.string().optional().default(""),
  halfTimePriority: z.string().optional().default(""),
  // E
  rookieMistakes: z.string().min(1, "请填写新手常犯错误"),
  redLines: z.string().min(1, "请填写岗位红线"),
  commonMisconceptions: z.string().optional().default(""),
  qualityChecklist: z.string().min(1, "请填写自查清单"),
  bestCaseExample: z.string().optional().default(""),
  coreEssence: z.string().min(1, "请填写岗位核心要诀"),
  // F
  aiWishlist: z.string().min(1, "请填写对 AI 的期望"),
  personalAssets: z.string().optional().default(""),
  frequentFeedback: z.string().optional().default(""),
  aiCapabilityBoundary: z.string().optional().default(""),
  promptSuggestions: z.string().optional().default(""),
  // G — 附件无校验（选填）
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional().default([]),
});

export type PositionSurveyFormData = z.infer<typeof positionSurveySchema>;

// ===================== 模块定义 =====================

export interface ModuleField {
  key: keyof PositionSurveyFormData;
  label: string;
  type: "input" | "textarea" | "select" | "date";
  required: boolean;
  placeholder?: string;
  guide?: string;
  half?: boolean;
  options?: readonly string[];
  condition?: string; // 关联字段名，值为指定值时显示
  conditionValue?: string;
}

export interface Module {
  id: string;
  title: string;
  fields: ModuleField[];
}

export const MODULES: Module[] = [
  {
    id: "A",
    title: "基础信息",
    fields: [
      { key: "name", label: "填写人姓名", type: "input", required: true, half: true, placeholder: "请输入姓名" },
      { key: "department", label: "所属部门", type: "select", required: true, half: true, options: DEPARTMENTS },
      { key: "departmentCustom", label: "自定义部门", type: "input", required: false, half: true, placeholder: "请输入部门名称", condition: "department", conditionValue: "其他" },
      { key: "position", label: "岗位名称", type: "input", required: true, half: true, placeholder: "如：前端开发工程师" },
      { key: "level", label: "岗位级别", type: "select", required: true, half: true, options: LEVELS },
      { key: "yearsInRole", label: "本岗位工作年限", type: "select", required: true, half: true, options: YEARS_IN_ROLE },
      { key: "surveyDate", label: "调研日期", type: "date", required: true, half: true },
    ],
  },
  {
    id: "B",
    title: "岗位职责与高频任务",
    fields: [
      { key: "jobDescription", label: "岗位 JD / 核心职责", type: "textarea", required: true, guide: "请贴入岗位说明书，或口述这个岗位每天到底在干什么" },
      { key: "frequentTasks", label: "高频任务清单（按频率排序）", type: "textarea", required: true, guide: "示例：写方案×5/周、客户沟通×3/周、周报×1/周" },
      { key: "referenceDocuments", label: "常用参考资料/模板", type: "textarea", required: false, guide: "日常工作中经常参考的文档或模板" },
      { key: "industryTerms", label: "常用行业术语/内部简称", type: "textarea", required: false, guide: "列出本岗位常用但外人不懂的词，AI需要学会这些行话" },
      { key: "sopStatus", label: "现有 SOP / 文档情况", type: "select", required: true, options: SOP_STATUS_OPTIONS },
    ],
  },
  {
    id: "C",
    title: "工作经验与决策规则",
    fields: [
      { key: "valuableExperience", label: "近半年最值钱的工作经验总结", type: "textarea", required: true, guide: "回顾过去半年，哪些经验最有价值？" },
      { key: "ifThenRules", label: "工作中的「如果…就…」规则（至少5条）", type: "textarea", required: true, guide: "示例：如果客户说预算不够，就提供分期方案" },
      { key: "decisionPoints", label: "关键决策点与判断依据", type: "textarea", required: true, guide: "哪些节点需要你做判断？依据是什么？" },
      { key: "hardToTeach", label: "哪些判断很难教给别人？为什么？", type: "textarea", required: false },
      { key: "experienceDependency", label: "经验依赖度评估", type: "select", required: true, options: EXPERIENCE_DEPENDENCY_OPTIONS },
      { key: "aiPotential", label: "AI 辅助潜力评估", type: "select", required: true, options: AI_POTENTIAL_OPTIONS },
    ],
  },
  {
    id: "D",
    title: "思维框架与任务拆解",
    fields: [
      { key: "firstStep", label: "拿到核心任务的第一步是什么？为什么？", type: "textarea", required: true },
      { key: "workflow", label: "完整工作流程（按顺序列出每个步骤）", type: "textarea", required: true, guide: "请按顺序列出从接到任务到交付的完整步骤" },
      { key: "timeConsumingStep", label: "哪个步骤花时间最多？", type: "textarea", required: false },
      { key: "thinkingFrameworks", label: "常用思考框架/分析模型", type: "textarea", required: false, guide: "如：SWOT、PDCA、金字塔原理等" },
      { key: "halfTimePriority", label: "如果时间只有一半，保留/砍掉哪些步骤？", type: "textarea", required: false },
    ],
  },
  {
    id: "E",
    title: "避坑经验与质量标准",
    fields: [
      { key: "rookieMistakes", label: "新手最常犯的前5个错误", type: "textarea", required: true },
      { key: "redLines", label: "岗位红线/禁忌", type: "textarea", required: true, guide: "哪些事情绝对不能做？" },
      { key: "commonMisconceptions", label: "「看起来对但其实错」的常见做法", type: "textarea", required: false },
      { key: "qualityChecklist", label: "交付前自查清单", type: "textarea", required: true, guide: "每次交付前必须检查哪些事项？" },
      { key: "bestCaseExample", label: "见过的最好案例 & 好在哪里", type: "textarea", required: false },
      { key: "coreEssence", label: "一句话总结这个岗位的核心要诀", type: "textarea", required: true },
    ],
  },
  {
    id: "F",
    title: "知识资产与 AI 协作",
    fields: [
      { key: "aiWishlist", label: "如果有 AI 助手，最希望它做什么？", type: "textarea", required: true, guide: "列 3-5 个具体场景" },
      { key: "personalAssets", label: "你的私房素材库有哪些？", type: "textarea", required: false, guide: "个人积累的模板、笔记、代码片段等" },
      { key: "frequentFeedback", label: "最常给新手的3句高频反馈", type: "textarea", required: false },
      { key: "aiCapabilityBoundary", label: "你的经验中 AI 能学会/学不会的部分", type: "textarea", required: false },
      { key: "promptSuggestions", label: "提示词方向建议（初步）", type: "textarea", required: false },
    ],
  },
  {
    id: "G",
    title: "附件上传",
    fields: [
      { key: "attachments", label: "上传附件", type: "input", required: false, guide: "支持 .doc/.docx/.pdf/.ppt/.pptx/.xls/.xlsx/.jpg/.jpeg/.png/.mp3/.mp4/.wav（可选）" },
    ],
  },
];

// ===================== Markdown 生成 =====================

export function generatePositionMarkdown(data: PositionSurveyFormData): string {
  const lines: string[] = [];
  const dept = data.department === "其他" && data.departmentCustom ? data.departmentCustom : data.department;
  lines.push(`# 岗位调研报告：${data.position}（${dept}）`);
  lines.push("");
  lines.push(`> 填写人：${data.name} ｜ 岗位级别：${data.level} ｜ 工作年限：${data.yearsInRole} ｜ 调研日期：${data.surveyDate}`);
  lines.push("");

  // B
  lines.push("## 一、岗位职责与高频任务");
  lines.push("");
  lines.push(data.jobDescription || "（未填写）"); lines.push("");
  lines.push("### 高频任务清单"); lines.push("");
  lines.push(data.frequentTasks || "（未填写）"); lines.push("");
  if (data.referenceDocuments) { lines.push("### 常用参考资料/模板"); lines.push(""); lines.push(data.referenceDocuments); lines.push(""); }
  if (data.industryTerms) { lines.push("### 常用行业术语/内部简称"); lines.push(""); lines.push(data.industryTerms); lines.push(""); }
  lines.push(`**SOP 文档情况：** ${data.sopStatus || "（未填写）"}`); lines.push("");

  // C
  lines.push("## 二、工作经验与决策规则");
  lines.push("");
  lines.push("### 近半年最值钱的工作经验"); lines.push("");
  lines.push(data.valuableExperience || "（未填写）"); lines.push("");
  lines.push("### 「如果…就…」规则"); lines.push("");
  lines.push(data.ifThenRules || "（未填写）"); lines.push("");
  lines.push("### 关键决策点与判断依据"); lines.push("");
  lines.push(data.decisionPoints || "（未填写）"); lines.push("");
  if (data.hardToTeach) { lines.push("### 难以传授的判断"); lines.push(""); lines.push(data.hardToTeach); lines.push(""); }
  lines.push(`**经验依赖度：** ${data.experienceDependency || "（未填写）"} ｜ **AI 辅助潜力：** ${data.aiPotential || "（未填写）"}`); lines.push("");

  // D
  lines.push("## 三、思维框架与任务拆解");
  lines.push("");
  lines.push("### 核心任务的第一步"); lines.push("");
  lines.push(data.firstStep || "（未填写）"); lines.push("");
  lines.push("### 完整工作流程"); lines.push("");
  lines.push(data.workflow || "（未填写）"); lines.push("");
  if (data.timeConsumingStep) { lines.push("### 最耗时步骤"); lines.push(""); lines.push(data.timeConsumingStep); lines.push(""); }
  if (data.thinkingFrameworks) { lines.push("### 常用思考框架"); lines.push(""); lines.push(data.thinkingFrameworks); lines.push(""); }
  if (data.halfTimePriority) { lines.push("### 时间减半时的取舍"); lines.push(""); lines.push(data.halfTimePriority); lines.push(""); }

  // E
  lines.push("## 四、避坑经验与质量标准");
  lines.push("");
  lines.push("### 新手最常犯的错误"); lines.push("");
  lines.push(data.rookieMistakes || "（未填写）"); lines.push("");
  lines.push("### 岗位红线/禁忌"); lines.push("");
  lines.push(data.redLines || "（未填写）"); lines.push("");
  if (data.commonMisconceptions) { lines.push("### 常见误区"); lines.push(""); lines.push(data.commonMisconceptions); lines.push(""); }
  lines.push("### 交付前自查清单"); lines.push("");
  lines.push(data.qualityChecklist || "（未填写）"); lines.push("");
  if (data.bestCaseExample) { lines.push("### 最佳案例"); lines.push(""); lines.push(data.bestCaseExample); lines.push(""); }
  lines.push("### 核心要诀"); lines.push("");
  lines.push(data.coreEssence || "（未填写）"); lines.push("");

  // F
  lines.push("## 五、知识资产与 AI 协作");
  lines.push("");
  lines.push("### AI 期望清单"); lines.push("");
  lines.push(data.aiWishlist || "（未填写）"); lines.push("");
  if (data.personalAssets) { lines.push("### 个人素材库"); lines.push(""); lines.push(data.personalAssets); lines.push(""); }
  if (data.frequentFeedback) { lines.push("### 高频反馈"); lines.push(""); lines.push(data.frequentFeedback); lines.push(""); }
  if (data.aiCapabilityBoundary) { lines.push("### AI 能力边界"); lines.push(""); lines.push(data.aiCapabilityBoundary); lines.push(""); }
  if (data.promptSuggestions) { lines.push("### 提示词建议"); lines.push(""); lines.push(data.promptSuggestions); lines.push(""); }

  return lines.join("\n");
}
