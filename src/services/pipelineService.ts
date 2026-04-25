import OpenAI from 'openai';
import { z } from 'zod';
import { ContentCategory, ContentSubCategory } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// ━━━ 内容分类常量映射表 ━━━
const CATEGORY_SUBCATEGORY_MAP: Record<ContentCategory, ContentSubCategory[]> = {
  CAT_WHO:   ['WHO_BRAND', 'WHO_ROLE', 'WHO_AUDIENCE', 'WHO_TERM'] as ContentSubCategory[],
  CAT_WHAT:  ['WHAT_PRODUCT', 'WHAT_USP', 'WHAT_PRICE', 'WHAT_CERT'] as ContentSubCategory[],
  CAT_HOW:   ['HOW_SOP', 'HOW_METHOD', 'HOW_TACTIC', 'HOW_BEST'] as ContentSubCategory[],
  CAT_STYLE: ['STYLE_HOOK', 'STYLE_WORD', 'STYLE_TONE', 'STYLE_RHYTHM'] as ContentSubCategory[],
  CAT_FENCE: ['FENCE_BAN', 'FENCE_ALLOW', 'FENCE_LAW', 'FENCE_BLUR'] as ContentSubCategory[],
  CAT_PROOF: ['PROOF_CASE', 'PROOF_DATA', 'PROOF_FAIL', 'PROOF_COMPARE'] as ContentSubCategory[],
};

const SUBCATEGORY_SLOT_MAP: Record<ContentSubCategory, string[]> = {
  WHO_BRAND:     ['S0', 'S1'],
  WHO_ROLE:      ['S1'],
  WHO_AUDIENCE:  ['S0', 'S6'],
  WHO_TERM:      ['S4'],
  WHAT_PRODUCT:  ['S10'],
  WHAT_USP:      ['S10', 'S5'],
  WHAT_PRICE:    ['S10'],
  WHAT_CERT:     ['S10', 'S8'],
  HOW_SOP:       ['S5'],
  HOW_METHOD:    ['S10', 'S5'],
  HOW_TACTIC:    ['S5'],
  HOW_BEST:      ['S10'],
  STYLE_HOOK:    ['S10'],
  STYLE_WORD:    ['S10'],
  STYLE_TONE:    ['S7'],
  STYLE_RHYTHM:  ['S7', 'S10'],
  FENCE_BAN:     ['S4'],
  FENCE_ALLOW:   ['S4'],
  FENCE_LAW:     ['S4'],
  FENCE_BLUR:    ['S4'],
  PROOF_CASE:    ['S10', 'S8'],
  PROOF_DATA:    ['S10', 'S8'],
  PROOF_FAIL:    ['S8'],
  PROOF_COMPARE: ['S10'],
} as Record<ContentSubCategory, string[]>;

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
  category: ContentCategory | null;
  subcategory: ContentSubCategory | null;
}

export async function autoTag(chunk: string): Promise<AutoTagResult> {
  try {
    // ━━━ 保留现有的 layer / granularity / dimensions 推断逻辑 ━━━
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
    const dimensions: number[] = result.dimensions || [1];
    const layer = result.layer || 'A';
    const granularity = result.granularity || 'ATOM';

    // ━━━ 新增：内容分类推断 ━━━
    const { category, subcategory } = await classifyContent(chunk);

    // 基于子类别得到精确槽位映射（覆盖旧逻辑）
    let primarySlot: string;
    let secondarySlots: string[];
    if (subcategory && SUBCATEGORY_SLOT_MAP[subcategory]) {
      const slots = SUBCATEGORY_SLOT_MAP[subcategory];
      primarySlot = slots[0];
      secondarySlots = slots.slice(1);
    } else {
      primarySlot = result.primarySlot || 'S0';
      secondarySlots = result.secondarySlots || [];
    }

    return {
      dimensions,
      layer,
      primarySlot,
      secondarySlots,
      granularity,
      category: category ?? null,
      subcategory: subcategory ?? null,
    };
  } catch (e) {
    console.error('[AutoTag] Error:', e);
    return {
      dimensions: [1],
      layer: 'A',
      primarySlot: 'S0',
      secondarySlots: [],
      granularity: 'ATOM',
      category: null,
      subcategory: null,
    };
  }
}

// ━━━ 新增：LLM 内容分类 ━━━
async function classifyContent(chunk: string): Promise<{
  category: ContentCategory | null;
  subcategory: ContentSubCategory | null;
}> {
  // 方案 A：LLM 推断
  try {
    const { callLLMJson } = await import('@/server/services/modelGateway');

    const systemPrompt = '你是内容分类专家。请将内容归入唯一的类别和子类别。只返回JSON，不要其他文字。';
    const userPrompt = `类别选项（只选一个）：
- CAT_WHO：身份与受众（品牌定位、角色人格、受众画像、术语规范）
- CAT_WHAT：产品与卖点（产品信息、差异卖点、价格体系、权威背书）
- CAT_HOW：方法与流程（标准SOP、方法论框架、技巧策略、最佳实践）
- CAT_STYLE：风格与表达（钩子库、词库、语言风格、结构节奏）
- CAT_FENCE：红线与合规（禁用清单、可用白名单、法规合规、模糊处理）
- CAT_PROOF：证据与案例（成功案例、数据报告、反面教训、对比分析）

子类别选项见括号内。

内容：
${chunk.slice(0, 2000)}

请严格按 JSON 返回：{"category": "CAT_XXX", "subcategory": "XXX_YYY"}`;

    const { data } = await callLLMJson(
      'extraction',
      systemPrompt,
      userPrompt,
      z.object({ category: z.string(), subcategory: z.string() })
    );

    // 校验：subcategory 必须属于 category
    if (data.category && data.subcategory) {
      const valid = CATEGORY_SUBCATEGORY_MAP[data.category as ContentCategory];
      if (valid?.includes(data.subcategory as ContentSubCategory)) {
        return {
          category: data.category as ContentCategory,
          subcategory: data.subcategory as ContentSubCategory,
        };
      }
    }

    return { category: (data.category as ContentCategory) ?? null, subcategory: null };
  } catch {
    // 方案 B：关键词规则降级
    return classifyByKeywords(chunk);
  }
}

/**
 * 关键词规则引擎（LLM 降级方案）
 */
function classifyByKeywords(chunk: string): {
  category: ContentCategory | null;
  subcategory: ContentSubCategory | null;
} {
  const text = chunk.toLowerCase();

  const rules: Array<{
    keywords: string[];
    category: ContentCategory;
    subcategory: ContentSubCategory;
  }> = [
    { keywords: ['禁止', '禁用', '不得', '严禁', '不可以'],
      category: 'CAT_FENCE' as ContentCategory, subcategory: 'FENCE_BAN' as ContentSubCategory },
    { keywords: ['合规', '法规', '平台规则', '监管'],
      category: 'CAT_FENCE' as ContentCategory, subcategory: 'FENCE_LAW' as ContentSubCategory },
    { keywords: ['案例', '客户', '证言', '效果'],
      category: 'CAT_PROOF' as ContentCategory, subcategory: 'PROOF_CASE' as ContentSubCategory },
    { keywords: ['数据', '报告', '检测', '统计'],
      category: 'CAT_PROOF' as ContentCategory, subcategory: 'PROOF_DATA' as ContentSubCategory },
    { keywords: ['SOP', '流程', '步骤', '操作'],
      category: 'CAT_HOW' as ContentCategory, subcategory: 'HOW_SOP' as ContentSubCategory },
    { keywords: ['方法论', '框架', '模型', '原则'],
      category: 'CAT_HOW' as ContentCategory, subcategory: 'HOW_METHOD' as ContentSubCategory },
    { keywords: ['话术', '异议', '转化', '技巧'],
      category: 'CAT_HOW' as ContentCategory, subcategory: 'HOW_TACTIC' as ContentSubCategory },
    { keywords: ['产品', '规格', '功能', '特性'],
      category: 'CAT_WHAT' as ContentCategory, subcategory: 'WHAT_PRODUCT' as ContentSubCategory },
    { keywords: ['卖点', '优势', '差异', 'USP'],
      category: 'CAT_WHAT' as ContentCategory, subcategory: 'WHAT_USP' as ContentSubCategory },
    { keywords: ['钩子', '开头', '你敢相信', '震惊'],
      category: 'CAT_STYLE' as ContentCategory, subcategory: 'STYLE_HOOK' as ContentSubCategory },
    { keywords: ['关键词', '痛点词', '情感词', '行业词'],
      category: 'CAT_STYLE' as ContentCategory, subcategory: 'STYLE_WORD' as ContentSubCategory },
    { keywords: ['品牌', '定位', '价值观', '使命'],
      category: 'CAT_WHO' as ContentCategory, subcategory: 'WHO_BRAND' as ContentSubCategory },
    { keywords: ['受众', '画像', '目标人群', '客户群'],
      category: 'CAT_WHO' as ContentCategory, subcategory: 'WHO_AUDIENCE' as ContentSubCategory },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      return { category: rule.category, subcategory: rule.subcategory };
    }
  }

  return { category: null, subcategory: null };
}