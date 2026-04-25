import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[ou]l[^>]*>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<tr[^>]*>(.*?)<\/tr>/gi, (_, row) => {
    const cells = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi) || [];
    const values = cells.map((c: string) => c.replace(/<\/?t[dh][^>]*>/gi, "").trim());
    return "| " + values.join(" | ") + " |\n";
  });
  md = md.replace(/<\/?table[^>]*>/gi, "\n");
  md = md.replace(/<\/?thead[^>]*>/gi, "");
  md = md.replace(/<\/?tbody[^>]*>/gi, "");
  md = md.replace(/<[^>]+>/g, "");
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  return md.trim();
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const headers: Record<string, string> = {};
  if (url.includes("blob.vercel-storage.com")) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error("Download failed: " + res.status + " " + res.statusText);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function readLocalFile(filePath: string): Promise<Buffer> {
  const { readFile } = await import("fs/promises");
  const absolutePath = path.join(process.cwd(), "public", filePath);
  return readFile(absolutePath);
}

async function getFileBuffer(filePath: string): Promise<Buffer> {
  if (filePath.startsWith("http")) {
    return downloadBuffer(filePath);
  } else if (filePath.startsWith("data:")) {
    const base64Part = filePath.split(",")[1];
    if (!base64Part) throw new Error("Invalid data URL");
    return Buffer.from(base64Part, "base64");
  } else {
    return readLocalFile(filePath);
  }
}

async function convertFileToMarkdown(filePath: string, format: string): Promise<string> {
  const buffer = await getFileBuffer(filePath);

  switch (format) {
    case "WORD": {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.default.convertToHtml({ buffer });
        return htmlToMarkdown(result.value);
      } catch (e) {
        return buffer.toString("utf-8");
      }
    }
    case "PDF": {
      try {
        const { pdfBufferToMarkdown } = await import("./pdf-to-markdown");
        return await pdfBufferToMarkdown(buffer);
      } catch (e) {
        console.error("[PDF] Conversion error:", e);
        return "> PDF 转换失败: " + (e as Error).message;
      }
    }
    case "PPT":
    case "EXCEL":
      return "> " + format + " format is not supported for auto-conversion yet.\n\n---\n\nOriginal file: " + filePath;
    case "AUDIO":
    case "VIDEO":
      return "> Audio/Video files require ASR transcription service (not available yet).\n\n---\n\nOriginal file: " + filePath;
    case "SCREENSHOT":
      return "> Image files require OCR service (not available yet).\n\n---\n\nOriginal file: " + filePath;
    default:
      return buffer.toString("utf-8");
  }
}

export async function runConversion(rawId: string): Promise<void> {
  const raw = await prisma.raw.findUniqueOrThrow({ where: { id: rawId } });

  if (!raw.originalFileUrl) {
    await prisma.raw.update({
      where: { id: rawId },
      data: { conversionStatus: "FAILED", metadata: { error: "No file URL" } as any },
    });
    return;
  }

  try {
    await prisma.raw.update({
      where: { id: rawId },
      data: { conversionStatus: "CONVERTING" },
    });

    const markdown = await convertFileToMarkdown(raw.originalFileUrl, raw.format);

    await prisma.raw.update({
      where: { id: rawId },
      data: { markdownContent: markdown, conversionStatus: "CONVERTED" },
    });

    console.log("[OK] Raw " + rawId + " converted, " + markdown.length + " chars");
  } catch (error: any) {
    console.error("[FAIL] Raw " + rawId + " conversion failed:", error);
    await prisma.raw.update({
      where: { id: rawId },
      data: { conversionStatus: "FAILED", metadata: { error: error.message } as any },
    });
  }
}