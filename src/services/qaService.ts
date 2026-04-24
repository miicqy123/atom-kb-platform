// src/services/qaService.ts
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface QAPairResult {
  question: string;
  answer: string;
  tags: string[];
  scenarios: string;
  questionKeywords: string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'PROFESSIONAL';
}

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
    "difficulty": "BEGINNER或INTERMEDIATE或PROFESSIONAL"
  }
]

质量红线：禁止编造数据；无案例时标注[材料未提供案例，此处为逻辑推演]；答案必须含踩坑预警。`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 8000,
  });

  const content = response.choices[0].message.content || '{"pairs":[]}';
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : (parsed.pairs || parsed.qa_pairs || []);
}