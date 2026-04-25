import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name);
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      url: `/uploads/${uniqueName}`,
      originalName: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("文件上传失败:", error);
    return NextResponse.json({ error: "文件上传失败" }, { status: 500 });
  }
}