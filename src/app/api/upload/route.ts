import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成唯一文件名
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${timestamp}_${safeName}`;

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // 根据扩展名自动检测格式
    const ext = path.extname(file.name).toLowerCase();
    const formatMap: Record<string, string> = {
      ".doc": "WORD", ".docx": "WORD",
      ".pdf": "PDF",
      ".ppt": "PPT", ".pptx": "PPT",
      ".xls": "EXCEL", ".xlsx": "EXCEL", ".csv": "EXCEL",
      ".mp3": "AUDIO", ".wav": "AUDIO", ".m4a": "AUDIO", ".flac": "AUDIO",
      ".mp4": "VIDEO", ".avi": "VIDEO", ".mov": "VIDEO", ".mkv": "VIDEO",
      ".png": "SCREENSHOT", ".jpg": "SCREENSHOT", ".jpeg": "SCREENSHOT", ".gif": "SCREENSHOT", ".webp": "SCREENSHOT",
      ".txt": "WORD", ".md": "WORD",
    };
    const detectedFormat = formatMap[ext] || "PDF";

    return NextResponse.json({
      url: `/uploads/${fileName}`,
      originalName: file.name,
      size: buffer.length,
      detectedFormat,
    });
  } catch (error: any) {
    console.error("上传失败:", error);
    return NextResponse.json({ error: error.message || "上传失败" }, { status: 500 });
  }
}