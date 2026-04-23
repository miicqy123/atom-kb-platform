import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();
  
  const user = await prisma.user.findUnique({
    where: { email: "admin@example.com" }
  });
  
  if (!user) {
    console.log("用户不存在！");
    // 列出所有用户
    const allUsers = await prisma.user.findMany({ select: { email: true, name: true, passwordHash: true } });
    console.log("数据库中的所有用户：", allUsers);
  } else {
    console.log("找到用户：", user.email);
    console.log("有密码：", !!user.passwordHash);
    if (user.passwordHash) {
      const match = await bcrypt.compare("admin123", user.passwordHash);
      console.log("密码匹配：", match);
    }
  }
  
  await prisma.$disconnect();
}

main();