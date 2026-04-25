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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 视觉模型调用（支持图片/PDF 等多模态输入）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 视觉消息中的内容块 */
export type VisionContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

/** callVisionLLM 的选项 */
export interface CallVisionLLMOptions {
  /** 业务场景，用于从 ModelConfig 读取默认模型和温度 */
  scene: LLMScene;
  /** 系统提示词（可选，视觉场景有时不需要 system prompt） */
  systemPrompt?: string;
  /** 多模态内容块数组（文本 + 图片/PDF base64） */
  content: VisionContentPart[];
  /** 手动指定模型，覆盖 scene 默认值 */
  model?: string;
  /** 最大输出 token 数 */
  maxTokens?: number;
  /** 温度，覆盖 scene 默认值 */
  temperature?: number;
  /** 重试次数，默认 1 */
  retries?: number;
}

/**
 * 调用视觉模型（qwen-vl-ocr / qwen-vl-plus 等）。
 *
 * 与 callLLM 的区别：
 * - 支持 image_url 类型的多模态消息
 * - 不强制要求 systemPrompt（视觉场景可省略）
 * - 复用 getClient 客户端池和 getModelConfig 配置
 */
export async function callVisionLLM(
  options: CallVisionLLMOptions,
): Promise<LLMResponse> {
  const {
    scene,
    systemPrompt,
    content,
    model: modelOverride,
    maxTokens = 4096,
    temperature: tempOverride,
    retries = 1,
  } = options;

  // 1) 从 ModelConfig 读取场景配置（复用现有 getModelConfig 逻辑）
  const config = await getModelConfig(scene);
  const model = modelOverride ?? config?.model ?? 'qwen-vl-ocr';
  const temperature = tempOverride ?? config?.temperature ?? 0.1;

  // 2) 构建消息体
  const messages: Array<{ role: 'system' | 'user'; content: string | VisionContentPart[] }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content });

  // 3) 调用（含重试）
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const client = getClient(model);
      const startTime = Date.now();

      const completion = await client.chat.completions.create({
        model,
        messages: messages as any,
        max_tokens: maxTokens,
        temperature,
      });

      const elapsed = Date.now() - startTime;
      const choice = completion.choices[0];
      const responseContent = choice?.message?.content || '';
      const usage = completion.usage;

      console.log(
        `[VisionLLM] scene=${scene} model=${model} ` +
        `tokens=${usage?.total_tokens ?? '?'} time=${elapsed}ms`
      );

      return {
        content: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent),
        model,
        tokenUsage: {
          input: usage?.prompt_tokens ?? 0,
          output: usage?.completion_tokens ?? 0,
          total: usage?.total_tokens ?? 0,
        },
      };
    } catch (e) {
      lastError = e as Error;
      if (attempt < retries - 1) {
        console.warn(
          `[VisionLLM] scene=${scene} model=${model} ` +
          `attempt=${attempt + 1}/${retries} error=${lastError.message}, retrying...`
        );
      }
    }
  }

  throw new Error(
    `[VisionLLM] All attempts failed for scene="${scene}". Last error: ${lastError?.message}`
  );
}
