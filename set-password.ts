import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await hash("admin123", 12);
  await prisma.user.update({
    where: { email: "admin@example.com" },
    data: { passwordHash },
  });
  console.log("密码已设置为: admin123");
  await prisma["$disconnect"]();
}

main();