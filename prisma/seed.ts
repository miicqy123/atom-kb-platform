import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 创建初始租户
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {
      name: 'Default Tenant',
      industry: 'Technology',
      contactName: 'Admin',
      contactEmail: 'admin@example.com',
      status: 'active',
    },
    create: {
      id: 'default-tenant',
      name: 'Default Tenant',
      industry: 'Technology',
      contactName: 'Admin',
      contactEmail: 'admin@example.com',
      status: 'active',
    },
  });

  // 统一生成管理员密码 hash
  const adminPasswordHash = await bcrypt.hash('password123', 10);

  // 创建或更新初始管理员用户
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
      status: 'active',
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
      status: 'active',
    },
  });

  // 创建初始工作空间
  const workspace = await prisma.workspace.upsert({
    where: { id: 'default-workspace' },
    update: {
      name: 'Default Workspace',
      tenantId: tenant.id,
      ownerId: adminUser.id,
      visibility: 'TEAM',
    },
    create: {
      id: 'default-workspace',
      name: 'Default Workspace',
      tenantId: tenant.id,
      ownerId: adminUser.id,
      visibility: 'TEAM',
    },
  });

  // 为管理员添加工作空间成员资格
  await prisma.workspaceUser.upsert({
    where: {
      userId_workspaceId: {
        userId: adminUser.id,
        workspaceId: workspace.id,
      },
    },
    update: {
      role: 'TENANT_ADMIN',
    },
    create: {
      userId: adminUser.id,
      workspaceId: workspace.id,
      role: 'TENANT_ADMIN',
    },
  });

  // 创建初始项目
  await prisma.project.upsert({
    where: { id: 'default-project' },
    update: {
      name: 'Default Project',
      workspaceId: workspace.id,
      ownerId: adminUser.id,
    },
    create: {
      id: 'default-project',
      name: 'Default Project',
      workspaceId: workspace.id,
      ownerId: adminUser.id,
    },
  });

  // 创建默认模型配置
  const modelDefs = [
    // ━━━ 原有场景（更新 fallbackModel） ━━━
    { scene: "routing",          defaultModel: "qwen-turbo",    fallbackModel: "qwen-plus",   temperature: 0.3  },
    { scene: "pre_check",        defaultModel: "qwen-turbo",    fallbackModel: null,           temperature: 0.3  },
    { scene: "main_creative",    defaultModel: "qwen-max",      fallbackModel: "qwen-plus",   temperature: 0.75 },
    { scene: "main_analytical",  defaultModel: "qwen-plus",     fallbackModel: "qwen-turbo",  temperature: 0.3  },
    { scene: "script",           defaultModel: "qwen-plus",     fallbackModel: null,           temperature: 0.5  },
    { scene: "evaluation",       defaultModel: "qwen-plus",     fallbackModel: null,           temperature: 0.2  },
    { scene: "planner",          defaultModel: "qwen-plus",     fallbackModel: null,           temperature: 0.3  },
    // ━━━ 视觉/解析场景 ━━━
    { scene: "pdf_conversion",   defaultModel: "qwen-vl-ocr",   fallbackModel: null,           temperature: 0.1  },
    { scene: "image_understand", defaultModel: "qwen-vl-plus",  fallbackModel: "qwen-vl-ocr", temperature: 0.2  },
    // ━━━ 原有场景（新增 fallbackModel） ━━━
    { scene: "extraction",       defaultModel: "qwen-plus",     fallbackModel: "qwen-turbo",  temperature: 0.3  },
    { scene: "optimization",     defaultModel: "qwen-max",      fallbackModel: "qwen-plus",   temperature: 0.4  },
    { scene: "clone",            defaultModel: "qwen-plus",     fallbackModel: null,           temperature: 0.4  },
    // ━━━ 加工工序场景 ━━━
    { scene: "classification",   defaultModel: "qwen-plus",     fallbackModel: null,           temperature: 0.0  },
    { scene: "tagging",          defaultModel: "qwen-plus",     fallbackModel: null,           temperature: 0.0  },
    { scene: "chunking",         defaultModel: "qwen-plus",     fallbackModel: null,           temperature: 0.2  },
    { scene: "qa_generation",    defaultModel: "qwen-plus",     fallbackModel: null,           temperature: 0.3  },
  ];

  for (const m of modelDefs) {
    await prisma.modelConfig.upsert({
      where: {
        scene_tenantId: { scene: m.scene, tenantId: tenant.id },
      },
      update: {
        defaultModel: m.defaultModel,
        fallbackModel: m.fallbackModel,
        temperature: m.temperature,
      },
      create: {
        scene: m.scene,
        tenantId: tenant.id,
        defaultModel: m.defaultModel,
        fallbackModel: m.fallbackModel,
        temperature: m.temperature,
      },
    });
  }

  console.log(`Model configs seeded: ${modelDefs.length}`);
  console.log(`Admin user created/updated: ${adminUser.email}`);
  console.log(`Admin password reset to: password123`);
  console.log(`Workspace created/updated: ${workspace.id}`);

  // ════════════════════════════════════════════
  // P6.14 示例数据
  // ════════════════════════════════════════════
  const DEMO_RAW_TITLES = [
    '无醛客卧室系列 RAG数据集',
    'LQ-5.0 一键榨干万字长文→秒变视频选题 Pro版',
    '万华灵荃三段论口播文案润色专家 V1.3 Pro版',
    '生成式内容策略师与视觉概念师 v2.0 Pro版',
  ];
  const demoRawRows = await prisma.raw.findMany({
    where: {
      projectId: 'default-project',
      title: { in: DEMO_RAW_TITLES },
    },
    select: { id: true },
  });
  const demoRawIds = demoRawRows.map((raw) => raw.id);
  if (demoRawIds.length > 0) {
    await prisma.qAPair.deleteMany({ where: { rawId: { in: demoRawIds } } });
    await prisma.atom.deleteMany({ where: { rawId: { in: demoRawIds } } });
    await prisma.raw.deleteMany({ where: { id: { in: demoRawIds } } });
    console.log(`🗑️  已清理旧 demo 数据：Raw ${demoRawIds.length} 条`);
  } else {
    console.log('🗑️  未发现旧 demo 数据，跳过清理');
  }

  const raw1 = await prisma.raw.create({
    data: {
      projectId: 'default-project', title: '无醛客卧室系列 RAG数据集', originalFileName: '无醛客卧室系列RAG数据集.docx',
      fileSize: 156000, format: 'WORD', materialType: 'PRODUCT_DOC', experienceSource: 'E1_COMPANY',
      conversionStatus: 'CONVERTED', atomPipelineStatus: 'done', qaPipelineStatus: 'done',
      markdownContent: '# 无醛客卧室系列\n\n## WH5201\n6.8KG/¥450，无机矿物涂料面漆，0级防霉、A2级防火。\n\n## WHBM3201\n20KG/¥68，N型防水腻子，泡水24h不起皮。',
    },
  });
  const a1 = await Promise.all([
    prisma.atom.create({ data: { rawId: raw1.id, projectId: 'default-project', title: 'WH5201 产品信息', content: '万华灵荃无机全效水性墙漆（WH5201），6.8KG/¥450，无机矿物涂料面漆，0级防霉、A2级防火、高遮盖力。', layer: 'B', granularity: 'ATOM', experienceSource: 'E1_COMPANY', category: 'CAT_WHAT', subcategory: 'WHAT_PRODUCT', slotMappings: ['S10'], wordCount: 50 } }),
    prisma.atom.create({ data: { rawId: raw1.id, projectId: 'default-project', title: 'WH5201 环保认证', content: 'WH5201通过SGS检测、法国A+认证、十环认证，甲醛超标十倍赔偿。', layer: 'B', granularity: 'ATOM', experienceSource: 'E1_COMPANY', category: 'CAT_WHAT', subcategory: 'WHAT_CERT', slotMappings: ['S8'], wordCount: 30 } }),
    prisma.atom.create({ data: { rawId: raw1.id, projectId: 'default-project', title: 'WHBM3201 产品信息', content: '无醛防水腻子粉WHBM3201，20KG/¥68，N型耐水标准，泡水24h不起皮。', layer: 'B', granularity: 'ATOM', experienceSource: 'E1_COMPANY', category: 'CAT_WHAT', subcategory: 'WHAT_PRODUCT', slotMappings: ['S10'], wordCount: 35 } }),
    prisma.atom.create({ data: { rawId: raw1.id, projectId: 'default-project', title: '无机涂料防霉防火机理', content: '0级防霉和A2级防火来自无机本质——不含有机物，霉菌无食物，无机物不可燃。有机乳胶漆+防霉剂2-3年衰减。', layer: 'B', granularity: 'ATOM', experienceSource: 'E1_COMPANY', category: 'CAT_WHAT', subcategory: 'WHAT_USP', slotMappings: ['S10', 'S5'], wordCount: 50 } }),
    prisma.atom.create({ data: { rawId: raw1.id, projectId: 'default-project', title: '产品选型指南', content: '干燥客卧→中性腻子+净味墙漆；潮湿→防水腻子+无机墙漆；高端→防水腻子+净芯墙漆。', layer: 'B', granularity: 'ATOM', experienceSource: 'E1_COMPANY', category: 'CAT_HOW', subcategory: 'HOW_SOP', slotMappings: ['S5'], wordCount: 40 } }),
    prisma.atom.create({ data: { rawId: raw1.id, projectId: 'default-project', title: '价格体系', content: 'WH5201 ¥450/6.8KG，100㎡约¥2250。防水腻子¥68/20KG，100㎡约¥1564。', layer: 'B', granularity: 'ATOM', experienceSource: 'E1_COMPANY', category: 'CAT_WHAT', subcategory: 'WHAT_PRICE', slotMappings: ['S10'], wordCount: 35 } }),
  ]);
  await Promise.all([
    prisma.qAPair.create({ data: { rawId: raw1.id, projectId: 'default-project', materialType: 'PRODUCT_DOC', question: 'WH5201是什么？', answer: '万华灵荃无机全效水性墙漆，6.8KG/¥450，0级防霉、A2级防火。', difficulty: 'BEGINNER', tags: ['WH5201'], scenarios: ['选材'], questionKeywords: ['WH5201'], answerWordCount: 25 } }),
    prisma.qAPair.create({ data: { rawId: raw1.id, projectId: 'default-project', materialType: 'PRODUCT_DOC', question: '防水腻子和中性腻子区别？', answer: '防水WHBM3201(¥68,N型)泡水24h不起皮；中性WHBM3203(¥39,Y型)更顺滑。潮湿用N型。', difficulty: 'INTERMEDIATE', tags: ['腻子对比'], scenarios: ['选型'], questionKeywords: ['防水', '中性', '腻子'], answerWordCount: 35 } }),
    prisma.qAPair.create({ data: { rawId: raw1.id, projectId: 'default-project', materialType: 'PRODUCT_DOC', question: 'WH5201环保认证有哪些？', answer: 'SGS检测、法国A+、十环认证、甲醛超标十倍赔偿。', difficulty: 'BEGINNER', tags: ['环保'], scenarios: ['环保咨询'], questionKeywords: ['环保', '认证'], answerWordCount: 20 } }),
  ]);
  await Promise.all([
    prisma.qAPair.create({ data: { rawId: raw1.id, projectId: 'default-project', materialType: 'PRODUCT_DOC', question: '潮湿区域如何选材？', answer: '潮湿区域推荐防水腻子WHBM3201(¥68,20KG)+无机墙漆WH5201(¥450,6.8KG)。防水腻子泡水24h不起皮，无机墙漆0级防霉A2级防火。', difficulty: 'INTERMEDIATE', tags: ['选材', '潮湿'], scenarios: ['选型'], questionKeywords: ['潮湿', '选材'], answerWordCount: 45 } }),
    prisma.qAPair.create({ data: { rawId: raw1.id, projectId: 'default-project', materialType: 'PRODUCT_DOC', question: '无机涂料和有机乳胶漆在防霉上的区别？', answer: '无机涂料依靠无机本质实现0级防霉——不含有机物，霉菌无食物来源。有机乳胶漆靠防霉剂，2-3年衰减失效。', difficulty: 'EXPERT', tags: ['无机', '防霉', '对比'], scenarios: ['环保咨询'], questionKeywords: ['无机', '有机', '防霉'], answerWordCount: 40 } }),
  ]);
  console.log('✅ Raw 1 QA 完成');

  const raw2 = await prisma.raw.create({
    data: {
      projectId: 'default-project', title: 'LQ-5.0 一键榨干万字长文→秒变视频选题 Pro版', originalFileName: 'LQ-5.0.md',
      fileSize: 42000, format: 'WORD', materialType: 'TRAINING_MATERIAL', experienceSource: 'E3_BOOK',
      conversionStatus: 'CONVERTED', atomPipelineStatus: 'done', qaPipelineStatus: 'done',
      markdownContent: '# 内容策略总监×知识整合专家\n\n2000-3000字→5-10个蓝图。蓝图5部分：核心选题+钩子+结构+知识点+灵感源。',
    },
  });
  await Promise.all([
    prisma.atom.create({ data: { rawId: raw2.id, projectId: 'default-project', title: '内容炼金方法论', content: '长文→A+级爆款视频蓝图：挖掘灵感金块→创意重组→知识整合。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_HOW', subcategory: 'HOW_METHOD', slotMappings: ['S5'], wordCount: 30 } }),
    prisma.atom.create({ data: { rawId: raw2.id, projectId: 'default-project', title: '蓝图5部分SOP', content: 'A核心选题 B黄金钩子 C视频结构 D知识点+案例 E灵感来源。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_HOW', subcategory: 'HOW_SOP', slotMappings: ['S5'], wordCount: 30 } }),
    prisma.atom.create({ data: { rawId: raw2.id, projectId: 'default-project', title: '风格要求', content: '说人话、口语化、雷军式演讲——数据具象化、故事化呈现。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_STYLE', subcategory: 'STYLE_TONE', slotMappings: ['S7'], wordCount: 25 } }),
    prisma.atom.create({ data: { rawId: raw2.id, projectId: 'default-project', title: '内容禁令', content: '禁遗漏信息、禁合并选题、禁AI知识替代、禁捏造数据。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_FENCE', subcategory: 'FENCE_BAN', slotMappings: ['S4'], wordCount: 25 } }),
  ]);
  await Promise.all([
    prisma.qAPair.create({ data: { rawId: raw2.id, projectId: 'default-project', materialType: 'TRAINING_MATERIAL', question: '什么是内容炼金术？', answer: '长文→A+级爆款视频蓝图：挖掘灵感金块→创意重组→知识整合，核心是将2000-3000字文章转化为5-10个视频选题蓝图。', difficulty: 'INTERMEDIATE', tags: ['内容炼金', '方法论'], scenarios: ['内容创作'], questionKeywords: ['内容炼金术'], answerWordCount: 50 } }),
    prisma.qAPair.create({ data: { rawId: raw2.id, projectId: 'default-project', materialType: 'TRAINING_MATERIAL', question: '视频选题蓝图包含哪些部分？', answer: '蓝图包含5部分：A核心选题 B黄金钩子 C视频结构 D知识点+案例 E灵感来源。是将长文转化为视频的核心框架。', difficulty: 'BEGINNER', tags: ['蓝图', 'SOP'], scenarios: ['内容创作'], questionKeywords: ['蓝图', '视频选题'], answerWordCount: 40 } }),
    prisma.qAPair.create({ data: { rawId: raw2.id, projectId: 'default-project', materialType: 'TRAINING_MATERIAL', question: '内容创作风格有什么要求？', answer: '要求说人话、口语化、雷军式演讲——数据要具象化、故事化呈现，让观众听得懂、记得住。', difficulty: 'BEGINNER', tags: ['风格', '口语化'], scenarios: ['内容优化'], questionKeywords: ['风格', '演讲'], answerWordCount: 35 } }),
  ]);
  console.log('✅ Raw 2 QA 完成');

  const raw3 = await prisma.raw.create({
    data: {
      projectId: 'default-project', title: '万华灵荃三段论口播文案润色专家 V1.3 Pro版', originalFileName: '三段论口播.md',
      fileSize: 38000, format: 'WORD', materialType: 'TRAINING_MATERIAL', experienceSource: 'E3_BOOK',
      conversionStatus: 'CONVERTED', atomPipelineStatus: 'done', qaPipelineStatus: 'done',
      markdownContent: '# 三段论口播\n\n痛点开场15%→卖点展示70%→行动引导15%。开头十式：提问/调查/权威/反常识/数据/对比/共鸣/悬念/代入/揭秘。',
    },
  });
  await Promise.all([
    prisma.atom.create({ data: { rawId: raw3.id, projectId: 'default-project', title: '三段论结构', content: '痛点开场15%→卖点展示70%(利益40%+数据30%+场景20%+背书10%)→行动引导15%。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_HOW', subcategory: 'HOW_METHOD', slotMappings: ['S5'], wordCount: 35 } }),
    prisma.atom.create({ data: { rawId: raw3.id, projectId: 'default-project', title: '开头十式', content: '1.提问 2.调查 3.权威 4.反常识 5.数据震惊 6.对比冲突 7.痛点共鸣 8.倒叙悬念 9.身份代入 10.打假揭秘', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_STYLE', subcategory: 'STYLE_HOOK', slotMappings: ['S10'], wordCount: 40 } }),
    prisma.atom.create({ data: { rawId: raw3.id, projectId: 'default-project', title: '品牌融入技巧', content: '品牌像"佐料"融入菜里：类比/代入/归因/对比/口语化。禁括号标注。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_HOW', subcategory: 'HOW_TACTIC', slotMappings: ['S5'], wordCount: 30 } }),
    prisma.atom.create({ data: { rawId: raw3.id, projectId: 'default-project', title: '卖点矩阵', content: '客卧室：无醛防潮施工高效。B端省工、C端健康。厨卫：防水防霉。B端不空鼓、C端不漏水。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_WHAT', subcategory: 'WHAT_USP', slotMappings: ['S10'], wordCount: 40 } }),
    prisma.atom.create({ data: { rawId: raw3.id, projectId: 'default-project', title: '口播红线', content: '禁假数据、禁夸大、禁贬竞品、禁广告法红线词、禁中段企业背景、禁括号标品牌。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_FENCE', subcategory: 'FENCE_BAN', slotMappings: ['S4'], wordCount: 30 } }),
  ]);
  await Promise.all([
    prisma.qAPair.create({ data: { rawId: raw3.id, projectId: 'default-project', materialType: 'TRAINING_MATERIAL', question: '三段论口播结构是怎样的？', answer: '痛点开场15%→卖点展示70%(利益40%+数据30%+场景20%+背书10%)→行动引导15%。这是高转化口播框架。', difficulty: 'INTERMEDIATE', tags: ['三段论', '结构'], scenarios: ['口播创作'], questionKeywords: ['三段论', '口播结构'], answerWordCount: 40 } }),
    prisma.qAPair.create({ data: { rawId: raw3.id, projectId: 'default-project', materialType: 'TRAINING_MATERIAL', question: '开场有哪些吸引人的方式？', answer: '开头十式：1.提问 2.调查 3.权威 4.反常识 5.数据震惊 6.对比冲突 7.痛点共鸣 8.倒叙悬念 9.身份代入 10.打假揭秘', difficulty: 'BEGINNER', tags: ['开场', '钩子'], scenarios: ['口播创作'], questionKeywords: ['开场', '开头十式'], answerWordCount: 40 } }),
    prisma.qAPair.create({ data: { rawId: raw3.id, projectId: 'default-project', materialType: 'TRAINING_MATERIAL', question: '品牌融入有哪些技巧？', answer: '品牌像"佐料"融入菜里：类比/代入/归因/对比/口语化。禁止括号标注品牌名，要自然融入内容。', difficulty: 'INTERMEDIATE', tags: ['品牌融入', '技巧'], scenarios: ['品牌营销'], questionKeywords: ['品牌融入', '品牌'], answerWordCount: 35 } }),
  ]);
  console.log('✅ Raw 3 QA 完成');

  const raw4 = await prisma.raw.create({
    data: {
      projectId: 'default-project', title: '生成式内容策略师与视觉概念师 v2.0 Pro版', originalFileName: '内容策略师v2.0.md',
      fileSize: 35000, format: 'WORD', materialType: 'TRAINING_MATERIAL', experienceSource: 'E3_BOOK',
      conversionStatus: 'CONVERTED', atomPipelineStatus: 'done', qaPipelineStatus: 'done',
      markdownContent: '# E1-E11爆款元素体系\n\nE1利益/E2恐惧/E3好奇/E4共鸣 → E5数字/E6对比/E7问句/E8场景 → E9颜值/E10标杆/E11体系',
    },
  });
  await Promise.all([
    prisma.atom.create({ data: { rawId: raw4.id, projectId: 'default-project', title: 'E1-E11体系', content: '心理触发E1-E4选1+表达技法E5-E8选1-2+价值增强E9-E11补0-2。公式：选题=心理触发+表达技法+场景。≤3个元素。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_HOW', subcategory: 'HOW_METHOD', slotMappings: ['S10'], wordCount: 45 } }),
    prisma.atom.create({ data: { rawId: raw4.id, projectId: 'default-project', title: '平台适配表', content: '抖音15-25字E1/E2+E5/E6；小红书15-20字E4+E8+E9；视频号20-30字E3+E6/E7；公众号20-35字E3+E7+E11。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_HOW', subcategory: 'HOW_BEST', slotMappings: ['S10'], wordCount: 50 } }),
    prisma.atom.create({ data: { rawId: raw4.id, projectId: 'default-project', title: 'COT思维链', content: '7步COT：理解→平台→触发(E1-E4)→技法(E5-E8)→增强(E9-E11)→2-3套草案→总结。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_HOW', subcategory: 'HOW_SOP', slotMappings: ['S5'], wordCount: 35 } }),
    prisma.atom.create({ data: { rawId: raw4.id, projectId: 'default-project', title: '标题禁令', content: '禁惊叹式、禁广告腔、禁虚假承诺、禁红线词、禁一稿走天下、禁元素堆砌>3。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_FENCE', subcategory: 'FENCE_BAN', slotMappings: ['S4'], wordCount: 30 } }),
    prisma.atom.create({ data: { rawId: raw4.id, projectId: 'default-project', title: '选题公式', content: '公式：选题=心理触发(E1-E4)+表达技法(E5-E8)+场景。最终选题不超过3个元素，避免堆砌。', layer: 'A', granularity: 'ATOM', experienceSource: 'E3_BOOK', category: 'CAT_HOW', subcategory: 'HOW_TACTIC', slotMappings: ['S5'], wordCount: 35 } }),
  ]);
  console.log('✅ Raw 4 完成');

  await Promise.all([
    prisma.qAPair.create({ data: { rawId: raw4.id, projectId: 'default-project', materialType: 'TRAINING_MATERIAL', question: 'E1-E11爆款元素体系是什么？', answer: '三层结构：心理触发E1-E4(利益/恐惧/好奇/共鸣)选1个+表达技法E5-E8(数字/对比/问句/场景)选1-2个+价值增强E9-E11(颜值/标杆/体系)补0-2个。公式：选题=心理触发+表达技法+场景。', difficulty: 'INTERMEDIATE', tags: ['E1-E11', '爆款'], scenarios: ['选题策划'], questionKeywords: ['E1-E11', '爆款元素'], answerWordCount: 60 } }),
    prisma.qAPair.create({ data: { rawId: raw4.id, projectId: 'default-project', materialType: 'TRAINING_MATERIAL', question: '不同平台的选题策略有何差异？', answer: '抖音15-25字用E1/E2+E5/E6；小红书15-20字用E4+E8+E9；视频号20-30字用E3+E6/E7；公众号20-35字用E3+E7+E11。平台调性不同，选题长度和元素选择都需适配。', difficulty: 'INTERMEDIATE', tags: ['平台适配', '策略'], scenarios: ['选题策划'], questionKeywords: ['平台适配', '选题策略'], answerWordCount: 65 } }),
  ]);
  console.log('✅ Raw 4 QA 完成');

  for (const raw of [raw1, raw2, raw3, raw4]) {
    const ac = await prisma.atom.count({ where: { rawId: raw.id } });
    const qc = await prisma.qAPair.count({ where: { rawId: raw.id } });
    await prisma.raw.update({ where: { id: raw.id }, data: { atomCount: ac, qaCount: qc } });
  }
  const [rc, ac_, qc_] = await Promise.all([
    prisma.raw.count(), prisma.atom.count(), prisma.qAPair.count(),
  ]);
  console.log(`\n🎉 Seed 完成！\n📦 Raw: ${rc} | ⚛️ Atom: ${ac_} | ❓ QA: ${qc_}`);
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });