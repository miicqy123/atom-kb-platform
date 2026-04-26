// src/services/qaService.ts

export interface QAPairResult {
  question: string;
  answer: string;
  tags: string[];
  scenarios: string;
  questionKeywords: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
}

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
 * 对单个 section 调用 LLM 生成 QA 对（JSON Schema 约束）
 */
export async function generateQAFromSection(
  section: string,
  materialType: string
): Promise<QAPairResult[]> {
  const prompt = `你是企业知识库QA对生成专家。基于以下材料段落生成高质量问答对。

材料类型：${materialType}
材料内容：
"""
${section.slice(0, 4000)}
"""

严格按以下JSON数组格式返回：
[
  {
    "question": "场景化自然语言问题",
    "answer": "结构化答案（≥400字）：核心观点→机理解释→案例→实操建议→踩坑预警→适用边界→可复用公式",
    "tags": ["标签1", "标签2"],
    "scenarios": "适用场景描述",
    "questionKeywords": ["关键词1", "关键词2", "关键词3"],
    "difficulty": "BEGINNER 或 INTERMEDIATE 或 EXPERT"
  }
]

每个段落生成 2-5 个 QA 对。质量红线：禁止编造数据。`;

  const { callLLM } = await import('@/server/services/modelGateway');
  const result = await callLLM('qa_generation', '', prompt, {
    maxTokens: 6000,
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(result.content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @deprecated 使用 splitIntoSections + generateQAFromSection 替代
 */
export async function generateQAPairs(
  markdown: string,
  materialType: string
): Promise<QAPairResult[]> {
  const wordCount = markdown.length;
  const targetCount =
    wordCount < 1000 ? 4 :
    wordCount < 3000 ? 8 :
    wordCount < 5000 ? 18 : 30;

  const prompt = `你是企业知识库QA对生成专家。基于以下材料生成 ${targetCount} 组高质量问答对。

材料类型：${materialType}
材料内容：
"""
${markdown.slice(0, 6000)}
"""

严格按以下JSON数组格式返回，每个QA对包含6个字段：
[
  {
    "question": "场景化问题（多个问法用/分隔）[入门/进阶/专业]",
    "answer": "7-8层结构答案（≥400字）：1.核心观点 2.机理解释 3.案例1 4.案例2 5.实操建议4条 6.踩坑预警 7.适用边界 8.可复用公式",
    "tags": ["标签1", "标签2", "标签3"],
    "scenarios": "主要适用场景+典型使用者+触发时机",
    "questionKeywords": ["关键词1","关键词2","关键词3","关键词4","关键词5"],
    "difficulty": "BEGINNER或INTERMEDIATE或EXPERT"
  }
]

质量红线：禁止编造数据；无案例时标注[材料未提供案例，此处为逻辑推演]；答案必须含踩坑预警。`;

  const { callLLM } = await import('@/server/services/modelGateway');
  const result = await callLLM('qa_generation', '', prompt, {
    maxTokens: 8000,
    temperature: 0.3,
  });

  const content = result.content;
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : (parsed.pairs || parsed.qa_pairs || []);
}