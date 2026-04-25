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
  let buffer: Buffer;
  if (filePath.startsWith("http")) {
    // 从 Vercel Blob URL 下载
    const res = await fetch(filePath);
    if (!res.ok) throw new Error("下载文件失败: " + res.status);
    const arrayBuf = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } else if (filePath.startsWith("data:")) {
    // Base64 兼容
    const base64Part = filePath.split(",")[1];
    if (!base64Part) throw new Error("无效的 data URL");
    buffer = Buffer.from(base64Part, "base64");
  } else {
    // 本地开发兼容
    const absolutePath = path.join(process.cwd(), "public", filePath);
    buffer = await readFile(absolutePath);
  }

  switch (format) {
    case "WORD": {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.default.convertToHtml({ buffer });
        return htmlToMarkdown(result.value);
      } catch (e) {
        // mammoth 鏈畨瑁呮椂鍥為€€涓虹函鏂囨湰
        return buffer.toString("utf-8");
      }
    }
    case "PDF": {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(buffer);
        return data.text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0).join("\n\n");
      } catch (e) {
        return `> ⚠️ PDF 瑙ｆ瀽澶辫触: ${(e as Error).message}`;
      }
    }
    case "PPT":
    case "EXCEL":
      return `> ⚠️ ${format} 鏍煎紡鏆備笉鏀寔鑷姩杞崲锛岃鎵嬪姩绮樿创鍐呭銆俓n\n---\n\n锛堝師濮嬫枃浠讹細${filePath}锛塦;
    case "AUDIO":
    case "VIDEO":
      return `> ⚠️ 闊宠棰戞枃浠堕渶瑕?ASR 杞綍鏈嶅姟锛屽綋鍓嶇増鏈殏涓嶆敮鎸併€俓n\n---\n\n锛堝師濮嬫枃浠讹細${filePath}锛塦;
    case "SCREENSHOT":
      return `> ⚠️ 鍥剧墖鏂囦欢闇€瑕?OCR 璇嗗埆鏈嶅姟锛屽綋鍓嶇増鏈殏涓嶆敮鎸併€俓n\n---\n\n锛堝師濮嬫枃浠讹細${filePath}锛塦;
    default:
      return buffer.toString("utf-8");
  }
}

export async function runConversion(rawId: string): Promise<void> {
  const raw = await prisma.raw.findUniqueOrThrow({ where: { id: rawId } });

  if (!raw.originalFileUrl) {
    await prisma.raw.update({
      where: { id: rawId },
      data: { conversionStatus: "FAILED", metadata: { error: "娌℃湁鍏宠仈鐨勬枃浠? } as any },
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

    console.log(`✅ Raw ${rawId}锛?{raw.title}锛夎浆鎹㈠畬鎴愶紝${markdown.length} 瀛楃`);
  } catch (error: any) {
    console.error(`❌ Raw ${rawId} 杞崲澶辫触:`, error);
    await prisma.raw.update({
      where: { id: rawId },
      data: { conversionStatus: "FAILED", metadata: { error: error.message } as any },
    });
  }
}