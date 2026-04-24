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

  console.log(`Tenant created/updated: ${tenant.id}`);
  console.log(`Admin user created/updated: ${adminUser.email}`);
  console.log(`Admin password reset to: password123`);
  console.log(`Workspace created/updated: ${workspace.id}`);
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