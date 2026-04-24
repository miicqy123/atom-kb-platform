import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

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
    await prisma.workflowRun.deleteMany({ where: { projectId: projectId } });
    await prisma.reviewTask.deleteMany({ where: { workflowRun: { projectId: projectId } } });
    await prisma.evaluationRecord.deleteMany({ where: { workflowRun: { projectId: projectId } } });
    await prisma.incident.deleteMany({ where: { workflowRun: { projectId: projectId } } });
  } catch (e) {
    console.log('删除workflow相关数据时出现错误，继续...');
  }

  try {
    await prisma.agentBlueprint.deleteMany({ where: { agent: { projectId: projectId } } });
    await prisma.atomBlueprint.deleteMany({ where: { blueprint: { projectId: projectId } } });
    await prisma.agent.deleteMany({ where: { projectId: projectId } });
    await prisma.blueprint.deleteMany({ where: { projectId: projectId } });
    await prisma.slotConfig.deleteMany({ where: { blueprint: { projectId: projectId } } });
  } catch (e) {
    console.log('删除blueprint/agent相关数据时出现错误，继续...');
  }

  try {
    await prisma.qAPair.deleteMany({ where: { projectId: projectId } });
    await prisma.atom.deleteMany({ where: { projectId: projectId } });
    await prisma.raw.deleteMany({ where: { projectId: projectId } });
  } catch (e) {
    console.log('删除基础实体数据时出现错误，继续...');
  }

  try {
    await prisma.apiKey.deleteMany({ where: { projectId: projectId } });
    await prisma.basePack.deleteMany({});
    await prisma.dimensionConfig.deleteMany({});
    await prisma.auditLog.deleteMany({ where: { userId: 'demo-system' } });
  } catch (e) {
    console.log('删除其他配置数据时出现错误，继续...');
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
    },
    {
      title: '2024年家装设计趋势报告',
      originalFileName: '2024年家装设计趋势报告.pdf',
      format: 'PDF',
      materialType: 'INDUSTRY_REPORT',
      experienceSource: 'E2_INDUSTRY',
      conversionStatus: 'CONVERTED',
      markdownContent: '2024年家装设计趋势分析报告，从市场调研和设计师访谈中得出的重要结论。主要趋势包括：1. 绿色环保成为首选：消费者对环保材料的关注度达到78%；2. 智能家居融入度提升：约65%的家庭考虑智能家居系统；3. 个性化定制需求增长：标准化产品已不能满足客户需求；4. 空间多功能化：尤其在小户型中，一室多用成为刚需；5. 色彩偏好变化：原木色、灰白调、暖色调受欢迎；6. 新材料应用：如微水泥、岩板、艺术漆等新材料广泛使用。',
    },
    {
      title: '金钥匙销售话术培训手册',
      originalFileName: '金钥匙销售话术培训手册.docx',
      format: 'WORD',
      materialType: 'TRAINING_MATERIAL',
      experienceSource: 'E1_COMPANY',
      conversionStatus: 'CONVERTED',
      markdownContent: '金钥匙家装销售团队专用培训手册。包含标准话术、异议处理、成交技巧等。开篇要点：1. 客户需求挖掘：通过开放性问题了解真实需求；2. 产品介绍技巧：突出性价比、工艺优势、设计能力；3. 价格异议处理：价值拆解、对比分析、优惠引导；4. 成交信号识别：客户购买意图判断方法；5. 售后承诺规范：质保条款、服务标准、维权渠道。注意：所有承诺必须在公司规定范围内，不得随意承诺超出范围的服务。',
    },
    {
      title: '竞品分析：土巴兔vs齐家网',
      originalFileName: '竞品分析：土巴兔vs齐家网.pdf',
      format: 'PDF',
      materialType: 'COMPETITOR_ANALYSIS',
      experienceSource: 'E2_INDUSTRY',
      conversionStatus: 'PENDING',
      markdownContent: '针对土巴兔和齐家网两家主要竞品的深度分析。土巴兔优势：平台流量大、品牌知名度高、广告投入多；劣势：重平台轻服务、用户体验参差不齐、客户投诉较多。齐家网优势：建材供应链完善、价格透明度高、标准化程度较好；劣势：设计创新能力有限、个性化服务不足、地域覆盖面较窄。我们的差异化策略：专注设计服务、提供一站式解决方案、建立客户口碑体系。',
    },
    {
      title: '客户投诉处理流程规范',
      originalFileName: '客户投诉处理流程规范.docx',
      format: 'WORD',
      materialType: 'REGULATION',
      experienceSource: 'E1_COMPANY',
      conversionStatus: 'CONVERTED',
      markdownContent: '金钥匙家装客户投诉处理标准流程。一级投诉（一般问题）：现场处理，当日回复，满意度调查。二级投诉（严重问题）：部门经理介入，3日内给出解决方案，领导跟进。三级投诉（重大问题）：总经理处理，24小时内响应，专项小组跟进。处理原则：快速响应、真诚道歉、积极解决、持续跟进。所有投诉需录入系统，形成闭环管理。每月统计分析投诉类型，优化服务流程。',
    },
    {
      title: '全屋定制产品说明书',
      originalFileName: '全屋定制产品说明书.docx',
      format: 'WORD',
      materialType: 'PRODUCT_DOC',
      experienceSource: 'E1_COMPANY',
      conversionStatus: 'CONVERTED',
      markdownContent: '金钥匙家装全屋定制产品详细介绍。涵盖橱柜、衣柜、书柜、鞋柜、电视柜等定制家具。材料说明：板材类型、环保等级、五金配件、表面工艺。设计服务：免费量房、方案设计、3D效果图、施工图纸。工艺标准：封边工艺、结构稳定性、环保检测标准。安装服务：专业团队、按时交付、验收标准、售后维护。产品优势：环保健康、设计美观、功能实用、品质可靠。',
    }
  ];

  const createdRaws = [];
  for (const raw of rawMaterials) {
    const createdRaw = await prisma.raw.create({
      data: {
        ...raw,
        projectId,
        fileSize: Math.floor(Math.random() * 450000) + 50000, // 随机50000-500000
        exposureLevel: 'INTERNAL',
      },
    });
    createdRaws.push(createdRaw);
  }

  // === 2. 创建 Atom 原子块 ===
  const atomData = [
    // A层（公司认知）
    { title: '公司简介：金钥匙家装成立于2015年', content: '金钥匙家装是一家专注于中高端全屋定制的装饰公司，成立于2015年。公司总部位于上海，目前已在北京、广州、深圳设立分公司。我们秉承"匠心品质，贴心服务"的理念，致力于为客户打造理想的家居生活空间。经过8年的发展，我们服务了超过5000户家庭，客户满意度达到96%以上。公司拥有一支50余人的专业设计师团队和标准化施工队伍，确保每一个项目都能高质量完成。', layer: 'A', granularity: 'ATOM', slotMappings: ['S0'], dimensions: [1, 2], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '品牌定位：中高端全屋定制', content: '金钥匙家装定位于中高端市场，专注于全屋定制解决方案。我们的服务对象主要是对生活品质有较高要求的中产家庭，特别是对设计感、环保性和实用性有明确需求的客户群体。相比低端装修公司，我们更注重设计创新和工艺品质；相比传统高端装修公司，我们提供更具性价比的解决方案。公司采用直营管理模式，确保服务质量的一致性和可控性。', layer: 'A', granularity: 'ATOM', slotMappings: ['S1'], dimensions: [1, 3], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '核心优势：设计师一对一服务', content: '金钥匙家装的核心竞争优势在于提供专业设计师一对一的全程跟踪服务。每位客户都会配备专属设计师，从初步沟通、现场勘测、方案设计、材料选择、施工监督到最终验收，设计师全程参与。这种服务模式确保了设计理念的一致性和实施的准确性，同时也提升了客户的满意度和信任度。设计师团队均具有5年以上从业经验，定期接受专业培训和客户沟通技巧训练。', layer: 'A', granularity: 'ATOM', slotMappings: ['S0'], dimensions: [2, 4], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '服务范围：覆盖全屋设计、施工、软装', content: '金钥匙家装提供全屋一体化服务，包括：1.室内设计：户型分析、风格定位、功能规划、3D效果图；2.基础施工：水电改造、泥瓦工程、木工制作、油漆涂装；3.主材供应：地板瓷砖、洁具厨具、门窗灯具等；4.软装配饰：窗帘布艺、装饰摆件、绿植花卉等；5.环保检测：甲醛检测、空气净化、治理建议。客户只需一个电话，即可享受从毛坯到拎包入住的全套服务。', layer: 'A', granularity: 'MODULE', slotMappings: ['S1'], dimensions: [3, 5], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '明星案例：万科城市花园整装项目', content: '万科城市花园整装项目是金钥匙家装的标杆案例，面积120平米，四室两厅格局。业主为年轻夫妇，希望打造简约现代风格的温馨居所。设计亮点：客厅开放式布局，主卧套房设计，儿童房多功能规划，书房榻榻米设计。项目周期：设计15天，施工90天。客户反馈：对设计方案和施工质量高度满意，已推荐3位朋友使用我们的服务。该项目荣获2023年上海装饰设计奖优秀奖。', layer: 'A', granularity: 'ATOM', slotMappings: ['S2'], dimensions: [6, 7], status: 'DRAFT', experienceSource: 'E1_COMPANY' },
    { title: '客户画像：25-45岁中产家庭', content: '金钥匙家装的目标客户群体主要是年龄在25-45岁之间的中产阶层家庭，主要包括：1.新婚夫妇：首次置业装修，追求实用性和美观性的平衡；2.二孩家庭：对环保性和安全性有更高要求；3.改善型客户：对设计品质和个性化有更高期待；4.投资型客户：关注保值增值和出租收益。这类客户群体具有较强的消费能力、对品质有一定要求、重视服务体验、决策相对理性但也有感性因素。', layer: 'A', granularity: 'ATOM', slotMappings: ['S3'], dimensions: [8, 9], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '价格体系：688/888/1288三档套餐', content: '金钥匙家装推出标准化套餐服务，方便客户选择：1.标准套餐688元/平米：适用于100平米以下中小户型，包含基础设计和施工，主要材料品牌为国产品牌，工期60天；2.精品套餐888元/平米：适用于中等户型，增加部分进口材料，设计更为精致，工期75天；3.豪华套餐1288元/平米：适用于大户型和别墅，进口高端材料，个性化设计，顶级工艺，工期90天。所有套餐均包含水电改造、基础施工、主材供应，不含家具家电。', layer: 'A', granularity: 'ATOM', slotMappings: ['S2'], dimensions: [4, 10], status: 'TESTING', experienceSource: 'E1_COMPANY' },
    { title: '售后承诺：质保5年，24小时响应', content: '金钥匙家装对所有工程项目提供完善的售后服务承诺：1.质量保证：主体结构质保10年，水电隐蔽工程质保8年，其他装修部分质保5年；2.服务响应：客户问题反馈后24小时内响应，48小时内给出解决方案；3.维修服务：质保期内免费维修，质保期外收取材料成本费；4.定期回访：完工后每季度回访一次，每年提供一次免费保养服务；5.客户权益：享有7天无理由退订、15天设计不满意重做、终身咨询服务等权益。', layer: 'A', granularity: 'ATOM', slotMappings: ['S7'], dimensions: [5], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },

    // B层（业务技能）
    { title: '量房流程：预约→上门→测量→出图', content: '标准量房服务流程：1.预约确认：提前1天确认上门时间，携带量房工具和测量软件；2.现场沟通：了解客户需求和重点关注区域，拍摄现场照片；3.精确测量：使用激光测距仪测量尺寸，绘制平面图，记录梁柱位置、管线走向；4.细节记录：记录地面平整度、墙体垂直度、采光情况、通风状况；5.数据整理：现场录入测量数据，生成CAD平面图；6.后续安排：约定方案沟通时间，发送量房报告。全程预计2小时，确保数据准确无误。', layer: 'B', granularity: 'ATOM', slotMappings: ['S5'], dimensions: [11, 12], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '报价技巧：先了解预算再推方案', content: '有效报价技巧包括：1.预算探询：通过聊天了解客户大致预算范围，避免推荐超出预算的方案；2.价值先行：先展示设计价值和工艺优势，再提及价格；3.套餐推荐：根据预算推荐合适套餐，突出性价比；4.费用分解：将总价分解为设计费、材料费、施工费等明细；5.优惠策略：适时提及活动优惠或老客户推荐折扣；6.支付方式：介绍灵活的支付方式和分期选项。记住：价格是结果，不是起点。', layer: 'B', granularity: 'ATOM', slotMappings: ['S5'], dimensions: [13, 14], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '异议处理：太贵了→价值对比法', content: '面对"太贵了"异议的处理方法：1.认同感受："我理解您对价格的关注，这是明智的决定"；2.价值强调："相比传统装修公司，我们提供的是设计师一对一定制服务"；3.对比分析：列出同类服务市场价格区间，突显我们的性价比；4.细化说明：将总费用分解为每日投入成本，降低心理负担；5.案例佐证：分享其他客户满意度反馈；6.限时优惠：适当时候可以提及当前活动。核心：让客户觉得物有所值。', layer: 'B', granularity: 'ATOM', slotMappings: ['S5'], dimensions: [15, 16], status: 'TESTING', experienceSource: 'E1_COMPANY' },
    { title: '签单流程：意向确认→合同签署→定金', content: '标准化签单流程：1.意向确认：客户对方案和价格无异议后，确认签约意向；2.合同准备：准备正式合同文本，包括设计、施工、材料等详细条款；3.合同讲解：逐条解释合同条款，确保客户理解各项内容；4.合同签署：双方签字盖章，留存副本；5.定金收取：收取合同金额20%的定金，开具收据；6.开工安排：确定开工日期，安排项目经理和施工队。全程需耐心细致，确保客户充分知情。', layer: 'B', granularity: 'ATOM', slotMappings: ['S5'], dimensions: [17], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '售后处理：投诉分级→24h响应→48h方案', content: '售后投诉处理流程：1.投诉登记：详细记录投诉内容、客户信息、期望解决方式；2.等级划分：一级（一般问题）、二级（重要问题）、三级（紧急问题）；3.响应时限：一级24小时、二级12小时、三级2小时内响应；4.方案制定：分析问题原因，制定解决方案；5.执行跟进：落实解决方案，持续跟进客户满意度；6.总结改进：问题解决后总结经验，完善预防措施。', layer: 'B', granularity: 'ATOM', slotMappings: ['S5'], dimensions: [18, 19], status: 'DRAFT', experienceSource: 'E1_COMPANY' },
    { title: '转介绍话术：老客户推荐返现2000元', content: '客户转介绍激励话术："如果您身边有朋友需要装修服务，欢迎推荐给我们。为了感谢您的信任，我们对成功推荐的老客户给予2000元现金奖励。推荐流程很简单：1.联系我们告知推荐人信息；2.我们安排专人跟进；3.签约完成后，奖励直接发放给您。这不仅帮助朋友找到可靠的装修服务，也让您获得实实在在的好处。"注意：所有推荐需客户知情同意。', layer: 'B', granularity: 'ATOM', slotMappings: ['S6'], dimensions: [20], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },

    // C层（风格红线）
    { title: '禁止承诺：不得承诺具体工期', content: '销售和服务人员严禁向客户承诺具体完工日期，只能提供合理的时间范围。因为装修过程中存在诸多不确定因素：天气影响、材料延迟、客户需求变更、设计调整等。正确的表述方式："我们计划在XX天内完成，具体时间将根据施工进展和天气情况动态调整，我们会及时向您汇报进度"。如需特殊工期要求，需单独评估并签署补充协议。违反此规定的员工将面临警告直至解雇处分。', layer: 'C', granularity: 'ATOM', slotMappings: ['S4'], dimensions: [21, 22], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '价格红线：严禁私下打折超过95折', content: '所有价格优惠政策必须通过公司系统申请和审批，销售人员严禁私下给予客户超过95折的价格优惠。特殊情况（如老客户介绍、大额订单等）需经部门经理审批，并在系统中备案。私自打折的行为严重损害公司利益，一经发现将面临严重处罚，包括但不限于扣减提成、降职甚至解雇。公司有完善的促销政策和优惠体系，所有优惠必须公开透明，确保公平竞争。', layer: 'C', granularity: 'ATOM', slotMappings: ['S4'], dimensions: [23], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '话术规范：不得贬低竞品', content: '在与客户交流过程中，严禁贬低或攻击竞争对手。当客户提及竞品时，应采取客观对比的方式，重点突出我们产品的优势，而不是贬低对方的劣势。正确的做法："每家公司都有自己的特色，我们专注于提供专业的设计服务和精细的施工管理，您可以综合比较后再做决定"。这样既体现了我们的专业素养，也避免了恶意竞争的风险。我们靠实力和服务赢得客户，不是靠攻击对手。', layer: 'C', granularity: 'ATOM', slotMappings: ['S4'], dimensions: [24, 25], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },

    // D层（系统合规）
    { title: '数据合规：客户信息不得外传', content: '根据《个人信息保护法》等相关法规，所有客户信息属于高度保密数据，任何人不得私自外传、泄露或挪作他用。1.信息访问：仅限工作需要的员工访问客户信息；2.信息传输：使用加密通道传输，禁止通过微信、QQ等非加密方式发送；3.信息存储：客户信息必须存储在公司指定的安全系统中；4.信息销毁：过期信息按规定流程销毁；5.违规处罚：泄露客户信息者将承担法律责任并立即解雇。保护客户隐私是我们的基本义务。', layer: 'D', granularity: 'ATOM', slotMappings: ['S4'], dimensions: [26, 27], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '法律条款：合同必须包含七天冷静期', content: '根据相关法律法规，家装合同中必须包含"七天冷静期"条款，即客户在合同签订后的七天内有权无理由解除合同，公司应全额退还已收款（如有设计费等特殊约定除外）。此条款必须在合同中明确标注，销售人员在签约时必须主动告知客户此项权利。冷静期内解约，不得收取违约金或手续费。此举既保护消费者权益，也体现我们对自身服务的信心。所有销售人员必须熟知此条款。', layer: 'D', granularity: 'ATOM', slotMappings: ['S8'], dimensions: [28, 29], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
    { title: '审计要求：每次报价必须系统留痕', content: '为了加强财务审计和流程管控，每一次客户报价都必须在公司系统中留有完整记录。1.报价录入：销售人员必须将详细报价单录入系统；2.版本管理：每次报价调整都需保留历史版本；3.审批流程：大额报价需经过上级审批；4.变更记录：客户要求的任何变更都需系统备注；5.归档保存：报价记录永久保存备查。系统自动审计，无系统记录的报价视为无效。这是合规经营的基本要求。', layer: 'D', granularity: 'ATOM', slotMappings: ['S9'], dimensions: [30], status: 'ACTIVE', experienceSource: 'E1_COMPANY' },
  ];

  const createdAtoms = [];
  for (const atom of atomData) {
    const createdAtom = await prisma.atom.create({
      data: {
        ...atom,
        projectId,
        version: 1,
        activeVersion: 1,
        wordCount: atom.content.length,
        tokenEstimate: Math.ceil(atom.content.length / 2),
        exposureLevel: 'INTERNAL',
      },
    });
    createdAtoms.push(createdAtom);
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
      status: 'ACTIVE'
    },
    {
      question: '全屋定制大概多少钱？',
      answer: '我们提供三档套餐服务：标准套餐688元/平米，适合100平米以下中小户型；精品套餐888元/平米，增加部分进口材料；豪华套餐1288元/平米，适用于大户型和别墅。具体价格可根据您家的实际户型和需求进行精准报价。',
      tags: ['价格', '套餐', '报价'],
      difficulty: 'BEGINNER',
      questionKeywords: ['价格', '多少钱', '套餐', '报价', '费用'],
      materialType: 'THEORY',
      status: 'ACTIVE'
    },
    {
      question: '设计师可以上门量房吗？',
      answer: '当然可以！我们提供免费上门量房服务。在您联系我们后，我们会安排专业设计师在您方便的时间上门，使用专业工具进行精确测量，并现场与您沟通设计需求。整个量房过程大约需要1-2小时。',
      tags: ['量房', '服务流程', '设计师'],
      difficulty: 'BEGINNER',
      questionKeywords: ['量房', '设计师', '上门', '服务'],
      materialType: 'FAQ',
      status: 'ACTIVE'
    },
    {
      question: '装修工期一般多久？',
      answer: '工期根据房屋面积和装修复杂程度而定：60-90平米一般需要60天，90-120平米需要75天，120平米以上需要90天。我们会制定详细的施工计划并与您保持沟通，如遇特殊情况会及时告知。我们不承诺具体完工日期，但会尽最大努力按时完成。',
      tags: ['工期', '时间', '进度'],
      difficulty: 'INTERMEDIATE',
      questionKeywords: ['工期', '多久', '时间', '完成', '进度'],
      materialType: 'FAQ',
      status: 'ACTIVE'
    },
    {
      question: '有没有质保？',
      answer: '我们提供完善的质保服务：主体结构质保10年，水电工程质保8年，其他装修部分质保5年。我们还承诺客户问题反馈后24小时内响应，48小时内给出解决方案。此外，我们每年提供一次免费保养服务。',
      tags: ['质保', '售后', '保修'],
      difficulty: 'BEGINNER',
      questionKeywords: ['质保', '保修', '售后', '保障'],
      materialType: 'REGULATION',
      status: 'ACTIVE'
    },
    {
      question: '可以看看你们的案例吗？',
      answer: '当然可以！我们有丰富的案例展示，包括不同户型、不同风格的设计方案。您可以到我们展厅实地参观，也可以在线浏览我们的3D效果图案例库。我们特别推荐万科城市花园、碧桂园森林城等明星案例，您可以了解我们的设计水平和施工质量。',
      tags: ['案例', '作品', '展示'],
      difficulty: 'BEGINNER',
      questionKeywords: ['案例', '作品', '展示', '样板', '参考'],
      materialType: 'CASE_STUDY',
      status: 'ACTIVE'
    },
    {
      question: '付款方式怎么样？',
      answer: '我们提供灵活的付款方式：签约时支付合同总额的20%作为定金，水电改造完成后支付40%，瓦工完成后支付30%，工程竣工验收后支付剩余10%。我们也支持银行分期付款，具体方案可与客户经理详细沟通。',
      tags: ['付款', '费用', '分期'],
      difficulty: 'INTERMEDIATE',
      questionKeywords: ['付款', '费用', '分期', '钱', '钱款'],
      materialType: 'THEORY',
      status: 'ACTIVE'
    },
    {
      question: '跟土巴兔比你们有什么优势？',
      answer: '我们与土巴兔等平台有所不同：我们提供实体店面服务，拥有专业设计师一对一服务，能更好地理解您的个性化需求；我们的施工队伍是自有团队，质量更加可控；另外，我们专注于中高端市场，对工艺和材料的要求更高。每个公司都有特色，您可以综合比较后选择最适合的服务商。',
      tags: ['竞争优势', '竞品', '比较'],
      difficulty: 'PROFESSIONAL',
      questionKeywords: ['优势', '比', '竞品', '比较', '好'],
      materialType: 'THEORY',
      status: 'ACTIVE'
    },
    {
      question: '售后问题找谁？',
      answer: '我们有专门的售后服务团队。工程竣工后，您会收到我们的售后联系卡，上有专属客服的联系方式。您也可以拨打我们的售后热线400-XXX-XXXX。我们承诺24小时内响应，48小时内给出解决方案。您的项目经理也会持续跟进直至问题解决。',
      tags: ['售后', '客服', '维修'],
      difficulty: 'BEGINNER',
      questionKeywords: ['售后', '客服', '维修', '问题', '联系'],
      materialType: 'FAQ',
      status: 'ACTIVE'
    },
    {
      question: '老客户推荐有什么优惠？',
      answer: '我们非常感谢老客户的信任和推荐！对于成功推荐新客户的老客户，我们将给予2000元现金奖励。推荐流程很简单，您只需告知我们推荐人信息，我们安排专人跟进服务，新客户签约后奖励就会发放给您。',
      tags: ['推荐', '优惠', '老客户'],
      difficulty: 'INTERMEDIATE',
      questionKeywords: ['推荐', '优惠', '老客户', '返现', '奖励'],
      materialType: 'FAQ',
      status: 'DRAFT'
    },
  ];

  const createdQaPairs = [];
  for (const qa of qaPairs) {
    const createdQa = await prisma.qAPair.create({
      data: {
        ...qa,
        projectId,
        answerWordCount: qa.answer.length,
        qualityScore: 0.95,
        scenarios: [],
      },
    });
    createdQaPairs.push(createdQa);
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
    },
    {
      name: '家装销售顾问-高转化版',
      enterprise: '金钥匙家装',
      position: '销售顾问',
      taskName: '客户需求挖掘与引导',
      workflowMode: 'REACT',
      status: 'TESTING',
      category: '销售',
      description: '智能化销售流程，通过多轮对话深入了解客户需求并引导成交',
    },
    {
      name: '售后服务助手',
      enterprise: '金钥匙家装',
      position: '售后服务',
      taskName: '售后问题处理',
      workflowMode: 'DAG',
      status: 'DRAFT',
      category: '售后',
      description: '处理客户售后问题，协调资源解决问题并维护客户关系',
    }
  ];

  const createdBlueprints = [];
  for (const blueprint of blueprints) {
    const bp = await prisma.blueprint.create({
      data: {
        ...blueprint,
        projectId,
        version: 1,
        activeVersion: 1,
        totalTokenEstimate: 5000,
        qualityPassRate: 0.88,
        lastTestTime: new Date(),
        exposureLevel: 'INTERNAL',
        createdBy: 'system',
      },
    });

    // 自动创建 S0-S10 的 SlotConfig
    const slots = ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];
    await prisma.slotConfig.createMany({
      data: slots.map((s, i) => ({
        blueprintId: bp.id,
        slotKey: s,
        order: i,
        maxTokens: 1000,
        conflictPriority: ['D', 'C', 'B', 'A'],
        dedupe: true,
        fallbackStrategy: 'skip',
      })),
    });

    createdBlueprints.push(bp);
  }

  // === 5. 创建 AtomBlueprint 关联 ===
  // 为每个蓝图关联8-12个原子块
  const blueprintAtoms = [
    { blueprintId: createdBlueprints[0].id, atomIds: [0, 1, 2, 3, 5, 6, 7, 8, 10, 13, 16, 18] }, // 客服蓝图
    { blueprintId: createdBlueprints[1].id, atomIds: [0, 1, 2, 8, 9, 10, 11, 13, 14, 15, 16] }, // 销售蓝图
    { blueprintId: createdBlueprints[2].id, atomIds: [0, 7, 12, 13, 14, 16, 17, 18] }, // 售后蓝图
  ];

  for (const ba of blueprintAtoms) {
    for (const atomId of ba.atomIds) {
      if (atomId < createdAtoms.length) {
        await prisma.atomBlueprint.create({
          data: {
            atomId: createdAtoms[atomId].id,
            blueprintId: ba.blueprintId,
            slotKey: createdAtoms[atomId].slotMappings[0] || 'S0',
            order: Math.floor(Math.random() * 10),
          },
        });
      }
    }
  }

  // === 6. 创建 Agent ===
  const agents = [
    {
      name: '小金-家装顾问',
      role: '销售顾问',
      description: '专业的家装咨询顾问，解答客户关于装修的各种问题',
      status: 'ACTIVE',
      category: '销售',
      exposureLevel: 'INTERNAL',
    },
    {
      name: '小匠-售后客服',
      role: '售后专员',
      description: '处理客户售后问题，协调维修等服务',
      status: 'ACTIVE',
      category: '售后',
      exposureLevel: 'INTERNAL',
    },
    {
      name: '小慧-设计咨询',
      role: '设计顾问',
      description: '提供专业的设计咨询服务，解答设计相关问题',
      status: 'DRAFT',
      category: '设计',
      exposureLevel: 'INTERNAL',
    }
  ];

  const createdAgents = [];
  for (const agent of agents) {
    const ag = await prisma.agent.create({
      data: {
        ...agent,
        projectId,
        version: '1.0',
        capabilities: ['customer_service', 'consultation', 'design_advice'],
        createdBy: 'system',
        totalRuns: 0,
        successRate: 0,
        avgDuration: 0,
        avgTokens: 0,
      },
    });

    // 将Agent关联到对应的Blueprint
    const blueprintIndex = ag.name.includes('售后') ? 2 : ag.name.includes('设计') ? 1 : 0;
    if (blueprintIndex < createdBlueprints.length) {
      await prisma.agentBlueprint.create({
        data: {
          agentId: ag.id,
          blueprintId: createdBlueprints[blueprintIndex].id,
        },
      });
    }

    createdAgents.push(ag);
  }

  // === 7. 创建 WorkflowRun 记录 ===
  const runStatuses = [
    'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS',
    'DEGRADED', 'HUMAN_TAKEOVER', 'FAILED'
  ];

  const createdRuns = [];
  for (let i = 0; i < 8; i++) {
    const run = await prisma.workflowRun.create({
      data: {
        blueprintId: createdBlueprints[i % createdBlueprints.length].id,
        projectId,
        workflowMode: createdBlueprints[i % createdBlueprints.length].workflowMode,
        status: runStatuses[i],
        inputData: {
          question: faker.lorem.sentence(),
          customerType: ['new', 'returning', 'referral'][Math.floor(Math.random() * 3)]
        },
        outputContent: `这是系统为您生成的${['咨询回复', '报价方案', '设计方案', '解决方案'][Math.floor(Math.random() * 4)]}，希望能够帮助到您。如有其他问题，请随时联系我们。`,
        tokenUsage: Math.floor(Math.random() * 4000) + 1000,
        duration: Math.floor(Math.random() * 2500) + 500, // 500-3000ms
        cost: parseFloat((Math.random() * 0.5 + 0.1).toFixed(2)),
        startedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // 近7天内
        completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        startedBy: 'demo-user',
        contentPerformance: { clicks: Math.floor(Math.random() * 100), conversions: Math.floor(Math.random() * 10) },
        roiMetrics: { investment: 1000, return: Math.floor(Math.random() * 2000) + 500 },
      },
    });
    createdRuns.push(run);
  }

  // === 8. 创建 EvaluationRecord ===
  for (let i = 0; i < createdRuns.length; i++) {
    let score = 0;
    if (createdRuns[i].status === 'SUCCESS') {
      score = Math.random() * 20 + 75; // 75-95
    } else if (createdRuns[i].status === 'DEGRADED') {
      score = Math.random() * 10 + 55; // 55-65
    } else {
      score = Math.random() * 20 + 40; // 40-60
    }

    await prisma.evaluationRecord.create({
      data: {
        workflowRunId: createdRuns[i].id,
        s8Scores: {
          S0: Math.random() * 20 + 70,
          S1: Math.random() * 20 + 70,
          S2: Math.random() * 20 + 70,
          S3: Math.random() * 20 + 70,
          S4: Math.random() * 20 + 70,
          S5: Math.random() * 20 + 70,
          S6: Math.random() * 20 + 70,
          S7: Math.random() * 20 + 70,
          S8: Math.random() * 20 + 70,
          S9: Math.random() * 20 + 70,
        },
        s9OverallScore: score,
        s9Dimensions: {
          accuracy: Math.random() * 20 + 70,
          completeness: Math.random() * 20 + 70,
          relevance: Math.random() * 20 + 70,
          professionalism: Math.random() * 20 + 70,
        },
        redlineScanResults: {
          violations: 0,
          flaggedContent: []
        },
        passed: score > 70,
      },
    });
  }

  // === 9. 创建 ReviewTask ===
  // 关联 DEGRADED 和 HUMAN_TAKEOVER 的 WorkflowRun
  const reviewTasks = [
    { runIndex: 5, urgency: 'YELLOW', status: 'PENDING' }, // DEGRADED
    { runIndex: 6, urgency: 'GREEN', status: 'APPROVED' }, // HUMAN_TAKEOVER
    { runIndex: 7, urgency: 'RED', status: 'PENDING' },   // FAILED
  ];

  for (const rt of reviewTasks) {
    await prisma.reviewTask.create({
      data: {
        workflowRunId: createdRuns[rt.runIndex].id,
        triggerReason: 'Quality threshold not met',
        urgency: rt.urgency,
        status: rt.status,
        result: rt.status === 'APPROVED' ? 'Modified to improve clarity' : null,
        feedback: 'Response needs improvement in clarity and completeness',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // === 10. 创建 Incident 事件 ===
  await prisma.incident.create({
    data: {
      workflowRunId: createdRuns[0].id,
      type: 'LOW_SUCCESS_RATE',
      severity: 'CRITICAL',
      description: '成功率 72%，低于阈值 85%',
      status: 'pending',
      createdAt: new Date(),
    },
  });

  await prisma.incident.create({
    data: {
      workflowRunId: createdRuns[1].id,
      type: 'HIGH_HITL_RATE',
      severity: 'HIGH',
      description: 'HITL 率 18%，超过阈值 15%',
      status: 'resolved',
      resolution: 'Adjusted automation rules to reduce manual intervention needs',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
      updatedAt: new Date(),
    },
  });

  // === 11. 创建 BasePack 底包 ===
  const basePacks = [
    {
      slotKey: 'S0',
      content: '你是金钥匙家装的AI助手小金，专注于为客户提供专业的家装咨询服务。请始终保持友好、专业的态度，使用礼貌用语，针对客户的具体问题提供准确、有用的信息。如遇到不确定的问题，请引导客户联系人工客服。',
      scope: 'global',
    },
    {
      slotKey: 'S4',
      content: '以下是必须遵守的红线规则：1.不得承诺具体完工日期；2.不得私自打折超过95折；3.不得贬低竞争对手；4.保护客户隐私，不得泄露客户信息；5.所有报价必须录入系统。如有违反，将承担相应责任。',
      scope: 'global',
    },
    {
      slotKey: 'S7',
      content: '请按照以下格式输出回复：1.问题确认：复述客户问题；2.解答内容：详细解答客户疑问；3.行动建议：提供下一步建议或引导；4.结束语：礼貌结束对话。保持语言通俗易懂，避免专业术语过多。',
      scope: 'global',
    },
    {
      slotKey: 'S8',
      content: '质检标准：1.内容完整性：回答必须包含客户问题的所有方面；2.准确性：提供的信息必须准确无误；3.规范性：语言得体，符合服务标准；4.有效性：能够真正解决客户问题。',
      scope: 'global',
    },
  ];

  for (const bp of basePacks) {
    await prisma.basePack.create({
      data: bp,
    });
  }

  // === 12. 创建 DimensionConfig ===
  const dimensionNames = [
    '公司背景', '品牌理念', '核心优势', '服务内容', '案例展示',
    '项目规模', '客户类型', '目标群体', '价格体系', '售后保障',
    '客户沟通', '需求挖掘', '产品介绍', '价格谈判', '异议处理',
    '成交技巧', '售后服务', '投诉处理', '客户维护', '转介绍',
    '话术规范', '承诺边界', '竞品策略', '形象管理', '合规要求',
    '数据安全', '隐私保护', '法律条款', '审计合规', '职业道德'
  ];

  for (let i = 1; i <= 30; i++) {
    await prisma.dimensionConfig.create({
      data: {
        number: i,
        name: `维度${i}-${dimensionNames[i-1]}`,
        description: `与${dimensionNames[i-1]}相关的知识维度`,
        layer: i <= 10 ? 'A' : i <= 20 ? 'B' : i <= 25 ? 'C' : 'D',
        tenantId: 'default-tenant',
      },
    });
  }

  // === 13. 创建 ApiKey ===
  await prisma.apiKey.create({
    data: {
      name: '测试API密钥',
      key: 'akb_test_demo_key_123456',
      projectId,
      ownerId: 'system',
      rateLimit: 60,
      callerType: 'EXTERNAL',
      isActive: true,
    },
  });

  // === 14. 创建 AuditLog (with demo user that we'll create if not exists) ===
  // Try to create a system user for audit logs if one doesn't exist
  let systemUser = await prisma.user.findUnique({ where: { email: 'system@example.com' } });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: 'system@example.com',
        name: 'System User',
        passwordHash: null,
        role: 'READONLY',
        tenantId: 'default-tenant',
        status: 'active',
      }
    });
  }

  const auditLogs = [
    { action: 'CREATE_BLUEPRINT', entityType: 'blueprint', entityId: createdBlueprints[0].id, entityName: createdBlueprints[0].name },
    { action: 'ACTIVATE_ATOM', entityType: 'atom', entityId: createdAtoms[0].id, entityName: createdAtoms[0].title },
    { action: 'CREATE_VERSION_SNAPSHOT', entityType: 'atom', entityId: createdAtoms[1].id, entityName: createdAtoms[1].title },
    { action: 'UPDATE_QA_PAIR', entityType: 'qa_pair', entityId: createdQaPairs[0].id, entityName: '你们公司是做什么的？' },
    { action: 'ASSIGN_AGENT_TO_BLUEPRINT', entityType: 'agent_blueprint', entityId: createdAgents[0].id, entityName: createdAgents[0].name },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: {
        userId: systemUser.id,
        ...log,
        changeSummary: `演示数据创建 - ${log.action}`,
        severity: 'info',
      },
    });
  }

  console.log('演示数据创建完成！');
  console.log(`- 创建了 ${createdRaws.length} 条 Raw 素材`);
  console.log(`- 创建了 ${createdAtoms.length} 个 Atom 原子块`);
  console.log(`- 创建了 ${createdQaPairs.length} 个 QA 对`);
  console.log(`- 创建了 ${createdBlueprints.length} 个 Blueprint`);
  console.log(`- 创建了 ${createdAgents.length} 个 Agent`);
  console.log(`- 创建了 ${createdRuns.length} 条 WorkflowRun`);
  console.log(`- 创建了 30 个 DimensionConfig`);
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