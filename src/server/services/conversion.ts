import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
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

async function convertFileToMarkdown(filePath: string, format: string): Promise<string> {
  const absolutePath = path.join(process.cwd(), "public", filePath);
  const buffer = await readFile(absolutePath);

  switch (format) {
    case "WORD": {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.default.convertToHtml({ buffer });
        return htmlToMarkdown(result.value);
      } catch (e) {
        // mammoth 未安装时回退为纯文本
        return buffer.toString("utf-8");
      }
    }
    case "PDF": {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(buffer);
        return data.text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0).join("\n\n");
      } catch (e) {
        return `> ⚠️ PDF 解析失败: ${(e as Error).message}`;
      }
    }
    case "PPT":
    case "EXCEL":
      return `> ⚠️ ${format} 格式暂不支持自动转换，请手动粘贴内容。\n\n---\n\n（原始文件：${filePath}）`;
    case "AUDIO":
    case "VIDEO":
      return `> ⚠️ 音视频文件需要 ASR 转录服务，当前版本暂不支持。\n\n---\n\n（原始文件：${filePath}）`;
    case "SCREENSHOT":
      return `> ⚠️ 图片文件需要 OCR 识别服务，当前版本暂不支持。\n\n---\n\n（原始文件：${filePath}）`;
    default:
      return buffer.toString("utf-8");
  }
}

export async function runConversion(rawId: string): Promise<void> {
  const raw = await prisma.raw.findUniqueOrThrow({ where: { id: rawId } });

  if (!raw.originalFileUrl) {
    await prisma.raw.update({
      where: { id: rawId },
      data: { conversionStatus: "FAILED", metadata: { error: "没有关联的文件" } as any },
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

    console.log(`✅ Raw ${rawId}（${raw.title}）转换完成，${markdown.length} 字符`);
  } catch (error: any) {
    console.error(`❌ Raw ${rawId} 转换失败:`, error);
    await prisma.raw.update({
      where: { id: rawId },
      data: { conversionStatus: "FAILED", metadata: { error: error.message } as any },
    });
  }
}