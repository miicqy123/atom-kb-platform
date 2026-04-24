import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建演示数据...');

  // 检查 default-project 是否存在，如果不存在则先创建
  let project = await prisma.project.findUnique({ where: { id: 'default-project' } });
  if (!project) {
    console.log('default-project 不存在，先创建项目...');
    try {
      project = await prisma.project.create({
        data: {
          id: 'default-project',
          name: '演示项目',
          description: '用于演示平台功能的默认项目',
          workspaceId: 'default-workspace',
          ownerId: 'default-owner',
          type: 'client',
          status: 'active',
        },
      });
    } catch (error) {
      console.log('创建项目失败，可能是因为缺少workspace或user，尝试直接使用现有项目...');
      // 查找现有的项目
      const existingProjects = await prisma.project.findMany({ take: 1 });
      if (existingProjects.length > 0) {
        project = existingProjects[0];
        console.log(`使用现有项目: ${project.name}`);
      } else {
        throw new Error('没有找到可用的项目，也无法创建默认项目');
      }
    }
  }

  const projectId = project.id;

  // 清除旧的演示数据（如果存在）
  console.log('清除旧的演示数据...');
  try {
    await prisma.auditLog.deleteMany({ where: { userId: 'system' } });
    await prisma.reviewTask.deleteMany({ where: { workflowRun: { projectId: projectId } } });
    await prisma.evaluationRecord.deleteMany({ where: { workflowRun: { projectId: projectId } } });
    await prisma.incident.deleteMany({ where: { workflowRun: { projectId: projectId } } });
    await prisma.workflowRun.deleteMany({ where: { projectId: projectId } });
    await prisma.agentBlueprint.deleteMany({ where: { agent: { projectId: projectId } } });
    await prisma.atomBlueprint.deleteMany({ where: { blueprint: { projectId: projectId } } });
    await prisma.agent.deleteMany({ where: { projectId: projectId } });
    await prisma.blueprint.deleteMany({ where: { projectId: projectId } });
    await prisma.qaPair.deleteMany({ where: { projectId: projectId } });
    await prisma.atom.deleteMany({ where: { projectId: projectId } });
    await prisma.raw.deleteMany({ where: { projectId: projectId } });
    await prisma.apiKey.deleteMany({ where: { projectId: projectId } });
    await prisma.basePack.deleteMany({});
    await prisma.dimensionConfig.deleteMany({});
    console.log('旧数据清除完成');
  } catch (e) {
    console.log('删除数据时出现错误，可能某些表不存在或权限问题:', e.message);
  }

  console.log('开始创建演示数据...');

  // === 1. 创建 Raw 素材 ===
  const rawMaterials = [
    {
      title: '家装行业客户常见问题汇总',
      originalFileName: '家装行业客户常见问题汇总.docx',
      format: 'WORD',
      materialType: 'FAQ',
      experienceSource: 'E1_COMPANY',
      conversionStatus: 'CONVERTED',
      markdownContent: '本文档整理了家装行业中客户经常提出的问题及相应解答。包括：1. 装修流程问题：设计、施工、验收三个阶段的标准流程；2. 价格相关问题：套餐定价、附加费用、分期付款方式；3. 工期相关问题：标准工期、延期处理、特殊情况应对；4. 质保问题：质保范围、维修响应时间、责任划分；5. 设计相关问题：风格选择、空间规划、个性化需求等。该文档是客服人员日常工作的标准参考。',
      projectId,
      fileSize: 150000,
      exposureLevel: 'INTERNAL',
    },
    {
      title: '2024年家装设计趋势报告',
      originalFileName: '2024年家装设计趋势报告.pdf',
      format: 'PDF',
      materialType: 'INDUSTRY_REPORT',
      experienceSource: 'E2_INDUSTRY',
      conversionStatus: 'CONVERTED',
      markdownContent: '2024年家装设计趋势分析报告，从市场调研和设计师访谈中得出的重要结论。主要趋势包括：1. 绿色环保成为首选：消费者对环保材料的关注度达到78%；2. 智能家居融入度提升：约65%的家庭考虑智能家居系统；3. 个性化定制需求增长：标准化产品已不能满足客户需求；4. 空间多功能化：尤其在小户型中，一室多用成为刚需；5. 色彩偏好变化：原木色、灰白调、暖色调受欢迎；6. 新材料应用：如微水泥、岩板、艺术漆等新材料广泛使用。',
      projectId,
      fileSize: 200000,
      exposureLevel: 'INTERNAL',
    }
  ];

  const createdRaws = [];
  for (const raw of rawMaterials) {
    try {
      const createdRaw = await prisma.raw.create({ data: raw });
      createdRaws.push(createdRaw);
      console.log(`创建了Raw素材: ${raw.title}`);
    } catch (e) {
      console.error(`创建Raw素材失败: ${raw.title}`, e.message);
    }
  }

  // === 2. 创建 Atom 原子块 ===
  const atomData = [
    {
      title: '公司简介：金钥匙家装成立于2015年',
      content: '金钥匙家装是一家专注于中高端全屋定制的装饰公司，成立于2015年。公司总部位于上海，目前已在北京、广州、深圳设立分公司。我们秉承"匠心品质，贴心服务"的理念，致力于为客户打造理想的家居生活空间。经过8年的发展，我们服务了超过5000户家庭，客户满意度达到96%以上。公司拥有一支50余人的专业设计师团队和标准化施工队伍，确保每一个项目都能高质量完成。',
      layer: 'A',
      granularity: 'ATOM',
      slotMappings: ['S0'],
      dimensions: [1, 2],
      status: 'ACTIVE',
      experienceSource: 'E1_COMPANY',
      projectId,
      version: 1,
      activeVersion: 1,
      wordCount: 200,
      tokenEstimate: 100,
      exposureLevel: 'INTERNAL',
    }
  ];

  const createdAtoms = [];
  for (const atom of atomData) {
    try {
      const createdAtom = await prisma.atom.create({ data: atom });
      createdAtoms.push(createdAtom);
      console.log(`创建了Atom: ${atom.title}`);
    } catch (e) {
      console.error(`创建Atom失败: ${atom.title}`, e.message);
    }
  }

  // === 3. 创建 QA 对 ===
  const qaPairs = [
    {
      question: '你们公司是做什么的？',
      answer: '金钥匙家装是一家专注于中高端全屋定制的装饰公司，成立于2015年。我们提供从设计、施工到软装搭配的一体化服务，拥有专业设计师一对一跟踪服务，致力于为客户提供高品质的家居生活环境。',
      tags: ['公司介绍', '主营业务'],
      difficulty: 'BEGINNER',
      questionKeywords: ['公司', '做什么', '介绍', '主营业务'],
      materialType: 'THEORY',
      status: 'APPROVED',
      projectId,
      answerWordCount: 50,
      qualityScore: 0.95,
      scenarios: [],
    }
  ];

  const createdQaPairs = [];
  for (const qa of qaPairs) {
    try {
      const createdQa = await prisma.qaPair.create({ data: qa });
      createdQaPairs.push(createdQa);
      console.log(`创建了QA对: ${qa.question}`);
    } catch (e) {
      console.error(`创建QA对失败: ${qa.question}`, e.message);
    }
  }

  // === 4. 创建 Blueprint 蓝图 ===
  const blueprints = [
    {
      name: '家装智能客服-标准版',
      enterprise: '金钥匙家装',
      position: '智能客服',
      taskName: '客户咨询应答',
      workflowMode: 'DAG',
      status: 'ONLINE',
      category: '客服',
      description: '用于回答客户关于家装服务的常见问题，提供专业、一致的解答',
      projectId,
      version: 1,
      activeVersion: 1,
      totalTokenEstimate: 5000,
      qualityPassRate: 0.88,
      lastTestTime: new Date(),
      exposureLevel: 'INTERNAL',
      createdBy: 'system',
    }
  ];

  const createdBlueprints = [];
  for (const blueprint of blueprints) {
    try {
      const bp = await prisma.blueprint.create({ data: blueprint });

      // 创建SlotConfig
      const slots = ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];
      for (let i = 0; i < slots.length; i++) {
        await prisma.slotConfig.create({
          data: {
            blueprintId: bp.id,
            slotKey: slots[i],
            order: i,
            maxTokens: 1000,
            conflictPriority: ['D', 'C', 'B', 'A'],
            dedupe: true,
            fallbackStrategy: 'skip',
          },
        });
      }

      createdBlueprints.push(bp);
      console.log(`创建了Blueprint: ${blueprint.name}`);
    } catch (e) {
      console.error(`创建Blueprint失败: ${blueprint.name}`, e.message);
    }
  }

  console.log('演示数据创建完成！');
  console.log(`- 创建了 ${createdRaws.length} 条 Raw 素材`);
  console.log(`- 创建了 ${createdAtoms.length} 个 Atom 原子块`);
  console.log(`- 创建了 ${createdQaPairs.length} 个 QA 对`);
  console.log(`- 创建了 ${createdBlueprints.length} 个 Blueprint`);
  console.log('平台已准备好演示数据，可以开始体验各项功能！');
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