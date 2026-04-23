import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // 验证会话
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取表单数据
    const formData = await req.formData();

    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const projectId = formData.get('projectId') as string;
    const materialType = formData.get('materialType') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 创建上传目录
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // 生成唯一文件名
    const timestamp = Date.now();
    const originalName = file.name;
    const fileExtension = path.extname(originalName);
    const fileName = `${timestamp}_${originalName}`;
    const filePath = path.join(uploadsDir, fileName);

    // 读取文件内容并写入磁盘
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // 根据文件名推断格式
    const fileExtensionUpper = fileExtension.toUpperCase().substring(1);
    let format = 'PDF'; // 默认格式

    switch (fileExtensionUpper) {
      case 'DOC':
      case 'DOCX':
        format = 'WORD';
        break;
      case 'PPT':
      case 'PPTX':
        format = 'PPT';
        break;
      case 'XLS':
      case 'XLSX':
        format = 'EXCEL';
        break;
      case 'TXT':
      case 'MD':
        format = 'WORD'; // 简单处理
        break;
      default:
        format = 'PDF';
    }

    // 保存到数据库
    const newRaw = await prisma.raw.create({
      data: {
        title: title || originalName.replace(/\.[^/.]+$/, ""),
        projectId: projectId || 'test-project',
        format: format as any,
        materialType: materialType as any,
        experienceSource: 'E1_COMPANY',
        originalFileName: originalName,
        originalFileUrl: `/uploads/${fileName}`,
        fileSize: file.size,
        conversionStatus: 'PENDING',
        verificationStatus: 'unverified',
        exposureLevel: 'INTERNAL',
      },
    });

    return NextResponse.json({
      success: true,
      raw: newRaw,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}