"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import {
  Upload, Search, FileText, FileSpreadsheet, Headphones, Image, Globe,
  Trash2, Eye, RotateCcw, X, AlertCircle
} from "lucide-react";

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  WORD: <FileText className="h-4 w-4 text-blue-500" />,
  PDF: <FileText className="h-4 w-4 text-red-500" />,
  EXCEL: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  PPT: <FileText className="h-4 w-4 text-orange-500" />,
  AUDIO: <Headphones className="h-4 w-4 text-purple-500" />,
  VIDEO: <Headphones className="h-4 w-4 text-pink-500" />,
  SCREENSHOT: <Image className="h-4 w-4 text-orange-500" />,
  WEB_LINK: <Globe className="h-4 w-4 text-cyan-500" />,
};

export default function RawMaterialsPage() {
  const { currentProject } = useProjectStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // 搜索防抖 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.raw.list.useQuery(
    {
      projectId: currentProject?.id ?? "",
      page,
      search: debouncedSearch || undefined,
      format: formatFilter || undefined,
      conversionStatus: statusFilter || undefined,
    },
    { enabled: !!currentProject, refetchInterval: 3000 }
  );

  const startConversion = trpc.raw.startConversion.useMutation({
    onSuccess: () => utils.raw.list.invalidate(),
  });

  const deleteRaw = trpc.raw.delete.useMutation({
    onSuccess: () => utils.raw.list.invalidate(),
  });

  const previewData = trpc.raw.getById.useQuery(
    { id: previewId! },
    { enabled: !!previewId }
  );

  const columns: Column<any>[] = [
    {
      key: "title",
      label: "素材名称",
      render: (r) => (
        <div className="flex items-center gap-2">
          {FORMAT_ICONS[r.format] ?? <FileText className="h-4 w-4" />}
          <div>
            {r.title}
            {r.originalFileName && (
              <p className="text-xs text-gray-400 truncate max-w-[200px]">{r.originalFileName}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "materialType",
      label: "材料类型",
      render: (r) => r.materialType,
    },
    {
      key: "experienceSource",
      label: "经验源",
      render: (r) => r.experienceSource,
    },
    {
      key: "fileSize",
      label: "大小",
      render: (r) => (
        <span>
          {r.fileSize ? (r.fileSize > 1024 * 1024 ? `${(r.fileSize / 1024 / 1024).toFixed(1)} MB` : `${(r.fileSize / 1024).toFixed(0)} KB`) : "-"}
        </span>
      ),
    },
    {
      key: "conversionStatus",
      label: "转换状态",
      render: (r) => <StatusBadge status={r.conversionStatus} />,
    },
    {
      key: "_count",
      label: "关联",
      render: (r) => (
        <span>
          Atoms:{r._count?.atoms ?? 0} QA:{r._count?.qaPairs ?? 0}
        </span>
      ),
    },
    {
      key: "actions",
      label: "操作",
      render: (r) => (
        <div className="flex gap-1">
          {r.conversionStatus === "PENDING" && (
            <button
              onClick={(e) => { e.stopPropagation(); startConversion.mutate({ id: r.id }); }}
              className="rounded bg-brand px-2 py-1 text-xs text-white hover:bg-brand-dark"
            >
              启动加工
            </button>
          )}
          {r.conversionStatus === "CONVERTING" && (
            <span>
              转换中…
            </span>
          )}
          {r.conversionStatus === "CONVERTED" && (
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewId(r.id); }}
              className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100 flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />Markdown
            </button>
          )}
          {r.conversionStatus === "FAILED" && (
            <button
              onClick={(e) => { e.stopPropagation(); startConversion.mutate({ id: r.id }); }}
              className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />重试
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确定删除「${r.title}」？`)) deleteRaw.mutate({ id: r.id });
            }}
            className="rounded border border-red-200 px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Raw 素材管理"
        description="管理企业上传的原始资料文件，启动格式归一与双轨加工"
        actions={
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark"
          >
            <Upload className="h-4 w-4" />
            上传素材
          </button>
        }
      />

      {!currentProject && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          请先在顶部选择一个 Project
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索素材名称…"
            className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm"
          />
        </div>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">全部格式</option>
          {["WORD", "PDF", "PPT", "EXCEL", "AUDIO", "VIDEO", "SCREENSHOT", "WEB_LINK"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">全部状态</option>
          {["PENDING", "CONVERTING", "CONVERTED", "FAILED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} loading={isLoading} />

      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}

      {/* 上传弹窗 */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => utils.raw.list.invalidate()}
        />
      )}

      {/* Markdown 预览弹窗 */}
      {previewId && previewData.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[800px] max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{previewData.data.title} — Markdown 预览</h2>
              <button
                onClick={() => setPreviewId(null)}
                className="rounded-lg p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {previewData.data.markdownContent ? (
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700 bg-gray-50 rounded-lg p-4">
                  {previewData.data.markdownContent}
                </pre>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>暂无 Markdown 内容</p>
                  <p className="text-xs mt-1">请先点击「启动加工」进行格式转换</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== 上传弹窗组件 ========== */
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { currentProject } = useProjectStore();
  const createRaw = trpc.raw.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    format: "PDF",
    materialType: "PRODUCT_DOC",
    experienceSource: "E1_COMPANY",
  });

  // 格式自动检测
  const FORMAT_MAP: Record<string, string> = {
    ".doc": "WORD", ".docx": "WORD", ".txt": "WORD", ".md": "WORD",
    ".pdf": "PDF",
    ".ppt": "PPT", ".pptx": "PPT",
    ".xls": "EXCEL", ".xlsx": "EXCEL", ".csv": "EXCEL",
    ".mp3": "AUDIO", ".wav": "AUDIO", ".m4a": "AUDIO", ".flac": "AUDIO",
    ".mp4": "VIDEO", ".avi": "VIDEO", ".mov": "VIDEO", ".mkv": "VIDEO",
    ".png": "SCREENSHOT", ".jpg": "SCREENSHOT", ".jpeg": "SCREENSHOT",
    ".gif": "SCREENSHOT", ".webp": "SCREENSHOT",
  };

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    setUploadError("");

    // 自动填充标题
    const nameWithoutExt = selectedFile.name.replace(/\.[^./]+$/, "");
    if (!form.title) {
      setForm((prev) => ({ ...prev, title: nameWithoutExt }));
    }

    // 自动检测格式
    const ext = "." + selectedFile.name.split(".").pop()?.toLowerCase();
    const detected = FORMAT_MAP[ext];
    if (detected) {
      setForm((prev) => ({ ...prev, format: detected }));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  async function handleSubmit() {
    if (!file || !currentProject) return;

    setUploading(true);
    setUploadError("");
    try {
      // Step 1: 上传文件
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "上传失败");
      }

      const uploadData = await uploadRes.json();

      // Step 2: 创建 Raw 记录
      await createRaw.mutateAsync({
        title: form.title || file.name,
        projectId: currentProject.id,
        format: form.format,
        materialType: form.materialType,
        experienceSource: form.experienceSource,
        originalFileUrl: uploadData.url,
        originalFileName: uploadData.originalName,
        fileSize: uploadData.size,
      });
    } catch (err: any) {
      setUploadError(err.message || "操作失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">上传素材</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 拖拽上传区 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-brand bg-blue-50" : file ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".doc,.docx,.pdf,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.mp3,.wav,.m4a,.mp4,.avi,.mov,.png,.jpg,.jpeg,.gif,.webp"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFileSelect(selected);
            }}
          />
          {file ? (
            <div>
              <FileText className="mx-auto h-10 w-10 text-green-500" />
              <p className="mt-2 text-sm font-medium text-green-700">{file.name}</p>
              <p className="text-xs text-green-500">
                {(file.size / 1024).toFixed(0)} KB · 点击重新选择
              </p>
            </div>
          ) : (
            <div>
              <Upload className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">拖拽文件到此处，或点击选择文件</p>
              <p className="text-xs text-gray-400">
                支持 Word / PDF / PPT / Excel / 音视频 / 截图
              </p>
            </div>
          )}
        </div>

        {/* 表单 */}
        <div className="mt-4 space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="素材名称（可自动填充）"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-3 gap-3">
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {["WORD", "PDF", "PPT", "EXCEL", "AUDIO", "VIDEO", "SCREENSHOT", "WEB_LINK"].map(
                (f) => <option key={f} value={f}>{f}</option>
              )}
            </select>

            <select
              value={form.materialType}
              onChange={(e) => setForm({ ...form, materialType: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {[
                "THEORY", "CASE_STUDY", "METHODOLOGY", "FAQ", "SCRIPT", "REGULATION",
                "PRODUCT_DOC", "TRAINING_MATERIAL", "MEETING_RECORD", "CUSTOMER_VOICE",
                "INDUSTRY_REPORT", "COMPETITOR_ANALYSIS", "INTERNAL_WIKI", "OTHER",
              ].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={form.experienceSource}
              onChange={(e) => setForm({ ...form, experienceSource: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="E1_COMPANY">E1 企业经验</option>
              <option value="E2_INDUSTRY">E2 行业经验</option>
              <option value="E3_CROSS_INDUSTRY">E3 跨行业</option>
            </select>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />{uploadError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || !form.title || uploading}
            className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {uploading ? "上传中…" : "上传并保存"}
          </button>
        </div>
      </div>
    </div>
  );
}