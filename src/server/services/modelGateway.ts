// src/server/services/modelGateway.ts
// ━━━ 保留原有多供应商客户端池架构，新增 DashScope/Qwen ━━━
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ━━━ 场景类型（原有 + P0-0 新增）━━━
export type LLMScene =
  | 'routing' | 'pre_check' | 'main_creative' | 'main_analytical'
  | 'script' | 'evaluation' | 'planner' | 'extraction' | 'optimization' | 'clone'
  // ▼ P0-0 新增场景
  | 'pdf_conversion' | 'image_understand' | 'classification'
  | 'tagging' | 'chunking' | 'qa_generation';

export interface LLMResponse {
  content: string;
  model: string;
  tokenUsage: { input: number; output: number; total: number };
}

// ━━━ 多供应商客户端池（保留原有架构）━━━
const clients: Record<string, OpenAI> = {};

function getClient(model: string): OpenAI {
  // 当前阶段：所有 qwen-* 走 DashScope
  if (model.startsWith('qwen')) {
    return clients.qwen ??= new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY!,
      baseURL: process.env.DASHSCOPE_BASE_URL
        || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }

  // ━━━ 后期启用其他供应商时取消注释 ━━━
  // if (model.startsWith('deepseek')) {
  //   return clients.deepseek ??= new OpenAI({
  //     apiKey: process.env.DEEPSEEK_API_KEY!,
  //     baseURL: 'https://api.deepseek.com/v1',
  //   });
  // }
  // if (model.startsWith('claude')) {
  //   return clients.claude ??= new OpenAI({
  //     apiKey: process.env.CLAUDE_API_KEY!,
  //     baseURL: process.env.CLAUDE_BASE_URL ?? 'https://api.openai.com/v1',
  //   });
  // }
  // return clients.openai ??= new OpenAI({
  //   apiKey: process.env.OPENAI_API_KEY!,
  //   baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  // });

  // 当前阶段：未匹配的模型也走 DashScope（fallback）
  return clients.qwen ??= new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY!,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  });
}

// ━━━ 场景 → 默认模型映射（全部指向 Qwen，后期改 seed 即切供应商）━━━
const SCENE_MODEL_MAP: Record<string, { model: string; temperature: number }> = {
  // 原有场景（从 deepseek/gpt/claude → qwen）
  routing:           { model: 'qwen-turbo',   temperature: 0.3 },
  pre_check:         { model: 'qwen-turbo',   temperature: 0.3 },
  main_creative:     { model: 'qwen-max',     temperature: 0.75 },
  main_analytical:   { model: 'qwen-plus',    temperature: 0.3 },
  script:            { model: 'qwen-plus',    temperature: 0.5 },
  evaluation:        { model: 'qwen-plus',    temperature: 0.2 },
  planner:           { model: 'qwen-plus',    temperature: 0.3 },
  extraction:        { model: 'qwen-plus',    temperature: 0.2 },
  optimization:      { model: 'qwen-max',     temperature: 0.3 },
  clone:             { model: 'qwen-max',     temperature: 0.5 },
  // P0-0 新增场景
  pdf_conversion:    { model: 'qwen-vl-ocr',  temperature: 0.1 },
  image_understand:  { model: 'qwen-vl-plus', temperature: 0.2 },
  classification:    { model: 'qwen-plus',    temperature: 0.0 },
  tagging:           { model: 'qwen-plus',    temperature: 0.0 },
  chunking:          { model: 'qwen-plus',    temperature: 0.2 },
  qa_generation:     { model: 'qwen-plus',    temperature: 0.3 },
};

// ━━━ 配置缓存（保留原有逻辑）━━━
let configCache: Map<string, { model: string; temperature: number }> | null = null;
let configCacheTime = 0;
const CACHE_TTL = 60_000; // 1 分钟

async function getModelConfig(scene: string) {
  if (!configCache || Date.now() - configCacheTime > CACHE_TTL) {
    const rows = await prisma.modelConfig.findMany({ where: { status: 'active' } });
    configCache = new Map(
      rows.map(r => [r.scene, { model: r.defaultModel, temperature: r.temperature }])
    );
    configCacheTime = Date.now();
  }
  return configCache.get(scene) ?? SCENE_MODEL_MAP[scene] ?? null;
}

// ━━━ 保留原有三参数签名：callLLM(scene, systemPrompt, userPrompt, options?) ━━━
export async function callLLM(
  scene: LLMScene,
  systemPrompt: string,
  userPrompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    retries?: number;
  },
): Promise<LLMResponse> {
  const config = await getModelConfig(scene);
  const model = options?.model || config?.model || 'qwen-plus';
  const temp  = options?.temperature ?? config?.temperature ?? 0.3;
  const client = getClient(model);

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature: temp,
    max_tokens: options?.maxTokens || 4096,
  });

  const content = completion.choices[0]?.message?.content || '';
  const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  return {
    content,
    model,
    tokenUsage: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens,
    },
  };
}

// ━━━ 保留原有 callLLMJson 签名 ━━━
export async function callLLMJson<T>(
  scene: LLMScene,
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
): Promise<{ data: T; tokenUsage: LLMResponse['tokenUsage'] }> {
  const result = await callLLM(
    scene,
    systemPrompt,
    userPrompt + '\n\n请以 JSON 格式返回。',
    { maxTokens: 4096 },
  );
  const raw = result.content.replace(/```json\n?|```/g, '').trim();
  return { data: schema.parse(JSON.parse(raw)), tokenUsage: result.tokenUsage };
}

// ━━━ 保留原有 streamLLM 签名 ━━━
export async function* streamLLM(
  scene: LLMScene,
  systemPrompt: string,
  userPrompt: string,
  options?: { model?: string; temperature?: number; maxTokens?: number },
): AsyncGenerator<string> {
  const config = await getModelConfig(scene);
  const model = options?.model || config?.model || 'qwen-plus';
  const temp  = options?.temperature ?? config?.temperature ?? 0.3;
  const client = getClient(model);

  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature: temp,
    max_tokens: options?.maxTokens || 4096,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ━━━ 新增：多模态调用（PDF/图片理解，通过 getClient 走 DashScope）━━━
export async function callVisionLLM(options: {
  imageUrl?: string;
  imageBase64?: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}): Promise<LLMResponse> {
  const model = options.model || 'qwen-vl-ocr';
  const client = getClient(model);
  const parts: any[] = [];

  if (options.imageUrl) {
    parts.push({ type: 'image_url', image_url: { url: options.imageUrl } });
  } else if (options.imageBase64) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${options.imageBase64}` },
    });
  }
  parts.push({ type: 'text', text: options.prompt });

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: parts }],
    temperature: 0.1,
    max_tokens: options.maxTokens || 8192,
  });

  const content = completion.choices[0]?.message?.content || '';
  const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  return {
    content: typeof content === 'string' ? content : JSON.stringify(content),
    model,
    tokenUsage: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens,
    },
  };
}
