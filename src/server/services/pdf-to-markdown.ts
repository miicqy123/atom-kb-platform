import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";

interface TextBlock {
  text: string;
  fontSize: number;
  fontName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isBold: boolean;
  pageNum: number;
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return "str" in item;
}

/**
 * 纯 Node.js PDF → Markdown 转换器
 * 使用 pdfjs-dist legacy 构建（无 DOMMatrix 依赖）
 */
export async function pdfBufferToMarkdown(buffer: Buffer): Promise<string> {
  // 动态导入 legacy 构建（专为 Node.js，不需要 DOMMatrix/Canvas）
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data: uint8, useSystemFonts: true }).promise;

  const allBlocks: TextBlock[] = [];

  // ---- 第 1 步：提取所有文本块 ----
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    for (const item of content.items) {
      if (!isTextItem(item) || !item.str.trim()) continue;

      const tx = item.transform; // [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12;
      const fontName = item.fontName || "";
      const isBold = /bold/i.test(fontName) || /Black/i.test(fontName);

      allBlocks.push({
        text: item.str,
        fontSize: Math.round(fontSize * 10) / 10,
        fontName,
        x: tx[4],
        y: tx[5],
        width: item.width,
        height: item.height,
        isBold,
        pageNum: p,
      });
    }
  }

  if (allBlocks.length === 0) {
    return "> PDF 内容为空（可能是扫描件/图片 PDF），建议上传 Word 版本或使用 OCR 服务。";
  }

  // ---- 第 2 步：统计字号分布，推断标题层级 ----
  const fontSizeCount = new Map<number, number>();
  for (const b of allBlocks) {
    fontSizeCount.set(b.fontSize, (fontSizeCount.get(b.fontSize) || 0) + b.text.length);
  }

  // 按字符数排序，出现最多的字号 = 正文
  const sorted = Array.from(fontSizeCount.entries()).sort((a, b) => b[1] - a[1]);
  const bodyFontSize = sorted[0]?.[0] || 12;

  // 比正文大的字号 → 标题；按大小排序分配 h1/h2/h3
  const headingSizes = Array.from(new Set(
    allBlocks
      .filter(b => b.fontSize > bodyFontSize + 0.5)
      .map(b => b.fontSize)
  )).sort((a, b) => b - a); // 从大到小

  function getHeadingLevel(fontSize: number): number {
    const idx = headingSizes.indexOf(fontSize);
    if (idx === -1) return 0; // 非标题
    return Math.min(idx + 1, 4); // h1 ~ h4
  }

  // ---- 第 3 步：按页+行分组，合并为段落 ----
  // 按 pageNum 和 y 坐标（倒序，PDF 坐标从底部算起）分行
  const lines: Array<{ text: string; fontSize: number; isBold: boolean; y: number; pageNum: number }> = [];

  let currentLine = { texts: [allBlocks[0]], y: allBlocks[0].y, pageNum: allBlocks[0].pageNum };

  for (let i = 1; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    const yDiff = Math.abs(block.y - currentLine.y);
    const samePage = block.pageNum === currentLine.pageNum;

    if (samePage && yDiff < block.fontSize * 0.6) {
      // 同一行
      currentLine.texts.push(block);
    } else {
      // 新行：先保存上一行
      const lineTexts = currentLine.texts.sort((a, b) => a.x - b.x);
      const maxFontBlock = lineTexts.reduce((max, b) => b.fontSize > max.fontSize ? b : max, lineTexts[0]);
      lines.push({
        text: lineTexts.map(b => b.text).join(" ").trim(),
        fontSize: maxFontBlock.fontSize,
        isBold: maxFontBlock.isBold,
        y: currentLine.y,
        pageNum: currentLine.pageNum,
      });
      currentLine = { texts: [block], y: block.y, pageNum: block.pageNum };
    }
  }
  // 别忘了最后一行
  if (currentLine.texts.length > 0) {
    const lineTexts = currentLine.texts.sort((a, b) => a.x - b.x);
    const maxFontBlock = lineTexts.reduce((max, b) => b.fontSize > max.fontSize ? b : max, lineTexts[0]);
    lines.push({
      text: lineTexts.map(b => b.text).join(" ").trim(),
      fontSize: maxFontBlock.fontSize,
      isBold: maxFontBlock.isBold,
      y: currentLine.y,
      pageNum: currentLine.pageNum,
    });
  }

  // ---- 第 4 步：转为 Markdown ----
  const mdLines: string[] = [];
  let prevWasHeading = false;

  for (const line of lines) {
    if (!line.text.trim()) continue;

    // 跳过疑似页眉页脚（很短 + 纯数字）
    if (/^\d{1,4}$/.test(line.text.trim())) continue;

    const headingLevel = getHeadingLevel(line.fontSize);

    if (headingLevel > 0) {
      // 标题
      if (mdLines.length > 0) mdLines.push(""); // 标题前空行
      mdLines.push("#".repeat(headingLevel) + " " + line.text.trim());
      mdLines.push(""); // 标题后空行
      prevWasHeading = true;
    } else if (line.isBold && line.text.length < 80) {
      // 粗体短行 → 当作加粗段落标题
      if (!prevWasHeading && mdLines.length > 0) mdLines.push("");
      mdLines.push("**" + line.text.trim() + "**");
      mdLines.push("");
      prevWasHeading = false;
    } else {
      // 正文
      const lastLine = mdLines[mdLines.length - 1];

      // 尝试合并断行的段落（上一行不是空行、不是标题、不以句号结尾）
      if (
        lastLine &&
        lastLine.trim() !== "" &&
        !lastLine.startsWith("#") &&
        !lastLine.startsWith("**") &&
        !lastLine.endsWith("。") &&
        !lastLine.endsWith(".") &&
        !lastLine.endsWith("：") &&
        !lastLine.endsWith(":") &&
        !lastLine.endsWith("；")
      ) {
        // 合并到上一行
        mdLines[mdLines.length - 1] = lastLine + line.text.trim();
      } else {
        mdLines.push(line.text.trim());
      }
      prevWasHeading = false;
    }
  }

  // 清理连续空行
  const result = mdLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return result || "> PDF 未提取到有效文本内容";
}
