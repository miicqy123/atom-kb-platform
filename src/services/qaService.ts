// src/services/qaService.ts — Qwen RAG Dataset Builder Pro v7.1

import { z } from 'zod';

/** QA 生成可配置项 */
export interface QAGenerationConfig {
  modelName?: string;
  /** 自定义系统提示词，缺省使用 RAG Pro v7.1 标准 */
  systemPrompt?: string;
  /** 自定义用户提示词模板，支持 {materialType} {content} {targetCount} 占位符 */
  userPromptTemplate?: string;
  maxTokens?: number;
  temperature?: number;
}

/** 单条 QA 对结果 */
export interface QAPairResult {
  question: string;
  answer: string;
  tags: string[];
  scenarios: string[];
  questionKeywords: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
}

// ━━━ Zod Schema（用于运行时校验 LLM 输出）━━━
const QAPairItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  tags: z.array(z.string()).default([]),
  scenarios: z.array(z.string()).default([]),
  questionKeywords: z.array(z.string()).default([]),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT']).default('INTERMEDIATE'),
});

const QAPairsSchema = z.object({
  qaPairs: z.array(QAPairItemSchema).min(1),
});

// ━━━ RAG Pro v7.1 结构化 Prompt（API 版）━━━
const SYSTEM_PROMPT_RAG_V7 = `你是行业知识库RAG数据集构建专家。

## 核心原则
1. 所有QA必须严格基于输入材料，不得捏造数字、价格、案例、人物、效果。
2. 如果材料没有案例，必须在答案中标注"材料未提供案例"。
3. 问题必须是用户真实会搜索的场景化问题。
4. 答案必须自足，不能出现"如上文所述""如前所述"等指向性表述。
5. 不要在答案中输出思考过程、规划、或Markdown格式。

## 答案7层结构
每个答案应尽量包含以下层次（根据材料信息量灵活调整）：
1. 核心观点 — 一句话总结
2. 机理解释 — 为什么是这样
3. 案例或材料依据 — 材料中的具体信息
4. 实操建议 — 可执行的行动指南
5. 常见误区 — 容易犯错的地方
6. 边界与延伸 — 适用的前提和场景
7. 反向思维/踩坑预警 — 如果做错了会怎样

## 输出要求
只输出JSON，不输出任何其他文字、代码块标记、Markdown。`;

const USER_PROMPT_TEMPLATE_RAG_V7 = `基于以下材料生成高质量QA对。

材料类型：{materialType}

材料内容：
"""
{content}
"""

请生成 {targetCount} 个QA对。

JSON结构：
{{
  "qaPairs": [
    {{
      "question": "用户真实会问的场景化问题",
      "answer": "7层结构答案",
      "tags": ["标签1", "标签2", "标签3"],
      "scenarios": ["适用场景1", "适用场景2"],
      "questionKeywords": ["关键词1", "关键词2", "关键词3"],
      "difficulty": "BEGINNER 或 INTERMEDIATE 或 EXPERT"
    }}
  ]
}}`;

/**
 * 按段落分组：按 ## 标题 或两个换行分割 markdown
 */
export function splitIntoSections(markdown: string): string[] {
  const raw = markdown.split(/\n(?=#{1,3}\s)/);
  const sections: string[] = [];
  for (const section of raw) {
    if (section.trim().length >= 100) {
      sections.push(section.trim());
    } else if (sections.length > 0) {
      sections[sections.length - 1] += '\n\n' + section.trim();
    }
  }
  return sections;
}

/**
 * 从 LLM 返回文本中提取并解析 JSON
 */
function parseJSON(text: string): any {
  // 移除 ```json 或 ``` 代码块标记
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // 尝试直接解析
  try {
    return JSON.parse(cleaned);
  } catch {
    // 尝试找到第一个 { 到最后一个 }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {}
    }
    // 尝试找到第一个 [ 到最后一个 ]
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) {
      try {
        const arr = JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
        return { qaPairs: arr };
      } catch {}
    }
    throw new Error(`无法解析 LLM 返回的 JSON。返回前200字符: ${cleaned.slice(0, 200)}`);
  }
}

/**
 * 对单个 section 调用 Qwen 生成 QA 对（RAG Pro v7.1 标准）
 */
export async function generateQAFromSection(
  section: string,
  materialType: string,
  config?: QAGenerationConfig
): Promise<QAPairResult[]> {
  const {
    modelName,
    systemPrompt = SYSTEM_PROMPT_RAG_V7,
    userPromptTemplate = USER_PROMPT_TEMPLATE_RAG_V7,
    maxTokens = 8000,
    temperature = 0.1,
  } = config || {};

  // 根据材料长度动态计算目标 QA 数量
  const wordCount = section.length;
  const targetCount =
    wordCount < 300 ? 1 :
    wordCount < 800 ? 2 :
    wordCount < 2000 ? 3 : 5;

  const userPrompt = userPromptTemplate
    .replace('{materialType}', materialType)
    .replace('{content}', section.slice(0, 8000))
    .replace('{targetCount}', String(targetCount));

  const { callLLM } = await import('@/server/services/modelGateway');
  const result = await callLLM(
    'qa_generation',
    systemPrompt,
    userPrompt,
    {
      maxTokens,
      temperature,
      ...(modelName ? { model: modelName } : {}),
    }
  );

  // 解析 JSON
  const parsed = parseJSON(result.content);
  // 支持多种返回格式：{qaPairs: [...]} 或 直接数组
  const items = Array.isArray(parsed) ? parsed : (parsed.qaPairs || parsed.pairs || []);

  // 用 Zod 校验
  const validated = QAPairsSchema.parse({ qaPairs: items });
  return validated.qaPairs;
}

/**
 * @deprecated 使用 splitIntoSections + generateQAFromSection 替代
 */
export async function generateQAPairs(
  markdown: string,
  materialType: string
): Promise<QAPairResult[]> {
  const sections = splitIntoSections(markdown);
  const results: QAPairResult[] = [];
  for (const section of sections) {
    const pairs = await generateQAFromSection(section, materialType);
    results.push(...pairs);
  }
  return results;
}
