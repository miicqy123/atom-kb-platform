// src/services/stepReverseService.ts

/**
 * STEP 反推引擎
 * S - Sample：解析输入内容
 * T - Template：提炼结构与规则
 * E - Examine：测试复现率
 * P - Prompt：输出结构化提示词
 */
export async function stepReverse(content: string): Promise<{
  prompt: string;
  slots: Record<string, string>;
  rules: string[];
}> {
  const { callLLM } = await import('@/services/modelGateway');

  const systemPrompt = '你是 STEP 反推专家。请按 STEP 方法分析以下内容，并反向生成能复现该内容的结构化提示词。';

  const userPrompt = `## STEP 方法
- **S (Sample)**：解析内容的结构、风格、钩子、论证方式
- **T (Template)**：提炼出可复用的结构模板和写作规则
- **E (Examine)**：验证提炼的规则是否能复现原内容
- **P (Prompt)**：输出结构化提示词，按 S0-S10 槽位组织

## 输入内容
${content.slice(0, 6000)}

## 输出要求
请严格返回 JSON：
{
  "analysis": { "S": "...", "T": "...", "E": "...", "P": "..." },
  "slots": { "S0": "...", "S1": "...", "S5": "...", "S7": "...", "S10": "..." },
  "rules": ["规则1", "规则2", ...],
  "prompt": "完整的结构化提示词文本"
}`;

  const response = await callLLM('extraction', systemPrompt, userPrompt, {
    temperature: 0.2,
    maxTokens: 4000,
    jsonMode: true,
  });

  const parsed = JSON.parse(response.content);
  return {
    prompt: parsed.prompt || '',
    slots: parsed.slots || {},
    rules: parsed.rules || [],
  };
}
