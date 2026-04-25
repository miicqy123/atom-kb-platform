import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 10MB" }, { status: 400 });
    }

    const blob = await put(file.name, file, { access: "private", addRandomSuffix: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const formatMap: Record<string, string> = {
      doc: "WORD", docx: "WORD", txt: "WORD", md: "WORD",
      pdf: "PDF",
      ppt: "PPT", pptx: "PPT",
      xls: "EXCEL", xlsx: "EXCEL", csv: "EXCEL",
      mp3: "AUDIO", wav: "AUDIO", m4a: "AUDIO", flac: "AUDIO",
      mp4: "VIDEO", avi: "VIDEO", mov: "VIDEO", mkv: "VIDEO",
      png: "SCREENSHOT", jpg: "SCREENSHOT", jpeg: "SCREENSHOT", gif: "SCREENSHOT", webp: "SCREENSHOT",
    };

    return NextResponse.json({
      success: true,
      url: blob.url,
      originalName: file.name,
      size: file.size,
      detectedFormat: formatMap[ext] || "PDF",
    });
  } catch (error: any) {
    console.error("上传失败:", error);
    return NextResponse.json({ error: error.message || "上传失败" }, { status: 500 });
  }
}