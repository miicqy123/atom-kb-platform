// src/services/pipelineService.ts
import OpenAI from 'openai';
import mammoth from 'mammoth';

const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || 'sk-3129db2ab6184ea091184e9c7da5cc1c',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// ── Station 1: 格式归一 ───────────────────────────────────────────
export async function normalizeToMarkdown(
  buffer: Buffer,
  format: string
): Promise<string> {
  switch (format) {
    case 'PDF': {
      // Placeholder implementation until we fix the PDF parsing issue
      return "PDF content extraction temporarily unavailable";
    }
    case 'WORD': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case 'AUDIO':
    case 'VIDEO': {
      // For audio/video, we'll use a File API-compatible approach with proper type handling
      const uint8Array = new Uint8Array(buffer);
      const blob = new Blob([uint8Array], { type: `audio/${format.toLowerCase()}` });
      const file = new File([blob], `audio.${format.toLowerCase()}`, { type: `audio/${format.toLowerCase()}` });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'zh',
      });
      return transcription.text;
    }
    default:
      return buffer.toString('utf-8');
  }
}

// ── Station 2: 智能切块 ───────────────────────────────────────────
export async function chunkMarkdown(markdown: string): Promise<string[]> {
  // 按标题层级切块，最大 800 字
  const sections = markdown.split(/\n(?=#{1,3}\s)/);
  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= 800) {
      if (section.trim().length >= 50) chunks.push(section.trim());
    } else {
      // 超长段落按句子拆分
      const sentences = section.split(/(?<=。|！|？|\n\n)/);
      let current = '';
      for (const s of sentences) {
        if ((current + s).length > 800) {
          if (current.trim().length >= 50) chunks.push(current.trim());
          current = s;
        } else {
          current += s;
        }
      }
      if (current.trim().length >= 50) chunks.push(current.trim());
    }
  }
  return chunks;
}

// ── Station 3: 自动打标 ───────────────────────────────────────────
export interface AutoTagResult {
  dimensions: number[];
  layer: 'A' | 'B' | 'C' | 'D';
  primarySlot: string;
  secondarySlots: string[];
  granularity: 'ATOM' | 'MODULE' | 'PACK';
}

export async function autoTag(chunk: string): Promise<AutoTagResult> {
  const prompt = `你是知识库标注专家。分析下面的文本块，按JSON格式返回标注结果。

文本块：
"""
${chunk.slice(0, 1500)}
"""

返回格式（严格JSON，无其他内容）：
{
  "dimensions": [维度编号数组，从1-30中选，可多选],
  "layer": "A或B或C或D",
  "primarySlot": "主槽位，如S4.2",
  "secondarySlots": ["副槽位数组"],
  "granularity": "ATOM或MODULE或PACK"
}

规则：
- A层=公司认知(维度1-10)，B层=业务技能(11-20)，C层=风格红线，D层=系统合规
- S0=目标 S1=角色 S2=输入规范 S3=预检 S4=红线 S5=流程 S6=路由 S7=输出 S8=质检 S9=评分卡 S10=工具箱
- 包含"禁止/不得/严禁"→C层+S4；包含"步骤/流程/如何"→B层+S5；包含"公司/产品/介绍"→A层+S0/S1`;

  const response = await openai.chat.completions.create({
    model: 'qwen-turbo',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return {
    dimensions: result.dimensions || [1],
    layer: result.layer || 'A',
    primarySlot: result.primarySlot || 'S0',
    secondarySlots: result.secondarySlots || [],
    granularity: result.granularity || 'ATOM',
  };
}