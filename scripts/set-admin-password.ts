import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function setAdminPassword() {
  try {
    // 设置管理员用户的密码为 'password'（经过 bcrypt 哈希）
    const passwordHash = await hash('password', 10);

    const updatedUser = await prisma.user.update({
      where: { email: 'admin@demo.com' },
      data: {
        passwordHash: passwordHash,
        // 如果没有密码哈希，则更新它
      },
    });

    console.log('Default admin password has been set.');
    console.log('Email: admin@demo.com');
    console.log('Password: password');

  } catch (error) {
    console.error('Error setting admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminPassword();