import { promises as fs } from 'fs';
import path from 'path';

export async function saveUploadedFile(file: File, filename: string): Promise<string> {
  // 创建uploads目录如果不存在
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  // 生成唯一的文件名
  const uniqueFilename = `${Date.now()}-${filename}`;
  const filePath = path.join(uploadsDir, uniqueFilename);

  // 将文件保存到磁盘
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return `/uploads/${uniqueFilename}`;
}