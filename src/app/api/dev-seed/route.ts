import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 检查是否已有租户
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: "Demo 企业", industry: "互联网", contactEmail: "admin@demo.com" },
      });
    }

    // 检查是否已有工作空间
    let workspace = await prisma.workspace.findFirst({ where: { tenantId: tenant.id } });
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: "默认工作空间", tenantId: tenant.id },
      });
    }

    // 检查是否已有用户
    let user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "admin@demo.com",
          name: "管理员",
          role: "SUPER_ADMIN",
          tenantId: tenant.id,
        },
      });
    }

    // 检查是否已有项目
    let project = await prisma.project.findFirst({ where: { workspaceId: workspace.id } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: "示例项目",
          workspaceId: workspace.id,
          ownerId: user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "种子数据已就绪",
      data: { tenantId: tenant.id, workspaceId: workspace.id, userId: user.id, projectId: project.id, projectName: project.name },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}