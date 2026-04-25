import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

async function extractWordText(buffer: ArrayBuffer) {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  } catch (error) {
    console.error("Error extracting Word document:", error);
    return Buffer.from(buffer).toString("utf-8");
  }
}

async function extractPdfText(buffer: ArrayBuffer) {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const lines: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item: any) => "str" in item)
        .map((item: any) => item.str)
        .join(" ");
      if (pageText.trim()) lines.push(pageText.trim());
    }
    return lines.join("\n\n");
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const projectId = formData.get("projectId") as string;
    const materialType = formData.get("materialType") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 上传到 Vercel Blob
    const blob = await put(file.name, file, { access: "public", addRandomSuffix: true });

    // 检测格式
    const ext = path.extname(file.name).toUpperCase().substring(1);
    let format = "PDF";
    switch (ext) {
      case "DOC": case "DOCX": format = "WORD"; break;
      case "PPT": case "PPTX": format = "PPT"; break;
      case "XLS": case "XLSX": format = "EXCEL"; break;
      case "TXT": case "MD": format = "WORD"; break;
    }

    // 提取文本
    const bytes = await file.arrayBuffer();
    let markdownContent = "";
    let conversionStatus = "PENDING";

    try {
      if (format === "WORD") {
        markdownContent = await extractWordText(bytes);
        conversionStatus = "CONVERTED";
      } else if (format === "PDF") {
        markdownContent = await extractPdfText(bytes);
        conversionStatus = "CONVERTED";
      } else if (["PPT", "EXCEL"].includes(format)) {
        conversionStatus = "PENDING";
      } else {
        markdownContent = Buffer.from(bytes).toString("utf-8");
        conversionStatus = "CONVERTED";
      }
    } catch (error) {
      console.error("Error processing file:", error);
      conversionStatus = "FAILED";
    }

    const newRaw = await prisma.raw.create({
      data: {
        title: title || file.name.replace(/\.[^/.]+$/, ""),
        projectId: projectId || "default",
        format: format as any,
        materialType: (materialType || "PRODUCT_DOC") as any,
        experienceSource: "E1_COMPANY",
        originalFileName: file.name,
        originalFileUrl: blob.url,
        fileSize: file.size,
        markdownContent: markdownContent || null,
        conversionStatus: conversionStatus as any,
        verificationStatus: "unverified",
        exposureLevel: "INTERNAL",
      },
    });

    return NextResponse.json({ success: true, raw: newRaw });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}