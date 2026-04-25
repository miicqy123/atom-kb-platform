import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

// 动态导入 mammoth 仅在需要时使用
async function extractWordText(buffer: ArrayBuffer) {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.default.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  } catch (error) {
    console.error('Error extracting Word document:', error);
    return Buffer.from(buffer).toString('utf-8');
  }
}

// 动态导入 pdf-parse 仅在需要时使用
async function extractPdfText(buffer: ArrayBuffer) {
  try {
    // 在服务器环境中使用 require
    const module = await import('pdf-parse');
    const pdfData = await module.default(Buffer.from(buffer));
    return pdfData.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return '';
  }
}

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

    // 根据文件名推断格式
    const fileExtension = path.extname(file.name).toUpperCase().substring(1);
    let format = 'PDF'; // 默认格式

    // 确定文件类型
    switch (fileExtension) {
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
      case 'PDF':
        format = 'PDF';
        break;
      default:
        format = 'PDF';
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 根据文件格式提取文本内容
    let markdownContent = '';
    let conversionStatus = 'PENDING'; // 默认为PENDING

    try {
      if (format === 'WORD') {
        // 对于WORD格式，尝试使用mammoth提取文本
        markdownContent = await extractWordText(bytes);
        conversionStatus = 'CONVERTED'; // Word文档可以直接转换
      } else if (format === 'PDF') {
        // 对于PDF格式，使用pdf-parse提取文本
        markdownContent = await extractPdfText(bytes);
        conversionStatus = 'CONVERTED'; // PDF文档可以直接转换
      } else if (['PPT', 'EXCEL'].includes(format)) {
        // 对于PPT、EXCEL等非文本格式，标记为PENDING等待后续处理
        markdownContent = '';
        conversionStatus = 'PENDING';
      } else {
        // 对于纯文本格式，直接转换
        markdownContent = buffer.toString('utf-8');
        conversionStatus = 'CONVERTED';
      }
    } catch (error) {
      console.error('Error processing file content:', error);
      // 如果处理失败，仍然创建记录，但标记为失败
      markdownContent = '';
      conversionStatus = 'FAILED';
    }

    // 保存到数据库
    const newRaw = await prisma.raw.create({
      data: {
        title: title || file.name.replace(/\.[^/.]+$/, ""),
        projectId: projectId || 'test-project',
        format: format as any,
        materialType: materialType as any,
        experienceSource: 'E1_COMPANY',
        originalFileName: file.name, // 保留原始文件名
        // 不再有 originalFileUrl 字段（不再存储在本地磁盘）
        fileSize: file.size,
        markdownContent: markdownContent || null, // 可能为空，使用null
        conversionStatus: conversionStatus as any,
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