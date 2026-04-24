// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

  // 确保 uploads 目录存在
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await mkdir(uploadsDir, { recursive: true });

  // 保存文件（加时间戳避免重名）
  const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(uploadsDir, safeFileName);
  await writeFile(filePath, buffer);

  // 创建 Raw 记录
  const raw = await prisma.raw.create({
    data: {
      title: title || file.name.replace(/\.[^.]+$/, ''),
      projectId,
      format: format as any,
      materialType: materialType as any,
      experienceSource: experienceSource as any,
      originalFileName: safeFileName,
      originalFileUrl: `/uploads/${safeFileName}`,
      fileSize: buffer.length,
      conversionStatus: 'PENDING',
      exposureLevel: 'INTERNAL',
    },
  });

  return NextResponse.json({ success: true, rawId: raw.id, title: raw.title });
}