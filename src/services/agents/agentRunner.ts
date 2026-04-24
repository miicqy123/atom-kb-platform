// src/services/agents/agentRunner.ts
import OpenAI from 'openai';
import { AGENT_PROMPTS } from './prompts';
import type { AgentRole, AgentMessage } from './types';

const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || 'sk-3129db2ab6184ea091184e9c7da5cc1c',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// 单角色执行
export async function runAgent(
  role: AgentRole,
  userMessage: string,
  history: AgentMessage[] = [],
  model = 'qwen-turbo'
): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: AGENT_PROMPTS[role] },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await openai.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
    temperature: role === 'quality-checker' ? 0 : 0.3,
    max_tokens: 2000,
  });

  return res.choices[0].message.content || '{}';
}

// 带重试的安全执行
export async function runAgentSafe(
  role: AgentRole,
  userMessage: string,
  history: AgentMessage[] = [],
  maxRetries = 2
): Promise<{ output: string; parsed: Record<string, unknown>; error?: string }> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const output = await runAgent(role, userMessage, history);
      const parsed = JSON.parse(output);
      return { output, parsed };
    } catch (e) {
      if (i === maxRetries - 1) {
        return { output: '{}', parsed: {}, error: String(e) };
      }
    }
  }
  return { output: '{}', parsed: {} };
}