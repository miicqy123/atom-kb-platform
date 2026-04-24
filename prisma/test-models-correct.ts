import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testModels() {
  console.log('测试 Prisma Client 模型访问...');

  // Testing models with CORRECT casing based on actual client
  console.log('Testing raw:', typeof prisma.raw?.create);
  console.log('Testing atom:', typeof prisma.atom?.create);
  console.log('Testing qAPair (correct name from QAPair model):', typeof prisma.qAPair?.create); // From QAPair
  console.log('Testing blueprint:', typeof prisma.blueprint?.create);
  console.log('Testing agent:', typeof prisma.agent?.create);
  console.log('Testing workflowRun:', typeof prisma.workflowRun?.create);
  console.log('Testing evaluationRecord:', typeof prisma.evaluationRecord?.create);
  console.log('Testing reviewTask:', typeof prisma.reviewTask?.create);
  console.log('Testing incident:', typeof prisma.incident?.create);
  console.log('Testing basePack:', typeof prisma.basePack?.create);
  console.log('Testing dimensionConfig:', typeof prisma.dimensionConfig?.create);
  console.log('Testing apiKey (correct name from ApiKey model):', typeof prisma.apiKey?.create); // From ApiKey
  console.log('Testing auditLog:', typeof prisma.auditLog?.create);
  console.log('Testing slotConfig:', typeof prisma.slotConfig?.create);
  console.log('Testing atomBlueprint:', typeof prisma.atomBlueprint?.create);
  console.log('Testing agentBlueprint:', typeof prisma.agentBlueprint?.create);
  console.log('Testing scenarioTag:', typeof prisma.scenarioTag?.create);
  console.log('Testing category:', typeof prisma.category?.create);
  console.log('Testing processedChunk:', typeof prisma.processedChunk?.create);
  console.log('Testing processedQaPair:', typeof prisma.processedQaPair?.create);
  console.log('Testing processedStep:', typeof prisma.processedStep?.create);
  console.log('Testing processedTag:', typeof prisma.processedTag?.create);

  console.log('模型访问测试完成！');
}

testModels()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });