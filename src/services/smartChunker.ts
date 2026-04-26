// src/services/smartChunker.ts

import { callLLM } from '@/server/services/modelGateway';

// ── 三级分类体系常量 ──
const TAXONOMY_TREE = {
  CAT_WHO: {
    label: '身份与受众',
    subcategories: {
      WHO_BRAND: { label: '品牌定位', slots: ['S0', 'S1'], extract: '品牌名称、品牌使命、品牌愿景、品牌故事、品牌调性（高端/亲民/专业/潮流等）、品牌核心价值主张、品牌差异化定位语句' },
      WHO_ROLE: { label: '角色人格', slots: ['S1'], extract: '品牌拟人化人设描述、对外沟通时的人格特质（温暖/权威/幽默/严谨等）、客服/销售人员的角色定义、对话语气要求' },
      WHO_AUDIENCE: { label: '受众画像', slots: ['S0', 'S6'], extract: '目标客户年龄段、性别分布、职业特征、消费能力、核心痛点、购买动机、决策因素、信息获取渠道、典型用户故事' },
      WHO_TERM: { label: '术语规范', slots: ['S4'], extract: '行业专业术语定义、公司内部专用名词、缩写对照表、禁止混用的近义词、标准化表达映射（如"客户"vs"用户"vs"消费者"的使用场景）' },
    },
  },
  CAT_WHAT: {
    label: '产品与卖点',
    subcategories: {
      WHAT_PRODUCT: { label: '产品信息', slots: ['S10'], extract: '产品名称、型号、规格参数、材质成分、生产工艺、适用场景、使用方法、保质期/保修期、SKU 信息、产品线归属' },
      WHAT_USP: { label: '差异卖点', slots: ['S10', 'S5'], extract: '与竞品对比的核心差异点、独家技术/专利、独特设计理念、核心卖点话术（一句话卖点）、价值主张阶梯（功能→情感→社会价值）' },
      WHAT_PRICE: { label: '价格体系', slots: ['S10'], extract: '定价策略、价格区间、折扣规则、会员价/渠道价体系、促销活动价格规则、价格锚点话术、性价比论证逻辑' },
      WHAT_CERT: { label: '权威背书', slots: ['S10', 'S8'], extract: '行业认证（ISO/CE/FDA等）、获奖记录、专利号、检测报告摘要、权威媒体报道引用、专家推荐语、合作机构背书' },
    },
  },
  CAT_HOW: {
    label: '方法与流程',
    subcategories: {
      HOW_SOP: { label: '标准流程', slots: ['S5'], extract: '销售流程标准话术（开场→需求挖掘→方案推荐→异议处理→成交）、客服应答流程、售后处理流程、投诉升级流程、每个步骤的标准动作和话术模板' },
      HOW_METHOD: { label: '方法论', slots: ['S10', 'S5'], extract: '营销方法论框架（FABE/SPIN/AIDA等）、内容创作方法论、用户运营策略框架、增长模型、可复用的策略模板和思维模型' },
      HOW_TACTIC: { label: '技巧策略', slots: ['S5'], extract: '具体可执行的销售技巧、谈判策略、促单话术、朋友圈文案套路、直播间互动技巧、社群激活策略、转化率提升的具体操作手法' },
      HOW_BEST: { label: '最佳实践', slots: ['S10'], extract: '经过验证的成功做法总结、高转化模板、标杆案例中可复制的具体动作、AB测试验证有效的方案、团队沉淀的经验公式' },
    },
  },
  CAT_STYLE: {
    label: '风格与表达',
    subcategories: {
      STYLE_HOOK: { label: '钩子库', slots: ['S10'], extract: '高点击率标题模板、开头吸引注意力的句式、悬念设置技巧、痛点共鸣开场白、数据化钩子（"90%的人不知道..."）、故事型钩子' },
      STYLE_WORD: { label: '词库', slots: ['S10'], extract: '品牌专属高频词汇、感官形容词库、动作动词库、情感词库、行业热词、平台流行词、搜索关键词、违禁词替代表达' },
      STYLE_TONE: { label: '语言风格', slots: ['S7'], extract: '品牌语言风格定义（正式/口语/文艺/种草等）、不同平台的语气调整规则、不同受众的语言适配、禁止的表达方式、推荐的句式结构' },
      STYLE_RHYTHM: { label: '结构节奏', slots: ['S7', 'S10'], extract: '文案结构模板（总分总/递进式/对比式）、段落长度控制规则、信息密度要求、视觉排版节奏（短句穿插长句）、CTA位置和频率' },
    },
  },
  CAT_FENCE: {
    label: '红线与合规',
    subcategories: {
      FENCE_BAN: { label: '禁用清单', slots: ['S4'], extract: '绝对禁止使用的词汇列表、禁止的宣传说法（如"最""第一""国家级"等绝对化用语）、竞品负面对比的禁止条款、敏感话题清单' },
      FENCE_ALLOW: { label: '白名单', slots: ['S4'], extract: '经法务审核通过的可用表述、已授权的客户评价引用、可公开的数据和指标、允许使用的对比维度和方式' },
      FENCE_LAW: { label: '法规合规', slots: ['S4'], extract: '广告法相关条款摘要、行业监管要求、平台发布规范（小红书/抖音/微信各平台规则差异）、产品宣传合规边界、医疗/食品/金融等特殊行业声明要求' },
      FENCE_BLUR: { label: '模糊处理', slots: ['S4'], extract: '不确定信息的安全表述方式（"据了解""部分用户反馈"等）、敏感数据的脱敏规则、未经验证信息的免责表达、争议性话题的中性化处理模板' },
    },
  },
  CAT_PROOF: {
    label: '证据与案例',
    subcategories: {
      PROOF_CASE: { label: '成功案例', slots: ['S10', 'S8'], extract: '完整客户案例（背景→挑战→方案→结果→客户评价）、标杆项目详情、使用前后对比、ROI 数据、客户证言原文' },
      PROOF_DATA: { label: '数据报告', slots: ['S10', 'S8'], extract: '市场调研数据、产品检测数据、用户满意度数据、行业报告引用、增长数据（用户量/销售额/市场份额）、可视化图表描述' },
      PROOF_FAIL: { label: '反面教训', slots: ['S8'], extract: '失败案例复盘（做了什么→为什么失败→教训总结）、常见错误清单、踩坑记录、用户投诉高频原因分析、竞品失败案例启示' },
      PROOF_COMPARE: { label: '对比分析', slots: ['S10'], extract: '竞品对比矩阵（功能/价格/服务/口碑等维度）、新旧方案对比、不同材料/工艺/方案的优劣分析、替代品评估、技术路线对比' },
    },
  },
};

// ── 切块 Prompt ──
const SMART_CHUNK_SYSTEM_PROMPT = `你是企业知识库的「智能切块引擎」。你的任务是将一篇完整的企业资料文档，按语义完整性切分为多个「知识原子块」，并为每个块精确匹配三级分类标签。

## 你必须遵守的切块原则

### 切块粒度
- 每个原子块应当是一个**语义完整的最小知识单元**：能独立被理解、被检索、被引用
- 目标字数：200~1500 字/块。过短（<100字）的碎片要向上合并，过长（>2000字）的段落要拆分
- 如果一个段落同时包含两个不同子分类的内容（如既有「产品信息」又有「差异卖点」），必须拆成两个块
- 表格、列表等结构化内容保持完整，不要从中间切断

### 切块边界判定
- 优先按文档的标题层级（H1/H2/H3）作为自然分界
- 同一标题下如果内容跨越多个子分类，按子分类语义边界拆分
- 引言、目录、致谢、免责声明等非知识性内容标记为 "SKIP" 不生成块

### 三级分类体系（严格按第三级匹配）

一级：ContentCategory（6大类）
二级：已内含在一级中（每大类4个子类，共24个）
三级：ContentSubCategory（精确到第三级）

以下是24个第三级子分类，以及每个子分类需要你「提取/总结」的具体内容：

**CAT_WHO 身份与受众**
- WHO_BRAND 品牌定位：提取品牌名称、使命、愿景、品牌故事、调性定位、核心价值主张、差异化定位语句
- WHO_ROLE 角色人格：提取品牌拟人化人设、沟通人格特质、客服/销售角色定义、对话语气要求
- WHO_AUDIENCE 受众画像：提取目标客户年龄/性别/职业/消费力、核心痛点、购买动机、决策因素
- WHO_TERM 术语规范：提取专业术语定义、内部专用名词、缩写对照、禁止混用的近义词

**CAT_WHAT 产品与卖点**
- WHAT_PRODUCT 产品信息：提取产品名/型号/规格/材质/工艺/适用场景/使用方法/SKU
- WHAT_USP 差异卖点：提取与竞品核心差异、独家技术/专利、一句话卖点、价值阶梯
- WHAT_PRICE 价格体系：提取定价策略、价格区间、折扣规则、会员价体系、性价比论证
- WHAT_CERT 权威背书：提取认证（ISO/CE等）、获奖记录、专利号、检测报告、专家推荐

**CAT_HOW 方法与流程**
- HOW_SOP 标准流程：提取销售话术流程、客服应答流程、售后处理流程、每步标准动作
- HOW_METHOD 方法论：提取营销框架（FABE/SPIN等）、内容创作方法论、策略模板
- HOW_TACTIC 技巧策略：提取具体可执行的销售技巧、谈判策略、促单话术、转化手法
- HOW_BEST 最佳实践：提取经验证的成功做法、高转化模板、标杆案例可复制动作

**CAT_STYLE 风格与表达**
- STYLE_HOOK 钩子库：提取高点击标题模板、悬念句式、痛点开场白、数据化钩子
- STYLE_WORD 词库：提取品牌高频词、感官形容词、动作动词、情感词、违禁词替代
- STYLE_TONE 语言风格：提取品牌语言风格定义、不同平台语气规则、禁止的表达方式
- STYLE_RHYTHM 结构节奏：提取文案结构模板、段落长度规则、CTA位置和频率

**CAT_FENCE 红线与合规**
- FENCE_BAN 禁用清单：提取禁止词汇列表、禁止宣传说法、竞品负面对比禁令
- FENCE_ALLOW 白名单：提取经审核通过的可用表述、已授权引用、可公开数据
- FENCE_LAW 法规合规：提取广告法条款、行业监管要求、各平台发布规范
- FENCE_BLUR 模糊处理：提取不确定信息安全表述、敏感数据脱敏规则、免责表达

**CAT_PROOF 证据与案例**
- PROOF_CASE 成功案例：提取完整案例（背景→挑战→方案→结果→评价）、标杆项目
- PROOF_DATA 数据报告：提取市场调研数据、检测数据、满意度、行业报告引用
- PROOF_FAIL 反面教训：提取失败复盘、常见错误、踩坑记录、投诉高频原因
- PROOF_COMPARE 对比分析：提取竞品对比矩阵、新旧方案对比、替代品评估

## 输出要求
严格按 JSON 数组格式返回，不要输出任何其他文字：`;

const SMART_CHUNK_USER_TEMPLATE = `请对以下企业资料文档进行智能切块和三级分类。

文档类型：{materialType}
经验来源：{experienceSource}

文档内容：
"""
{content}
"""

请输出 JSON 数组，每个元素代表一个原子块：
[
  {
    "chunkIndex": 1,
    "title": "该块的简短标题（≤30字）",
    "content": "该块的完整原文内容（从文档中精确截取，保持原文不改动）",
    "summary": "该块的核心要点摘要（50~100字，用于快速预览）",
    "category": "CAT_WHO | CAT_WHAT | CAT_HOW | CAT_STYLE | CAT_FENCE | CAT_PROOF",
    "subcategory": "第三级子分类枚举值，如 WHO_BRAND / WHAT_USP / HOW_SOP 等",
    "confidence": 0.95,
    "reason": "为什么归入此子分类的一句话理由",
    "secondarySubcategory": "如果内容跨两个子分类，填第二分类；否则为 null",
    "qualityFlags": {
      "isComplete": true,
      "hasConcrete": true,
      "needsReview": false
    }
  }
]

注意：
- content 字段必须是文档原文的精确截取，不要改写或总结
- 如果某段内容是目录、引言寒暄、免责声明等非知识性内容，设置 category 为 "SKIP"
- confidence < 0.7 的块设置 qualityFlags.needsReview = true
- 一个文档通常切出 5~30 个块，视文档长度而定`;

export interface SmartChunkConfig {
  modelName?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SmartChunk {
  chunkIndex: number;
  title: string;
  content: string;
  summary: string;
  category: string;
  subcategory: string;
  confidence: number;
  reason: string;
  secondarySubcategory: string | null;
  qualityFlags: {
    isComplete: boolean;
    hasConcrete: boolean;
    needsReview: boolean;
  };
}

export interface SmartChunkResult {
  chunks: SmartChunk[];
  skippedCount: number;
  totalChunks: number;
  avgConfidence: number;
}

/**
 * LLM 智能切块：一次调用同时完成「切在哪」和「分到哪类」
 * 对于超长文档（>8000字），自动分段调用后合并
 */
export async function smartChunkMarkdown(
  markdown: string,
  materialType: string,
  experienceSource: string,
  config?: SmartChunkConfig
): Promise<SmartChunkResult> {
  const {
    modelName,
    maxTokens = 8000,
    temperature = 0.2,
  } = config || {};

  // 超长文档分段处理
  const MAX_INPUT_LENGTH = 12000; // 约 4000 token
  const segments = splitForLLM(markdown, MAX_INPUT_LENGTH);

  const allChunks: SmartChunk[] = [];
  let globalIndex = 0;

  for (const segment of segments) {
    const userPrompt = SMART_CHUNK_USER_TEMPLATE
      .replace('{materialType}', materialType)
      .replace('{experienceSource}', experienceSource)
      .replace('{content}', segment);

    const result = await callLLM(
      'chunking',
      SMART_CHUNK_SYSTEM_PROMPT,
      userPrompt,
      {
        maxTokens,
        temperature,
        ...(modelName ? { model: modelName } : {}),
      }
    );

    try {
      const parsed = JSON.parse(result.content);
      if (Array.isArray(parsed)) {
        for (const chunk of parsed) {
          globalIndex++;
          allChunks.push({ ...chunk, chunkIndex: globalIndex });
        }
      }
    } catch (e) {
      console.error('[smartChunker] JSON parse error:', e);
      // 解析失败时，将整段作为一个块
      globalIndex++;
      allChunks.push({
        chunkIndex: globalIndex,
        title: `段落 ${globalIndex}`,
        content: segment,
        summary: segment.slice(0, 100),
        category: 'CAT_WHAT',
        subcategory: 'WHAT_PRODUCT',
        confidence: 0.3,
        reason: 'LLM 解析失败，降级为整段',
        secondarySubcategory: null,
        qualityFlags: { isComplete: false, hasConcrete: false, needsReview: true },
      });
    }
  }

  // 过滤 SKIP 类型
  const validChunks = allChunks.filter(c => c.category !== 'SKIP');
  const skippedCount = allChunks.length - validChunks.length;
  const avgConfidence = validChunks.length > 0
    ? validChunks.reduce((sum, c) => sum + (c.confidence || 0), 0) / validChunks.length
    : 0;

  return {
    chunks: validChunks,
    skippedCount,
    totalChunks: validChunks.length,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
  };
}

/**
 * 将超长文档按标题边界分段，每段不超过 maxLength 字符
 */
function splitForLLM(markdown: string, maxLength: number): string[] {
  if (markdown.length <= maxLength) return [markdown];

  const sections = markdown.split(/\n(?=#{1,3}\s)/);
  const segments: string[] = [];
  let current = '';

  for (const section of sections) {
    if ((current + section).length > maxLength && current.length > 0) {
      segments.push(current.trim());
      current = section;
    } else {
      current += (current ? '\n' : '') + section;
    }
  }
  if (current.trim()) segments.push(current.trim());

  return segments;
}
