import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();

export type TaskType = "PDF_EXTRACT" | "IMAGE_OCR" | "SCAN_PDF_OCR";

interface ParseConfig {
  providerType: string;
  modelName: string;
  apiEndpoint?: string | null;
  apiKey?: string | null;
  config?: any;
}

/**
 * 从数据库读取当前租户的解析配置
 * 按优先级排序，返回第一个启用的配置
 * 如果没有配置，返回默认 fallback
 */
async function getParseConfig(taskType: TaskType, tenantId?: string): Promise<ParseConfig> {
  // 1. 查找租户级配置
  const configs = await prisma.documentParseConfig.findMany({
    where: {
      taskType,
      enabled: true,
      OR: [
        { tenantId: tenantId || undefined },
        { tenantId: null }, // 全局默认
      ],
    },
    orderBy: [
      { tenantId: "desc" }, // 租户级优先
      { priority: "desc" },
    ],
    take: 1,
  });

  if (configs.length > 0) {
    const c = configs[0];
    return {
      providerType: c.providerType,
      modelName: c.modelName,
      apiEndpoint: c.apiEndpoint,
      apiKey: c.apiKey,
      config: c.config,
    };
  }

  // 2. Fallback：检查环境变量
  if (process.env.OPENAI_API_KEY) {
    return { providerType: "OPENAI", modelName: "gpt-4o-mini", config: {} };
  }

  // 3. 最终 fallback：本地解析
  return { providerType: "LOCAL_PDFJS", modelName: "local", config: {} };
}

/** 统计模型调用次数 */
async function incrementUsage(taskType: TaskType, tenantId?: string) {
  try {
    await prisma.documentParseConfig.updateMany({
      where: { taskType, tenantId: tenantId || null, enabled: true },
      data: { monthlyUsed: { increment: 1 } },
    });
  } catch { /* 忽略计数错误 */ }
}

// ============================
// 提供商适配器
// ============================

/** OpenAI / OpenAI 兼容接口（GPT-4o, GPT-4o-mini, DeepSeek 等） */
async function parseWithOpenAI(
  buffer: Buffer,
  mimeType: string,
  config: ParseConfig
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    baseURL: config.apiEndpoint || undefined,
  });

  const extra = config.config || {};
  const systemPrompt = extra.systemPrompt ||
    `你是一个专业的文档 OCR 和格式化助手。请将用户提供的文档内容转换为结构清晰的 Markdown 格式。
规则：
1. 正确识别标题层级（#、##、###）
2. 保留表格结构（用 Markdown 表格语法）
3. 保留有序和无序列表
4. 识别粗体、斜体等格式
5. 合并 PDF 断行的段落
6. 去除页眉页脚、页码
7. 不添加任何解释说明，只输出 Markdown`;

  const isImage = mimeType.startsWith("image/");
  const base64 = buffer.toString("base64");

  const userContent: any[] = [];

  if (isImage) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${base64}`, detail: extra.detail || "high" },
    });
  } else {
    // PDF as file
    userContent.push({
      type: "file",
      file: { filename: "document.pdf", file_data: `data:application/pdf;base64,${base64}` },
    });
  }
  userContent.push({
    type: "text",
    text: isImage
      ? "请 OCR 识别这张图片中的所有文字，并转换为结构化的 Markdown 格式。保留原文排版结构。"
      : "请将这个 PDF 文件完整转换为结构化的 Markdown 格式。",
  });

  const response = await client.chat.completions.create({
    model: config.modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: extra.maxTokens || 16000,
    temperature: extra.temperature ?? 0.1,
  });

  return response.choices[0]?.message?.content || "";
}

/** 通义千问 VL（阿里云 DashScope） */
async function parseWithQwen(
  buffer: Buffer,
  mimeType: string,
  config: ParseConfig
): Promise<string> {
  const apiKey = config.apiKey || process.env.DASHSCOPE_API_KEY;
  const endpoint = config.apiEndpoint || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const extra = config.config || {};

  // 通义千问 VL 兼容 OpenAI 格式
  const client = new OpenAI({ apiKey, baseURL: endpoint });

  const base64 = buffer.toString("base64");
  const isImage = mimeType.startsWith("image/");

  const response = await client.chat.completions.create({
    model: config.modelName || "qwen-vl-max",
    messages: [
      {
        role: "system",
        content: "你是一个专业的文档 OCR 助手。将图片或文档内容转换为结构清晰的 Markdown。保留标题、表格、列表结构。不添加解释。",
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: "text",
            text: isImage ? "请 OCR 识别图片中所有文字，输出 Markdown。" : "请提取文档中所有内容，输出 Markdown。",
          },
        ],
      },
    ],
    max_tokens: extra.maxTokens || 8000,
  });

  return response.choices[0]?.message?.content || "";
}

/** 本地 pdfjs-dist（仅 PDF，无 OCR） */
async function parseWithLocalPdfjs(buffer: Buffer): Promise<string> {
  const { pdfBufferToMarkdown } = await import("./pdf-to-markdown");
  return pdfBufferToMarkdown(buffer);
}

/** 自定义 API 端点 */
async function parseWithCustomAPI(
  buffer: Buffer,
  mimeType: string,
  config: ParseConfig
): Promise<string> {
  if (!config.apiEndpoint) throw new Error("自定义解析 API 未配置 endpoint");

  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: mimeType }), "document");
  formData.append("output_format", "markdown");

  const headers: Record<string, string> = {};
  if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

  const res = await fetch(config.apiEndpoint, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error(`Custom API error: ${res.status}`);
  const json = await res.json();
  return json.markdown || json.text || json.content || "";
}

// ============================
// 主入口
// ============================

/**
 * 统一文档解析入口
 * @param buffer 文件 Buffer
 * @param mimeType MIME 类型 (application/pdf, image/png, image/jpeg 等)
 * @param taskType 任务类型
 * @param tenantId 租户 ID（可选）
 */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  taskType: TaskType,
  tenantId?: string
): Promise<{ markdown: string; provider: string; model: string }> {
  const config = await getParseConfig(taskType, tenantId);

  console.log(`[DocumentParse] taskType=${taskType} provider=${config.providerType} model=${config.modelName}`);

  let markdown = "";

  try {
    switch (config.providerType) {
      case "OPENAI":
        markdown = await parseWithOpenAI(buffer, mimeType, config);
        break;
      case "QWEN":
        markdown = await parseWithQwen(buffer, mimeType, config);
        break;
      case "LOCAL_PDFJS":
        if (mimeType === "application/pdf") {
          markdown = await parseWithLocalPdfjs(buffer);
        } else {
          throw new Error("本地 pdfjs 不支持图片 OCR，请配置 AI 模型");
        }
        break;
      case "CUSTOM":
        markdown = await parseWithCustomAPI(buffer, mimeType, config);
        break;
      default:
        throw new Error(`未知的解析提供商: ${config.providerType}`);
    }

    // 记录用量
    await incrementUsage(taskType, tenantId);

    return { markdown, provider: config.providerType, model: config.modelName };
  } catch (error) {
    console.error(`[DocumentParse] ${config.providerType} failed:`, error);

    // 自动降级：如果 AI 失败且是 PDF，尝试本地解析
    if (config.providerType !== "LOCAL_PDFJS" && mimeType === "application/pdf") {
      console.log("[DocumentParse] Falling back to local pdfjs...");
      try {
        const fallback = await parseWithLocalPdfjs(buffer);
        return { markdown: fallback, provider: "LOCAL_PDFJS", model: "fallback" };
      } catch { /* ignore */ }
    }

    throw error;
  }
}
