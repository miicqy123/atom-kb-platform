"use client";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRouter } from "next/navigation";
import {
  Upload, Search, FileText, FileSpreadsheet, Headphones, Image, Globe,
  Trash2, Eye, RotateCcw, X, AlertCircle, ChevronLeft, ChevronRight,
  Play, ExternalLink, File, Presentation
} from "lucide-react";

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  WORD: <FileText className="h-4 w-4 text-blue-500" />,
  PDF: <FileText className="h-4 w-4 text-red-500" />,
  EXCEL: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  PPT: <Presentation className="h-4 w-4 text-orange-500" />,
  AUDIO: <Headphones className="h-4 w-4 text-purple-500" />,
  VIDEO: <Play className="h-4 w-4 text-pink-500" />,
  SCREENSHOT: <Image className="h-4 w-4 text-cyan-500" />,
  WEB_LINK: <Globe className="h-4 w-4 text-gray-500" />,
};

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  THEORY: "理论知识", CASE_STUDY: "案例分析", METHODOLOGY: "方法论",
  FAQ: "常见问题", SCRIPT: "脚本话术", REGULATION: "规章制度",
  PRODUCT_DOC: "产品文档", TRAINING_MATERIAL: "培训材料",
  MEETING_RECORD: "会议纪要", CUSTOMER_VOICE: "客户声音",
  INDUSTRY_REPORT: "行业报告", COMPETITOR_ANALYSIS: "竞品分析",
  INTERNAL_WIKI: "内部知识库", OTHER: "其他",
};

const EXP_SOURCE_LABELS: Record<string, string> = {
  E1_COMPANY: "E1 企业", E2_INDUSTRY: "E2 行业", E3_CROSS_INDUSTRY: "E3 跨行业",
};

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "-";
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

function getMarkdownPreview(content: string | null | undefined, lines: number = 3): string {
  if (!content) return "";
  return content.split("\n").filter(l => l.trim()).slice(0, lines).join("\n");
}

export default function RawMaterialsPage() {
  const router = useRouter();
  const { currentProject } = useProjectStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expSourceFilter, setExpSourceFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card" | "kanban">("table");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mdSearch, setMdSearch] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [addingToKb, setAddingToKb] = useState(false);
  const [selectedMdIds, setSelectedMdIds] = useState<Set<string>>(new Set());

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
      materialType: typeFilter || undefined,
      conversionStatus: statusFilter || undefined,
      experienceSource: expSourceFilter || undefined,
    },
    { enabled: !!currentProject, refetchInterval: 5000 }
  );

  const startConversion = trpc.raw.startConversion.useMutation({
    onSuccess: () => utils.raw.list.invalidate(),
  });

  const deleteRaw = trpc.raw.delete.useMutation({
    onSuccess: () => {
      utils.raw.list.invalidate();
      setSelectedId(null);
    },
  });

  const updateRaw = trpc.raw.update.useMutation({
    onSuccess: () => utils.raw.list.invalidate(),
  });

  const addToKb = trpc.raw.addToKnowledgeBase.useMutation({
    onSuccess: () => {
      alert("已添加到企业知识库！");
      utils.raw.list.invalidate();
    },
    onError: () => alert("添加失败，请重试"),
  });

  const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const totalPages = data?.totalPages ?? 1;
  const selectedItem = items.find((r: any) => r.id === selectedId);
  const convertedItems = items
    .filter((r: any) => r.conversionStatus === "CONVERTED")
    .filter((r: any) => !mdSearch || r.title.toLowerCase().includes(mdSearch.toLowerCase()) || r.markdownContent?.toLowerCase().includes(mdSearch.toLowerCase()));
  const kanbanGroups = Object.entries(
    items.reduce((acc: Record<string, any[]>, r: any) => {
      const key = r.materialType || "OTHER";
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {})
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Raw 素材管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">管理企业上传的原始资料文件，启动格式归一与双轨加工</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 shadow-sm"
        >
          <Upload className="h-4 w-4" />
          上传素材
        </button>
      </div>

      {/* 提示选择 Project */}
      {!currentProject && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4" />
          请先在顶部选择一个 Project
        </div>
      )}

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-gray-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索素材名称..."
            className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="">全部格式</option>
          {["WORD","PDF","PPT","EXCEL","AUDIO","VIDEO","SCREENSHOT","WEB_LINK"].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="">全部类型</option>
          {Object.entries(MATERIAL_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="">全部状态</option>
          {["PENDING","CONVERTING","CONVERTED","FAILED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={expSourceFilter} onChange={(e) => setExpSourceFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="">全部经验源</option>
          <option value="E1_COMPANY">E1 企业</option>
          <option value="E2_INDUSTRY">E2 行业</option>
          <option value="E3_CROSS_INDUSTRY">E3 跨行业</option>
        </select>
        <div className="flex items-center border rounded-lg overflow-hidden ml-auto shrink-0">
          <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-xs ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </button>
          <button onClick={() => setViewMode("card")} className={`px-3 py-1.5 text-xs ${viewMode === "card" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
          </button>
          <button onClick={() => setViewMode("kanban")} className={`px-3 py-1.5 text-xs ${viewMode === "kanban" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      {viewMode === "table" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 左侧：素材列表 */}
          <div className="flex-1 min-w-0 overflow-y-auto border-r">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">加载中...</div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <File className="h-8 w-8 mb-2" />
                <p className="text-sm">暂无素材，请点击右上角上传</p>
              </div>
            ) : (
              <div className="divide-y">
                {items.map((r: any) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      r.id === selectedId ? "bg-blue-50 border-l-2 border-l-blue-600" : "hover:bg-gray-50 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="shrink-0">
                      {FORMAT_ICONS[r.format] ?? <FileText className="h-4 w-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{MATERIAL_TYPE_LABELS[r.materialType] || r.materialType}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{EXP_SOURCE_LABELS[r.experienceSource] || r.experienceSource}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{formatFileSize(r.fileSize)}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("zh-CN") : ""}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={r.conversionStatus} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-3 border-t">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* 右侧：详情面板 */}
          <div className="w-[400px] shrink-0 overflow-y-auto bg-white">
            {selectedItem ? (
              <div className="p-5 space-y-5">
                {/* 标题 */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{FORMAT_ICONS[selectedItem.format] ?? <FileText className="h-5 w-5" />}</div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 break-words">{selectedItem.title}</h2>
                    {selectedItem.originalFileName && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedItem.originalFileName}</p>
                    )}
                  </div>
                </div>

                {/* 基本信息 */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">基本信息</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">材料类型</div>
                    <div className="font-medium">{MATERIAL_TYPE_LABELS[selectedItem.materialType] || selectedItem.materialType}</div>
                    <div className="text-gray-500">经验源</div>
                    <div className="font-medium">{EXP_SOURCE_LABELS[selectedItem.experienceSource] || selectedItem.experienceSource}</div>
                    <div className="text-gray-500">格式</div>
                    <div className="font-medium">{selectedItem.format}</div>
                    <div className="text-gray-500">大小</div>
                    <div className="font-medium">{formatFileSize(selectedItem.fileSize)}</div>
                    <div className="text-gray-500">上传时间</div>
                    <div className="text-gray-900">{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString("zh-CN") : "-"}</div>
                    <div className="text-gray-500">可对外等级</div>
                    <dd className="text-gray-900">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedItem.exposureLevel === "INTERNAL" ? "bg-gray-100 text-gray-600" :
                        selectedItem.exposureLevel === "EXTERNAL" ? "bg-green-100 text-green-700" :
                        selectedItem.exposureLevel === "NEEDS_APPROVAL" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {{
                          INTERNAL: "仅内部",
                          EXTERNAL: "可对外",
                          NEEDS_APPROVAL: "需审批",
                          STRICTLY_FORBIDDEN: "严禁外发"
                        }[selectedItem.exposureLevel] || selectedItem.exposureLevel}
                      </span>
                    </dd>
                  </div>
                </div>

                {/* 转换状态 */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">转换状态</h3>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedItem.conversionStatus} />
                    {selectedItem.conversionStatus === "PENDING" && (
                      <button
                        onClick={() => startConversion.mutate({ id: selectedItem.id })}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                      >
                        <Play className="h-3 w-3" /> 启动加工
                      </button>
                    )}
                    {selectedItem.conversionStatus === "FAILED" && (
                      <button
                        onClick={() => startConversion.mutate({ id: selectedItem.id })}
                        className="ml-auto flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100"
                      >
                        <RotateCcw className="h-3 w-3" /> 重试
                      </button>
                    )}
                    {selectedItem.conversionStatus === "CONVERTING" && (
                      <span className="ml-auto text-xs text-blue-500 animate-pulse">转换中...</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {selectedItem.originalFileUrl && (
                      <a
                        href={selectedItem.originalFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <Eye className="w-3.5 h-3.5" /> 原件预览
                      </a>
                    )}
                    {selectedItem.conversionStatus === "CONVERTED" && selectedItem.markdownContent && (
                      <button
                        onClick={() => {
                          const el = document.getElementById("md-preview-section");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <FileText className="w-3.5 h-3.5" /> Markdown预览
                      </button>
                    )}
                  </div>
                </div>

                {/* Markdown 预览 */}
                {selectedItem.conversionStatus === "CONVERTED" && selectedItem.markdownContent && (
                  <div id="md-preview-section" className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Markdown 预览</h3>
                    <div className="rounded-lg border bg-gray-50 p-3 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {selectedItem.markdownContent.slice(0, 800)}
                        {selectedItem.markdownContent.length > 800 && "\n\n..."}
                      </pre>
                    </div>
                    <p className="text-xs text-gray-400">
                      共 {selectedItem.markdownContent.length} 字
                    </p>
                  </div>
                )}

                {/* 关联资产 */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">关联资产</h3>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-600">Atoms: <strong>{selectedItem._count?.atoms ?? 0}</strong></span>
                    <span className="text-gray-600">QA: <strong>{selectedItem._count?.qaPairs ?? 0}</strong></span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2 pt-2 border-t">
                  {selectedItem.conversionStatus === "CONVERTED" && (
                    <button
                      onClick={() => router.push("/knowledge/workbench?rawId=" + selectedItem.id)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 shadow-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      进入知识加工工作台
                    </button>
                  )}
                  <button
                    onClick={() => setEditingItem(selectedItem)}
                    className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <FileText className="w-4 h-4" />
                    编辑元数据
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("确定删除「" + selectedItem.title + "」？")) {
                        deleteRaw.mutate({ id: selectedItem.id });
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除素材
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Eye className="h-8 w-8 mb-2" />
                <p className="text-sm">点击左侧素材查看详情</p>
              </div>
            )}
          </div>
        </div>
      )}
      {viewMode === "card" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-4">
              {isLoading ? (
                <div className="col-span-full text-center py-12 text-gray-400">加载中...</div>
              ) : items.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-400">暂无素材</div>
              ) : items.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    r.id === selectedId ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {FORMAT_ICONS[r.format] ?? <File className="w-5 h-5" />}
                    <span className="font-medium text-sm truncate flex-1">{r.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{MATERIAL_TYPE_LABELS[r.materialType] || r.materialType}</span>
                    <span>{EXP_SOURCE_LABELS[r.experienceSource] || r.experienceSource}</span>
                    <span>{formatFileSize(r.fileSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={r.conversionStatus} />
                    {r.conversionStatus === "CONVERTED" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push("/knowledge/workbench?rawId=" + r.id); }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        进入工作台 <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 卡片模式下右侧详情面板 */}
          {selectedItem && (
            <div className="w-[400px] shrink-0 overflow-y-auto border-l bg-white">
              <div className="p-5 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{FORMAT_ICONS[selectedItem.format] ?? <FileText className="h-5 w-5" />}</div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 break-words">{selectedItem.title}</h2>
                    {selectedItem.originalFileName && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedItem.originalFileName}</p>
                    )}
                  </div>
                  <button onClick={() => setSelectedId(null)} className="shrink-0 rounded-lg p-1 hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">基本信息</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">材料类型</div>
                    <div className="font-medium">{MATERIAL_TYPE_LABELS[selectedItem.materialType] || selectedItem.materialType}</div>
                    <div className="text-gray-500">经验源</div>
                    <div className="font-medium">{EXP_SOURCE_LABELS[selectedItem.experienceSource] || selectedItem.experienceSource}</div>
                    <div className="text-gray-500">格式</div>
                    <div className="font-medium">{selectedItem.format}</div>
                    <div className="text-gray-500">大小</div>
                    <div className="font-medium">{formatFileSize(selectedItem.fileSize)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">转换状态</h3>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedItem.conversionStatus} />
                    {selectedItem.conversionStatus === "PENDING" && (
                      <button onClick={() => startConversion.mutate({ id: selectedItem.id })} className="ml-auto flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700">
                        <Play className="h-3 w-3" /> 启动加工
                      </button>
                    )}
                    {selectedItem.conversionStatus === "FAILED" && (
                      <button onClick={() => startConversion.mutate({ id: selectedItem.id })} className="ml-auto flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100">
                        <RotateCcw className="h-3 w-3" /> 重试
                      </button>
                    )}
                    {selectedItem.conversionStatus === "CONVERTING" && (
                      <span className="ml-auto text-xs text-blue-500 animate-pulse">转换中...</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t">
                  {selectedItem.conversionStatus === "CONVERTED" && (
                    <button
                      onClick={() => router.push("/knowledge/workbench?rawId=" + selectedItem.id)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 shadow-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      进入知识加工工作台
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm("确定删除「" + selectedItem.title + "」？")) deleteRaw.mutate({ id: selectedItem.id }); }}
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除素材
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {viewMode === "kanban" && (
        <div className="flex gap-4 p-4 overflow-x-auto min-h-[500px]">
          {isLoading ? (
            <div className="flex-1 text-center py-12 text-gray-400">加载中...</div>
          ) : kanbanGroups.length === 0 ? (
            <div className="flex-1 text-center py-12 text-gray-400">暂无素材</div>
          ) : kanbanGroups.map(([type, groupItems]) => (
            <div key={type} className="flex-shrink-0 w-[280px] bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-medium text-sm text-gray-700">
                  {MATERIAL_TYPE_LABELS[type] || type}
                </span>
                <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
                  {groupItems.length}
                </span>
              </div>
              <div className="space-y-2">
                {groupItems.map((r: any) => (
                  <div
                    key={r.id}
                    onClick={() => { setViewMode("table"); setSelectedId(r.id); }}
                    className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{FORMAT_ICONS[r.format] ?? <File className="w-4 h-4" />}</span>
                      <span className="text-sm font-medium truncate">{r.title}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <StatusBadge status={r.conversionStatus} />
                      <span className="text-gray-400">
                        {EXP_SOURCE_LABELS[r.experienceSource]?.replace(/^E\d\s/, "") || r.experienceSource} · {formatFileSize(r.fileSize)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Markdown 画廊区 */}
      {convertedItems.length > 0 && (
        <div className="border-t bg-gray-50/50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  已转换 Markdown（{convertedItems.length} 篇）
                </h2>
                {selectedMdIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-600 font-medium">已选 {selectedMdIds.size} 篇</span>
                    <button
                      onClick={() => {
                        const ids = Array.from(selectedMdIds).join(",");
                        router.push("/knowledge/workbench?rawIds=" + ids);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                    >
                      <Play className="w-3.5 h-3.5" />
                      多选进入工作台
                    </button>
                    <button
                      onClick={() => setSelectedMdIds(new Set())}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      取消选择
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={mdSearch}
                  onChange={(e) => setMdSearch(e.target.value)}
                  placeholder="搜索Markdown..."
                  className="h-8 w-48 rounded-lg border pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
              {convertedItems.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => setPreviewItem(r)}
                  className="rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedMdIds.has(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = new Set(selectedMdIds);
                        if (e.target.checked) next.add(r.id);
                        else next.delete(r.id);
                        setSelectedMdIds(next);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xl shrink-0">{FORMAT_ICONS[r.format] ?? <FileText className="w-5 h-5" />}</span>
                    <span className="font-medium text-sm truncate">{r.title}</span>
                  </div>
                  {r.markdownContent && (
                    <pre className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3 font-mono mb-2 leading-relaxed">
                      {getMarkdownPreview(r.markdownContent)}
                    </pre>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                        {MATERIAL_TYPE_LABELS[r.materialType] || r.materialType}
                      </span>
                      <span className="text-xs text-gray-400">
                        {r.markdownContent ? r.markdownContent.length + " 字" : ""}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-blue-600 group-hover:text-blue-700 font-medium">
                      进入工作台 <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 上传弹窗 */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => utils.raw.list.invalidate()}
        />
      )}
      {editingItem && (
        <EditMetadataModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => utils.raw.list.invalidate()}
        />
      )}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewItem(null)}>
          <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{FORMAT_ICONS[previewItem.format] ?? <FileText className="w-5 h-5" />}</span>
                <div>
                  <h3 className="font-semibold text-base">{previewItem.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{MATERIAL_TYPE_LABELS[previewItem.materialType] || previewItem.materialType}</span>
                    <span>{EXP_SOURCE_LABELS[previewItem.experienceSource] || previewItem.experienceSource}</span>
                    <span>{previewItem.markdownContent ? previewItem.markdownContent.length + " 字" : ""}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setPreviewItem(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            {/* Markdown 内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                {previewItem.markdownContent || "暂无 Markdown 内容"}
              </pre>
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-t shrink-0 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => addToKb.mutate({ rawId: previewItem.id, projectId: currentProject?.id ?? "" })}
                disabled={addToKb.isLoading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm text-white hover:bg-green-700 shadow-sm disabled:opacity-50"
              >
                <Globe className="w-4 h-4" />
                {addToKb.isLoading ? "添加中..." : "添加到企业知识库"}
              </button>
              <button
                onClick={() => {
                  const id = previewItem.id;
                  setPreviewItem(null);
                  router.push("/knowledge/workbench?rawId=" + id);
                }}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 shadow-sm"
              >
                <Play className="w-4 h-4" />
                进入工作台加工
              </button>
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
    onSuccess: () => { onSuccess(); onClose(); },
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
    const nameWithoutExt = selectedFile.name.replace(/\.[^./]+$/, "");
    if (!form.title) setForm(prev => ({ ...prev, title: nameWithoutExt }));
    const ext = "." + selectedFile.name.split(".").pop()?.toLowerCase();
    const detected = FORMAT_MAP[ext];
    if (detected) setForm(prev => ({ ...prev, format: detected }));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  async function handleSubmit() {
    if (!file || !currentProject) {
      setUploadError("Please select a file and ensure a project is selected");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Response format error" }));
        throw new Error(err.error || "Upload failed: " + uploadRes.status);
      }
      const uploadData = await uploadRes.json();
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
      console.error("Upload error:", err);
      setUploadError(err.message || "Operation failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">上传素材</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-blue-500 bg-blue-50" : file ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
          {file ? (
            <div>
              <FileText className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{formatFileSize(file.size)} · 点击重新选择</p>
            </div>
          ) : (
            <div>
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">拖拽文件到此处，或点击选择文件</p>
              <p className="text-xs text-gray-400 mt-1">支持 Word / PDF / PPT / Excel / 音视频 / 截图</p>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="素材名称（可自动填充）"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="grid grid-cols-3 gap-2">
            <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
              {["WORD","PDF","PPT","EXCEL","AUDIO","VIDEO","SCREENSHOT","WEB_LINK"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
              {Object.entries(MATERIAL_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={form.experienceSource} onChange={(e) => setForm({ ...form, experienceSource: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
              {Object.entries(EXP_SOURCE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{uploadError}</div>
        )}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">取消</button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "上传中..." : "上传并保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========== 编辑元数据弹窗 ========== */
function EditMetadataModal({ item, onClose, onSuccess }: { item: any; onClose: () => void; onSuccess: () => void }) {
  const updateRaw = trpc.raw.update.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });
  const [form, setForm] = useState({
    title: item.title,
    materialType: item.materialType,
    experienceSource: item.experienceSource,
    exposureLevel: item.exposureLevel || "INTERNAL",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">编辑元数据</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">标题</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">材料类型</label>
            <select value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              {Object.entries(MATERIAL_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">经验源</label>
            <select value={form.experienceSource} onChange={(e) => setForm({ ...form, experienceSource: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              {Object.entries(EXP_SOURCE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">可对外等级</label>
            <select value={form.exposureLevel} onChange={(e) => setForm({ ...form, exposureLevel: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="INTERNAL">仅内部</option>
              <option value="EXTERNAL">可对外</option>
              <option value="NEEDS_APPROVAL">需审批</option>
              <option value="STRICTLY_FORBIDDEN">严禁外发</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">取消</button>
          <button onClick={() => updateRaw.mutate({ id: item.id, data: form })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            {updateRaw.isLoading ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}