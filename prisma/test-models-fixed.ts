import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testModels() {
  console.log('测试 Prisma Client 模型访问...');

  // Testing models with correct casing based on schema
  console.log('Testing raw:', typeof prisma.raw.create);
  console.log('Testing atom:', typeof prisma.atom.create);
  console.log('Testing qAPair (correct name from QAPair model):', typeof prisma.qAPair?.create); // From QAPair
  console.log('Testing qAPair (correct name):', typeof prisma.qAPair.create); // From QAPair in schema
  console.log('Testing blueprint:', typeof prisma.blueprint.create);
  console.log('Testing agent:', typeof prisma.agent.create);
  console.log('Testing workflowRun:', typeof prisma.workflowRun.create);
  console.log('Testing evaluationRecord:', typeof prisma.evaluationRecord.create);
  console.log('Testing reviewTask:', typeof prisma.reviewTask.create);
  console.log('Testing incident:', typeof prisma.incident.create);
  console.log('Testing basePack:', typeof prisma.basePack.create);
  console.log('Testing dimensionConfig:', typeof prisma.dimensionConfig.create);
  console.log('Testing apiKey (should be ApiKey):', typeof prisma.apiKey?.create);
  console.log('Testing ApiKey (correct name):', typeof prisma.apiKey.create); // Actually ApiKey in schema
  console.log('Testing auditLog:', typeof prisma.auditLog.create);
  console.log('Testing slotConfig:', typeof prisma.slotConfig.create);
  console.log('Testing atomBlueprint:', typeof prisma.atomBlueprint.create);
  console.log('Testing agentBlueprint:', typeof prisma.agentBlueprint.create);

  // Check actual generated model names based on schema
  console.log('\nChecking if QAPair exists as qaPair:');
  if ('qaPair' in prisma) {
    console.log('qaPair exists in prisma client');
  } else {
    console.log('qaPair does NOT exist in prisma client');
    // Try the actual schema name
    console.log('Trying to access QAPair model directly...');
    // In Prisma, PascalCase model names become camelCase in the client
    console.log('Testing prisma.qAPair (camelCase of QAPair):', typeof prisma.qAPair?.create);
  }

  console.log('\nChecking if ApiKey exists as apiKey:');
  if ('apiKey' in prisma) {
    console.log('apiKey exists in prisma client');
  } else {
    console.log('apiKey does NOT exist in prisma client');
  }

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