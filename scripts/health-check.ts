// scripts/health-check.ts
// 运行：npx tsx scripts/health-check.ts
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔍 健康检查开始...\n');

  // 1. DB 连接
  const tenantCount = await prisma.tenant.count();
  console.log(`✅ DB 连接正常，Tenant 数量：${tenantCount}`);

  // 2. Project 数量
  const projectCount = await prisma.project.count();
  console.log(`✅ Project 数量：${projectCount}`);

  // 3. Raw 素材
  const rawCount = await prisma.raw.count();
  const convertedCount = await prisma.raw.count({ where: { conversionStatus: 'CONVERTED' } });
  console.log(`✅ Raw 素材：${rawCount} 总计，${convertedCount} 已转换`);

  // 4. Atom 原子块
  const atomCount = await prisma.atom.count();
  const activeAtomCount = await prisma.atom.count({ where: { status: 'ACTIVE' } });
  console.log(`✅ Atom 原子块：${atomCount} 总计，${activeAtomCount} 已激活`);

  // 5. QA Pairs
  const qaCount = await prisma.qAPair.count();
  console.log(`✅ QA Pairs：${qaCount}`);

  // 6. Blueprint
  const bpCount = await prisma.blueprint.count();
  console.log(`✅ Blueprint：${bpCount}`);

  // 7. WorkflowRun
  const runCount = await prisma.workflowRun.count();
  const successCount = await prisma.workflowRun.count({ where: { status: 'SUCCESS' } });
  const hitlCount = await prisma.reviewTask.count({ where: { status: 'PENDING' } });
  console.log(`✅ WorkflowRun：${runCount} 总计，${successCount} 成功`);
  console.log(`⚠️  待审核 HITL 任务：${hitlCount}`);

  // 8. 向量库（本地文件版）
  try {
    const { checkHealth } = await import('../src/services/vectorService');
    const isHealthy = await checkHealth();
    if (isHealthy) {
      const fs = await import('fs');
      const path = await import('path');
      const dbPath = path.join(process.cwd(), 'uploads', 'vector-db.json');
      if (fs.existsSync(dbPath)) {
        const dbContent = fs.readFileSync(dbPath, 'utf-8');
        const db = JSON.parse(dbContent);
        console.log(`✅ 本地向量库正常，已索引 ${db.entries.length} 条记录`);
      } else {
        console.log(`⚠️  向量库文件不存在（首次运行正常，执行「批量向量化」后生成）`);
      }
    } else {
      console.log(`❌ 向量库健康检查失败`);
    }
  } catch (e) {
    console.log(`❌ 向量库读取失败`);
  }

  console.log('\n🎉 检查完成');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ 检查出错：', e);
  process.exit(1);
});