import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function normalizeToMarkdown(
  buffer: Buffer,
  format: string
): Promise<string> {
  switch (format) {
    case 'PDF': {
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        const lines: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .filter((item: any) => 'str' in item)
            .map((item: any) => item.str)
            .join(' ');
          if (pageText.trim()) lines.push(pageText.trim());
        }
        return lines.join('\n\n');
      } catch (e) {
        console.warn('[Pipeline] PDF parse failed:', e);
        return '[PDF内容待解析]';
      }
    }
    case 'WORD': {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (e) {
        return buffer.toString('utf-8');
      }
    }
    case 'AUDIO':
    case 'VIDEO': {
      return '[音视频转写功能需要对接专用 ASR 服务（如阿里云语音识别），当前环境不支持]';
    }
    default:
      return buffer.toString('utf-8');
  }
}

export async function chunkMarkdown(markdown: string): Promise<string[]> {
  const sections = markdown.split(/\n(?=#{1,3}\s)/);
  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= 800) {
      if (section.trim().length >= 50) chunks.push(section.trim());
    } else {
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

export interface AutoTagResult {
  dimensions: number[];
  layer: 'A' | 'B' | 'C' | 'D';
  primarySlot: string;
  secondarySlots: string[];
  granularity: 'ATOM' | 'MODULE' | 'PACK';
}

export async function autoTag(chunk: string): Promise<AutoTagResult> {
  try {
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
- A层=公司认知(维度1-10)，B层=业务技能(11-20)，C层=风格红线(21-25)，D层=系统合规(26-30)
- S0=目标 S1=角色 S2=输入规范 S3=预检 S4=红线 S5=流程 S6=路由 S7=输出 S8=质检 S9=评分卡 S10=工具箱`;

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
  } catch (e) {
    console.error('[AutoTag] Error:', e);
    return {
      dimensions: [1],
      layer: 'A',
      primarySlot: 'S0',
      secondarySlots: [],
      granularity: 'ATOM',
    };
  }
}