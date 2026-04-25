"use client";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRouter } from "next/navigation";
import EnterpriseSurveyDialog, { surveyToMarkdown, type SurveyData } from "@/components/knowledge/EnterpriseSurveyDialog";
import {
  Upload, Search, FileText, FileSpreadsheet, Headphones, Image, Globe,
  Trash2, Eye, RotateCcw, X, AlertCircle, ChevronLeft, ChevronRight,
  Play, ExternalLink, File, Presentation, Building2, Edit, LayoutList,
  LayoutGrid, Columns3, Copy
} from "lucide-react";

// ===================== 常量 =====================
const FORMAT_ICONS: Record<string, React.ReactNode> = {
  WORD: <FileText className="w-4 h-4 text-blue-500" />,
  PDF: <File className="w-4 h-4 text-red-500" />,
  EXCEL: <FileSpreadsheet className="w-4 h-4 text-green-500" />,
  PPT: <Presentation className="w-4 h-4 text-orange-500" />,
  AUDIO: <Headphones className="w-4 h-4 text-purple-500" />,
  VIDEO: <Play className="w-4 h-4 text-pink-500" />,
  SCREENSHOT: <Image className="w-4 h-4 text-teal-500" />,
  WEB_LINK: <Globe className="w-4 h-4 text-indigo-500" />,
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

// ===================== Tab 类型 =====================
type TabKey = "list" | "markdown" | "survey";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "list", label: "素材列表", icon: <FileText className="w-4 h-4" /> },
  { key: "markdown", label: "已转换 Markdown", icon: <File className="w-4 h-4" /> },
  { key: "survey", label: "企业调研", icon: <Building2 className="w-4 h-4" /> },
];

// ===================== 主组件 =====================
export default function RawMaterialsPage() {
  const router = useRouter();
  const { currentProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<TabKey>("list");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expSourceFilter, setExpSourceFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card" | "kanban">("table");
  const [showUpload, setShowUpload] = useState(false);
  const [mdSearch, setMdSearch] = useState("");
  const [mdCategoryFilter, setMdCategoryFilter] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [addingToKb, setAddingToKb] = useState(false);
  const [selectedMdIds, setSelectedMdIds] = useState<Set<string>>(new Set());
  const [showSurvey, setShowSurvey] = useState(false);

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
    onSuccess: () => { utils.raw.list.invalidate(); },
  });
  const updateRaw = trpc.raw.update.useMutation({
    onSuccess: () => utils.raw.list.invalidate(),
  });
  const addToKb = trpc.raw.addToKnowledgeBase.useMutation({
    onSuccess: () => { alert("已添加到企业知识库！"); utils.raw.list.invalidate(); },
    onError: () => alert("添加失败，请重试"),
  });
  const createRaw = trpc.raw.create.useMutation({
    onSuccess: () => utils.raw.list.invalidate(),
  });

  // 企业调研提交
  const handleSurveySubmit = async (surveyData: SurveyData) => {
    if (!currentProject) { alert("请先选择项目"); return; }
    try {
      const markdown = surveyToMarkdown(surveyData);
      const title = (surveyData.companyName || "企业调研") + " — 企业调研报告";
      const created = await createRaw.mutateAsync({
        title,
        projectId: currentProject.id,
        format: "WORD",
        materialType: "INTERNAL_WIKI",
        experienceSource: "E1_COMPANY",
      });
      if (created?.id) {
        await updateRaw.mutateAsync({
          id: created.id,
          data: { markdownContent: markdown, conversionStatus: "CONVERTED" },
        });
      }
      utils.raw.list.invalidate();
      setShowSurvey(false);
      setActiveTab("markdown");
      alert("企业调研已保存！");
    } catch (err: any) {
      alert("保存失败: " + (err.message || "未知错误"));
    }
  };

  const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const totalPages = data?.totalPages ?? 1;
  const convertedItems = items
    .filter((r: any) => r.conversionStatus === "CONVERTED")
    .filter((r: any) => !mdSearch || r.title.toLowerCase().includes(mdSearch.toLowerCase()) || r.markdownContent?.toLowerCase().includes(mdSearch.toLowerCase()))
    .filter((r: any) => !mdCategoryFilter || r.materialType === mdCategoryFilter);

  return (
    <div className="flex flex-col h-full">
      {/* ===== 固定头部 ===== */}
      <div className="shrink-0 px-6 pt-6 pb-0">
        {/* 标题行 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Raw 素材管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理企业上传的原始资料文件，启动格式归一与双轨加工</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 shadow-sm shrink-0"
          >
            <Upload className="w-4 h-4" />
            上传素材
          </button>
        </div>

        {/* 提示选择 Project */}
        {!currentProject && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4" />
            请先在顶部选择一个 Project
          </div>
        )}

        {/* 筛选栏 */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索素材名称..."
              className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
            <option value="">全部格式</option>
            {["WORD","PDF","PPT","EXCEL","AUDIO","VIDEO","SCREENSHOT","WEB_LINK"].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
            <option value="">全部类型</option>
            {Object.entries(MATERIAL_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
            <option value="">全部状态</option>
            {["PENDING","CONVERTING","CONVERTED","FAILED"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={expSourceFilter} onChange={e => setExpSourceFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
            <option value="">全部经验源</option>
            <option value="E1_COMPANY">E1 企业</option>
            <option value="E2_INDUSTRY">E2 行业</option>
            <option value="E3_CROSS_INDUSTRY">E3 跨行业</option>
          </select>
        </div>

        {/* ===== Tab 栏 ===== */}
        <div className="flex items-center justify-between border-b">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.key === "markdown" && convertedItems.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                    {convertedItems.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Tab 1 专属：视图切换 */}
          {activeTab === "list" && (
            <div className="flex rounded-lg border overflow-hidden">
              <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-xs ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode("card")} className={`px-3 py-1.5 text-xs ${viewMode === "card" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode("kanban")} className={`px-3 py-1.5 text-xs ${viewMode === "kanban" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                <Columns3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== Tab 内容区（可滚动，占满剩余高度） ===== */}
      <div className="flex-1 overflow-hidden">

        {/* ========== Tab 1: 素材列表 ========== */}
        {activeTab === "list" && (
          <div className="flex h-full">
            {/* 左侧：素材列表 */}
            <div className="w-full overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">加载中...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center">
                  <Upload className="mx-auto w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-400">暂无素材，请点击右上角上传</p>
                </div>
              ) : viewMode === "table" ? (
                /* ====== 列表视图 ====== */
                <div className="divide-y">
                  {items.map((r: any) => (
                    <div
                      key={r.id}
                      onClick={() => setPreviewItem(r)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                        "hover:bg-gray-50 border-l-2 border-l-transparent"
                      }`}
                    >
                      <div className="shrink-0">{FORMAT_ICONS[r.format] ?? <File className="w-4 h-4" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <span>{MATERIAL_TYPE_LABELS[r.materialType] || r.materialType}</span>
                          <span>·</span>
                          <span>{EXP_SOURCE_LABELS[r.experienceSource] || r.experienceSource}</span>
                          <span>·</span>
                          <span>{formatFileSize(r.fileSize)}</span>
                        </div>
                      </div>
                      <StatusBadge status={r.conversionStatus} />
                    </div>
                  ))}
                </div>
              ) : viewMode === "card" ? (
                /* ====== 卡片视图 ====== */
                <div className="grid grid-cols-2 gap-3 p-4">
                  {items.map((r: any) => (
                    <div
                      key={r.id}
                      onClick={() => setPreviewItem(r)}
                      className={`rounded-xl border p-3 cursor-pointer transition-all ${
                        "border-gray-200 bg-white hover:shadow-md hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {FORMAT_ICONS[r.format] ?? <File className="w-4 h-4" />}
                        <span className="text-sm font-medium truncate flex-1">{r.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            {MATERIAL_TYPE_LABELS[r.materialType] || r.materialType}
                          </span>
                          <span className="text-xs text-gray-400">{formatFileSize(r.fileSize)}</span>
                        </div>
                        <StatusBadge status={r.conversionStatus} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                        <span>{EXP_SOURCE_LABELS[r.experienceSource] || r.experienceSource}</span>
                        <span>·</span>
                        <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("zh-CN") : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ====== 看板视图（按转换状态分组） ====== */
                <div className="flex gap-4 p-4 h-full overflow-x-auto">
                  {["PENDING", "CONVERTING", "CONVERTED", "FAILED"].map(status => {
                    const statusItems = items.filter((r: any) => r.conversionStatus === status);
                    const statusLabels: Record<string, string> = {
                      PENDING: "待处理", CONVERTING: "转换中", CONVERTED: "已转换", FAILED: "失败"
                    };
                    const statusColors: Record<string, string> = {
                      PENDING: "bg-gray-100 text-gray-600", CONVERTING: "bg-blue-100 text-blue-600",
                      CONVERTED: "bg-green-100 text-green-600", FAILED: "bg-red-100 text-red-600"
                    };
                    return (
                      <div key={status} className="flex-shrink-0 w-56 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[status]}`}>
                            {statusLabels[status]}
                          </span>
                          <span className="text-xs text-gray-400">{statusItems.length}</span>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto">
                          {statusItems.map((r: any) => (
                            <div
                              key={r.id}
                              onClick={() => setPreviewItem(r)}
                              className={`rounded-lg border p-2.5 cursor-pointer transition-all ${
                                "border-gray-200 bg-white hover:shadow-sm hover:border-blue-300"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                {FORMAT_ICONS[r.format] ?? <File className="w-3.5 h-3.5" />}
                                <span className="text-xs font-medium truncate">{r.title}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <span>{MATERIAL_TYPE_LABELS[r.materialType] || r.materialType}</span>
                                <span>·</span>
                                <span>{formatFileSize(r.fileSize)}</span>
                              </div>
                            </div>
                          ))}
                          {statusItems.length === 0 && (
                            <div className="text-xs text-gray-300 text-center py-6">暂无</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-3 border-t">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== Tab 2: 已转换 Markdown ========== */}
        {activeTab === "markdown" && (
          <div className="h-full overflow-y-auto p-6">
            {/* 子筛选栏 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={mdSearch}
                    onChange={e => setMdSearch(e.target.value)}
                    placeholder="搜索 Markdown..."
                    className="h-8 w-48 rounded-lg border pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setMdCategoryFilter("")}
                    className={`px-2.5 py-1 rounded-full text-xs transition ${!mdCategoryFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    全部
                  </button>
                  {Object.entries(
                    items.filter((r: any) => r.conversionStatus === "CONVERTED").reduce((acc: Record<string, number>, r: any) => {
                      const key = r.materialType || "OTHER";
                      acc[key] = (acc[key] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([type, count]) => (
                    <button
                      key={type}
                      onClick={() => setMdCategoryFilter(type === mdCategoryFilter ? "" : type)}
                      className={`px-2.5 py-1 rounded-full text-xs transition ${mdCategoryFilter === type ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {MATERIAL_TYPE_LABELS[type] || type} ({count})
                    </button>
                  ))}
                </div>
              </div>
              {selectedMdIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">已选 {selectedMdIds.size} 篇</span>
                  <button
                    onClick={() => { const ids = Array.from(selectedMdIds).join(","); router.push("/knowledge/workbench?rawIds=" + ids); }}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                  >
                    <ExternalLink className="w-3 h-3" /> 多选进入工作台
                  </button>
                  <button onClick={() => setSelectedMdIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600">取消选择</button>
                </div>
              )}
            </div>

            {/* Markdown 卡片网格 */}
            {convertedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <File className="w-12 h-12 mb-3 text-gray-300" />
                <p>暂无已转换的 Markdown 内容</p>
                <p className="text-xs mt-1">在「素材列表」中上传文件并启动加工</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const next = new Set(selectedMdIds);
                          if (e.target.checked) next.add(r.id); else next.delete(r.id);
                          setSelectedMdIds(next);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      />
                      {FORMAT_ICONS[r.format] ?? <File className="w-4 h-4" />}
                      <span className="text-sm font-medium truncate flex-1">{r.title}</span>
                    </div>
                    {r.markdownContent && (
                      <pre className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-4 mb-3">
                        {getMarkdownPreview(r.markdownContent)}
                      </pre>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {MATERIAL_TYPE_LABELS[r.materialType] || r.materialType}
                        </span>
                        <span className="text-xs text-gray-400">{r.markdownContent ? r.markdownContent.length + " 字" : ""}</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); router.push("/knowledge/workbench?rawId=" + r.id); }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        进入工作台 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== Tab 3: 企业调研 ========== */}
        {activeTab === "survey" && (
          <div className="h-full overflow-y-auto p-6">
            {(() => {
              const surveyItems = items.filter((r: any) => r.title?.includes("调研") || r.materialType === "INTERNAL_WIKI");
              return (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">企业调研记录</h3>
                      <p className="text-sm text-gray-500 mt-1">填写企业调研采集表，自动生成结构化 Markdown 文档</p>
                    </div>
                    <button
                      onClick={() => setShowSurvey(true)}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 shadow-sm"
                    >
                      <Building2 className="w-4 h-4" />
                      新建企业调研
                    </button>
                  </div>

                  {surveyItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <Building2 className="w-12 h-12 mb-3 text-gray-300" />
                      <p>暂无调研记录</p>
                      <p className="text-xs mt-1">点击「新建企业调研」开始填写采集表</p>
                      <button
                        onClick={() => setShowSurvey(true)}
                        className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
                      >
                        <Building2 className="w-4 h-4" /> 新建企业调研
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {surveyItems.map((r: any) => (
                        <div
                          key={r.id}
                          onClick={() => setPreviewItem(r)}
                          className="rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium truncate flex-1">{r.title}</span>
                          </div>
                          {r.markdownContent && (
                            <pre className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3 mb-3">
                              {getMarkdownPreview(r.markdownContent, 3)}
                            </pre>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString("zh-CN") : ""}
                            </span>
                            <span className="text-gray-400">{r.markdownContent ? r.markdownContent.length + " 字" : "待填写"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ===== 弹窗们 ===== */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => utils.raw.list.invalidate()} />
      )}
      {showSurvey && (
        <EnterpriseSurveyDialog
          open={showSurvey}
          onClose={() => setShowSurvey(false)}
          onSubmit={handleSurveySubmit}
          submitting={createRaw.isPending}
        />
      )}
      {editingItem && (
        <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSuccess={() => utils.raw.list.invalidate()} />
      )}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onAddToKb={() => addToKb.mutate({ rawId: previewItem.id, projectId: currentProject?.id ?? "" })}
          onGoWorkbench={() => { const id = previewItem.id; setPreviewItem(null); router.push("/knowledge/workbench?rawId=" + id); }}
          addingToKb={addToKb.isPending}
          onStartConversion={() => { startConversion.mutate({ id: previewItem.id }); setPreviewItem(null); }}
          onEdit={() => { setEditingItem(previewItem); setPreviewItem(null); }}
          onDelete={() => { deleteRaw.mutate({ id: previewItem.id }); setPreviewItem(null); }}
        />
      )}
    </div>
  );
}

/* ========== 预览弹窗组件（全格式预览浮层） ========== */
function PreviewModal({ item, onClose, onAddToKb, onGoWorkbench, addingToKb, onStartConversion, onEdit, onDelete }: {
  item: any;
  onClose: () => void;
  onAddToKb?: () => void;
  onGoWorkbench?: () => void;
  addingToKb?: boolean;
  onStartConversion?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const hasMarkdown = !!item.markdownContent;
  const hasOriginal = !!item.originalFileUrl;
  const [activePreviewTab, setActivePreviewTab] = useState<"markdown" | "original">(
    hasMarkdown ? "markdown" : "original"
  );

  const handleCopy = async () => {
    const text = item.markdownContent || item.title || "";
    try {
      await navigator.clipboard.writeText(text);
      alert("已拷贝到剪贴板！");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("已拷贝到剪贴板！");
    }
  };

  // 根据文件格式决定原件预览方式
  const renderOriginalPreview = () => {
    if (!item.originalFileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
          <File className="w-12 h-12 mb-3 text-gray-300" />
          <p>暂无原件文件</p>
        </div>
      );
    }

    // 优先直接使用原始 URL（Vercel Blob URL 通常是公开的）
    const previewUrl = item.originalFileUrl;
    const format = (item.format || "").toUpperCase();

    // PDF - 浏览器原生 PDF 阅读器
    if (format === "PDF") {
      return (
        <div className="w-full h-full flex flex-col">
          <iframe
            src={previewUrl}
            className="w-full flex-1 border-0 rounded-lg"
            title="PDF 预览"
          />
          <div className="flex items-center justify-center pt-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              无法预览？点此在新窗口打开 ↗
            </a>
          </div>
        </div>
      );
    }

    // Word / Excel / PPT - 微软 Office Online 预览
    if (["WORD", "EXCEL", "PPT"].includes(format)) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.originalFileUrl)}`;
      return (
        <div className="w-full h-full flex flex-col">
          <iframe
            src={officeViewerUrl}
            className="w-full flex-1 border-0 rounded-lg"
            title="Office 文档预览"
            onError={() => console.log("Office preview failed")}
          />
          <div className="flex items-center justify-center gap-3 pt-3">
            <span className="text-xs text-gray-400">预览由 Microsoft Office Online 提供</span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              无法预览？点此直接下载 ↗
            </a>
          </div>
        </div>
      );
    }

    // 图片
    if (format === "SCREENSHOT" || /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(item.originalFileName || "")) {
      return (
        <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
          <img
            src={previewUrl}
            alt={item.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
          />
        </div>
      );
    }

    // 音频
    if (format === "AUDIO" || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(item.originalFileName || "")) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-6 py-20">
          <Headphones className="w-16 h-16 text-purple-400" />
          <audio controls className="w-full max-w-md" src={previewUrl}>
            您的浏览器不支持音频播放
          </audio>
          <p className="text-sm text-gray-500">{item.originalFileName || item.title}</p>
        </div>
      );
    }

    // 视频
    if (format === "VIDEO" || /\.(mp4|webm|mov|avi|mkv)$/i.test(item.originalFileName || "")) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <video controls className="max-w-full max-h-full rounded-lg shadow-sm" src={previewUrl}>
            您的浏览器不支持视频播放
          </video>
        </div>
      );
    }

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
          <div className="flex items-center justify-center gap-3 pt-3">
            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700">
              在新标签页打开 ↗
            </a>
          </div>
        </div>
      );
    }

    // 其他格式 - 提供下载/跳转
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 py-20">
        <File className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500">该格式暂不支持在线预览</p>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 shadow-sm"
        >
          <ExternalLink className="w-4 h-4" /> 下载 / 在浏览器中打开
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="shrink-0 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {FORMAT_ICONS[item.format] ?? <File className="w-5 h-5" />}
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{item.title}</h3>
                <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{MATERIAL_TYPE_LABELS[item.materialType] || item.materialType}</span>
                  <span>{EXP_SOURCE_LABELS[item.experienceSource] || item.experienceSource}</span>
                  <span>{item.format}</span>
                  <span>{item.markdownContent ? item.markdownContent.length + " 字" : ""}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.originalFileUrl && (
                <a
                  href={item.originalFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> 新窗口打开
                </a>
              )}
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* 预览 Tab 切换 */}
          {hasMarkdown && hasOriginal && (
            <div className="flex gap-1 mt-3">
              <button
                onClick={() => setActivePreviewTab("markdown")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activePreviewTab === "markdown"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                📝 Markdown 内容
              </button>
              <button
                onClick={() => setActivePreviewTab("original")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activePreviewTab === "original"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                📄 原件预览
              </button>
            </div>
          )}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden">
          {activePreviewTab === "markdown" && hasMarkdown ? (
            <div className="h-full overflow-y-auto px-6 py-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                {item.markdownContent}
              </pre>
            </div>
          ) : (
            <div className="h-full p-4">
              {renderOriginalPreview()}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            {item.conversionStatus === "PENDING" && onStartConversion && (
              <button
                onClick={onStartConversion}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700"
              >
                <Play className="w-3.5 h-3.5" /> 启动加工
              </button>
            )}
            {item.conversionStatus === "FAILED" && onStartConversion && (
              <button
                onClick={onStartConversion}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 重试转换
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100"
              >
                <Edit className="w-3.5 h-3.5" /> 编辑元数据
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => { if (confirm("确定删除「" + item.title + "」？")) onDelete(); }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> 删除
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100"
            >
              <Copy className="w-3.5 h-3.5" /> 拷贝内容
            </button>
          </div>
          <div className="flex items-center gap-2">
            {item.conversionStatus === "CONVERTED" && onAddToKb && (
              <button
                onClick={onAddToKb}
                disabled={addingToKb}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                {addingToKb ? "添加中..." : "添加到知识库"}
              </button>
            )}
            {onGoWorkbench && (
              <button
                onClick={onGoWorkbench}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700"
              >
                <ExternalLink className="w-3.5 h-3.5" /> 进入工作台
              </button>
            )}
          </div>
        </div>
      </div>
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
function EditModal({ item, onClose, onSuccess }: { item: any; onClose: () => void; onSuccess: () => void }) {
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
