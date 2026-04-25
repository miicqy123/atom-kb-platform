"use client";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Download, Headphones, File } from "lucide-react";

// ===================== Loading / Error / 下载兜底 =====================

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-20 text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ErrorState({ message, url }: { message: string; url?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
      <AlertCircle className="w-12 h-12 text-red-300" />
      <p className="text-sm text-red-500">{message}</p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 shadow-sm"
        >
          <Download className="w-4 h-4" /> 直接下载文件
        </a>
      )}
    </div>
  );
}

function DownloadFallback({ url, title }: { url: string; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
      <File className="w-16 h-16 text-gray-300" />
      <p className="text-sm text-gray-500">该格式暂不支持在线预览</p>
      <p className="text-xs text-gray-400">{title}</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 shadow-sm"
      >
        <Download className="w-4 h-4" /> 下载文件
      </a>
    </div>
  );
}

// ===================== Word 预览（mammoth） =====================

function WordPreview({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`下载失败 (${response.status})`);
        const buffer = await response.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        if (!cancelled) setHtml(result.value);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "解析失败");
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (error) return <ErrorState message={`Word 解析失败：${error}`} url={url} />;
  if (!html) return <LoadingState text="正在解析 Word 文档..." />;

  return (
    <div
      className="h-full overflow-y-auto px-6 py-4 prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ===================== Excel 预览（SheetJS / xlsx） =====================

function ExcelPreview({ url }: { url: string }) {
  const [sheets, setSheets] = useState<{ name: string; html: string }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`下载失败 (${response.status})`);
        const buffer = await response.arrayBuffer();
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(buffer, { type: "array" });
        const allSheets = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const html = XLSX.utils.sheet_to_html(sheet);
          return { name, html };
        });
        if (!cancelled) setSheets(allSheets);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "解析失败");
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (error) return <ErrorState message={`Excel 解析失败：${error}`} url={url} />;
  if (sheets.length === 0) return <LoadingState text="正在解析 Excel 文档..." />;

  return (
    <div className="h-full flex flex-col">
      {/* Sheet Tab 栏 */}
      {sheets.length > 1 && (
        <div className="flex gap-1 px-4 pt-3 pb-2 border-b overflow-x-auto shrink-0">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveSheet(i)}
              className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap ${
                i === activeSheet
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {/* Sheet 内容 */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className="text-xs"
          dangerouslySetInnerHTML={{ __html: sheets[activeSheet]?.html || "" }}
        />
      </div>
    </div>
  );
}

// ===================== 图片预览 =====================

function ImagePreview({ url, title }: { url: string; title: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
      <img
        src={url}
        alt={title}
        className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
      />
    </div>
  );
}

// ===================== 音频预览 =====================

function AudioPreview({ url, title }: { url: string; title: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 py-20">
      <Headphones className="w-16 h-16 text-purple-400" />
      <audio controls className="w-full max-w-md" src={url}>
        您的浏览器不支持音频播放
      </audio>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

// ===================== 视频预览 =====================

function VideoPreview({ url }: { url: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <video controls className="max-w-full max-h-full rounded-lg shadow-sm" src={url}>
        您的浏览器不支持视频播放
      </video>
    </div>
  );
}

// ===================== 主组件：根据 format 自动路由 =====================

interface FilePreviewRendererProps {
  item: {
    format?: string;
    originalFileUrl?: string;
    originalFileName?: string;
    sourceUrl?: string;
    title?: string;
  };
  proxyUrl: string;
}

export default function FilePreviewRenderer({ item, proxyUrl }: FilePreviewRendererProps) {
  if (!item.originalFileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
        <File className="w-12 h-12 mb-3 text-gray-300" />
        <p>暂无原件文件</p>
      </div>
    );
  }

  const format = (item.format || "").toUpperCase();
  const fileName = item.originalFileName || item.title || "";

  // 网页链接
  if (format === "WEB_LINK" && item.sourceUrl) {
    return (
      <div className="w-full h-full flex flex-col">
        <iframe
          src={item.sourceUrl}
          className="w-full flex-1 border-0 rounded-lg"
          title="网页预览"
          sandbox="allow-scripts allow-same-origin"
        />
        <div className="flex items-center justify-center pt-2">
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700">
            在新标签页打开 ↗
          </a>
        </div>
      </div>
    );
  }

  // Word — 使用 mammoth 本地解析
  if (format === "WORD" || /\.docx?$/i.test(fileName)) {
    return <WordPreview url={proxyUrl} />;
  }

  // Excel — 使用 SheetJS 本地解析
  if (format === "EXCEL" || /\.xlsx?$/i.test(fileName)) {
    return <ExcelPreview url={proxyUrl} />;
  }

  // PPT — 不支持前端解析，提供下载降级
  if (format === "PPT" || /\.pptx?$/i.test(fileName)) {
    return <DownloadFallback url={proxyUrl} title={fileName} />;
  }

  // PDF — 通过代理 URL 内嵌 iframe（浏览器的原生 PDF 阅读器）
  if (format === "PDF" || /\.pdf$/i.test(fileName)) {
    return (
      <div className="w-full h-full flex flex-col">
        <iframe
          src={proxyUrl}
          className="w-full flex-1 border-0 rounded-lg"
          title="PDF 预览"
        />
        <div className="flex items-center justify-center pt-2">
          <a href={proxyUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700">
            无法预览？点此在新窗口打开 ↗
          </a>
        </div>
      </div>
    );
  }

  // 图片
  if (format === "SCREENSHOT" || /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(fileName)) {
    return <ImagePreview url={proxyUrl} title={item.title || ""} />;
  }

  // 音频
  if (format === "AUDIO" || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName)) {
    return <AudioPreview url={proxyUrl} title={fileName} />;
  }

  // 视频
  if (format === "VIDEO" || /\.(mp4|webm|mov|avi|mkv)$/i.test(fileName)) {
    return <VideoPreview url={proxyUrl} />;
  }

  // 兜底
  return <DownloadFallback url={proxyUrl} title={fileName} />;
}
