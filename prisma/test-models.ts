import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testModels() {
  console.log('测试 Prisma Client 模型访问...');

  // 测试各种模型是否可以访问
  console.log('Testing raw:', typeof prisma.raw.create);
  console.log('Testing atom:', typeof prisma.atom.create);
  console.log('Testing qaPair:', typeof prisma.qaPair.create);
  console.log('Testing blueprint:', typeof prisma.blueprint.create);
  console.log('Testing agent:', typeof prisma.agent.create);
  console.log('Testing workflowRun:', typeof prisma.workflowRun.create);
  console.log('Testing evaluationRecord:', typeof prisma.evaluationRecord.create);
  console.log('Testing reviewTask:', typeof prisma.reviewTask.create);
  console.log('Testing incident:', typeof prisma.incident.create);
  console.log('Testing basePack:', typeof prisma.basePack.create);
  console.log('Testing dimensionConfig:', typeof prisma.dimensionConfig.create);
  console.log('Testing apiKey:', typeof prisma.apiKey.create);
  console.log('Testing auditLog:', typeof prisma.auditLog.create);
  console.log('Testing slotConfig:', typeof prisma.slotConfig.create);
  console.log('Testing atomBlueprint:', typeof prisma.atomBlueprint.create);
  console.log('Testing agentBlueprint:', typeof prisma.agentBlueprint.create);

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