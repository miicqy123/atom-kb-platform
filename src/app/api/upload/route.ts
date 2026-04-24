// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(Buffer.from(buffer));
    return pdfData.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return '';
  }
}

const FORMAT_MAP: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'WORD',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'WORD',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
  'application/vnd.ms-excel': 'EXCEL',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'EXCEL',
  'audio/mpeg': 'AUDIO',
  'audio/wav': 'AUDIO',
  'video/mp4': 'VIDEO',
  'image/png': 'SCREENSHOT',
  'image/jpeg': 'SCREENSHOT',
  'text/plain': 'WORD',
  'text/markdown': 'WORD',
  'text/html': 'WORD',
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const projectId = formData.get('projectId') as string;
  const title = formData.get('title') as string;
  const materialType = (formData.get('materialType') as string) || 'OTHER';
  const experienceSource = (formData.get('experienceSource') as string) || 'E1_COMPANY';

  if (!file || !projectId) {
    return NextResponse.json({ error: '缺少 file 或 projectId' }, { status: 400 });
  }

  const format = FORMAT_MAP[file.type] || 'WORD';
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 根据文件格式提取文本内容
  let markdownContent = '';
  let conversionStatus = 'PENDING'; // 默认为PENDING，因为还需要后续处理

  try {
    if (format === 'WORD') {
      // 对于WORD格式，尝试使用mammoth提取文本
      markdownContent = await extractWordText(bytes);
      conversionStatus = 'CONVERTED'; // Word文档可以直接转换
    } else if (format === 'PDF') {
      // 对于PDF格式，使用pdf-parse提取文本
      markdownContent = await extractPdfText(bytes);
      conversionStatus = 'CONVERTED'; // PDF文档可以直接转换
    } else if (['PPT', 'EXCEL', 'AUDIO', 'VIDEO', 'SCREENSHOT'].includes(format)) {
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

  // 创建 Raw 记录
  const raw = await prisma.raw.create({
    data: {
      title: title || file.name.replace(/\.[^.]+$/, ''),
      projectId,
      format: format as any,
      materialType: materialType as any,
      experienceSource: experienceSource as any,
      originalFileName: file.name, // 保留原始文件名
      // 不再有 originalFileUrl 字段（不再存储在本地磁盘）
      fileSize: buffer.length,
      markdownContent: markdownContent || null, // 可能为空，使用null
      conversionStatus: conversionStatus as any,
      exposureLevel: 'INTERNAL',
    },
  });

  return NextResponse.json({ success: true, rawId: raw.id, title: raw.title });
}