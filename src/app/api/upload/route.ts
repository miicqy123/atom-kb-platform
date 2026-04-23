import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    console.log("Upload API called");

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
    const format = formData.get('format') as string;
    const experienceSource = formData.get('experienceSource') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 验证必需字段
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // 验证文件类型
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.ppt', '.pptx', '.xls', '.xlsx'];
    const fileExtension = path.extname(file.name).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        error: `Unsupported file type: ${fileExtension}. Allowed types: ${allowedExtensions.join(', ')}`
      }, { status: 400 });
    }

    // 创建上传目录
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // 生成唯一文件名
    const fileId = uuidv4();
    const originalName = file.name;
    const fileName = `${fileId}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // 读取文件内容并写入磁盘
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // 根据文件名推断格式（如果未提供）
    const fileExtensionUpper = fileExtension.toUpperCase().substring(1);
    let computedFormat = (format || '').toUpperCase();

    if (!computedFormat) {
      switch (fileExtensionUpper) {
        case 'DOC':
        case 'DOCX':
          computedFormat = 'WORD';
          break;
        case 'PPT':
        case 'PPTX':
          computedFormat = 'PPT';
          break;
        case 'XLS':
        case 'XLSX':
          computedFormat = 'EXCEL';
          break;
        case 'TXT':
        case 'MD':
          computedFormat = 'WORD';
          break;
        case 'PDF':
          computedFormat = 'PDF';
          break;
        case 'MP3':
        case 'WAV':
        case 'AAC':
          computedFormat = 'AUDIO';
          break;
        case 'MP4':
        case 'MOV':
        case 'AVI':
          computedFormat = 'VIDEO';
          break;
        default:
          computedFormat = 'PDF'; // 默认格式
      }
    }

    // 验证格式枚举值
    const validFormats = ['WORD', 'PDF', 'PPT', 'EXCEL', 'AUDIO', 'VIDEO', 'SCREENSHOT', 'WEB_LINK'];
    if (!validFormats.includes(computedFormat)) {
      computedFormat = 'PDF'; // 使用默认值
    }

    // 确定材料类型（如果未提供）
    let computedMaterialType = materialType || 'OTHER';

    // 验证材料类型枚举值
    const validMaterialTypes = [
      'THEORY', 'CASE_STUDY', 'METHODOLOGY', 'FAQ', 'SCRIPT', 'REGULATION',
      'PRODUCT_DOC', 'TRAINING_MATERIAL', 'MEETING_RECORD', 'CUSTOMER_VOICE',
      'INDUSTRY_REPORT', 'COMPETITOR_ANALYSIS', 'INTERNAL_WIKI', 'OTHER'
    ];
    if (!validMaterialTypes.includes(computedMaterialType)) {
      computedMaterialType = 'OTHER'; // 使用默认值
    }

    // 确定经验来源（如果未提供）
    let computedExperienceSource = experienceSource || 'E1_COMPANY';

    // 验证经验来源枚举值
    const validExperienceSources = ['E1_COMPANY', 'E2_INDUSTRY', 'E3_CROSS_INDUSTRY'];
    if (!validExperienceSources.includes(computedExperienceSource)) {
      computedExperienceSource = 'E1_COMPANY'; // 使用默认值
    }

    // 保存到数据库
    const newRaw = await prisma.raw.create({
      data: {
        title: title || originalName.replace(/\.[^/.]+$/, ""),
        projectId: projectId,
        format: computedFormat as any,
        materialType: computedMaterialType as any,
        experienceSource: computedExperienceSource as any,
        originalFileName: originalName,
        originalFileUrl: `/uploads/${fileName}`,
        fileSize: file.size,
        conversionStatus: 'PENDING',
        verificationStatus: 'unverified',
        exposureLevel: 'INTERNAL',
      },
    });

    console.log("File uploaded successfully:", newRaw.id);

    return NextResponse.json({
      success: true,
      raw: newRaw,
    });
  } catch (error) {
    console.error('Upload error:', error);

    // 更详细的错误日志
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message,
      details: (error as Error).message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}