import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class RawService {
  // 获取指定项目的原始素材列表
  static async getByProjectId(projectId: string, limit?: number, offset?: number) {
    const skip = offset || 0;
    const take = limit || 10;

    const rawMaterials = await prisma.raw.findMany({
      where: { projectId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = await prisma.raw.count({
      where: { projectId }
    });

    return {
      items: rawMaterials,
      totalCount,
      hasMore: skip + take < totalCount
    };
  }

  // 创建原始素材
  static async create(data: {
    title: string;
    projectId: string;
    format: string;
    materialType: string;
    experienceSource: string;
    originalFileName?: string;
    markdownContent?: string;
    fileSize?: number;
  }) {
    return await prisma.raw.create({
      data: {
        title: data.title,
        projectId: data.projectId,
        format: data.format,
        materialType: data.materialType,
        experienceSource: data.experienceSource,
        originalFileName: data.originalFileName,
        markdownContent: data.markdownContent,
        fileSize: data.fileSize,
        conversionStatus: 'PENDING',
        verificationStatus: 'unverified',
        exposureLevel: 'INTERNAL',
      },
    });
  }

  // 根据ID获取原始素材
  static async getById(id: string) {
    return await prisma.raw.findUnique({
      where: { id },
    });
  }

  // 更新原始素材
  static async update(id: string, data: Partial<{
    title: string;
    format: string;
    materialType: string;
    experienceSource: string;
    originalFileName?: string;
    markdownContent?: string;
    conversionStatus: string;
    verificationStatus: string;
    exposureLevel: string;
    fileSize?: number;
  }>) {
    return await prisma.raw.update({
      where: { id },
      data,
    });
  }

  // 删除原始素材
  static async delete(id: string) {
    return await prisma.raw.delete({
      where: { id },
    });
  }
}
