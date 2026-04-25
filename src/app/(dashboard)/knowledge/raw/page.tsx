"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Upload, FileText, Search, Eye, Download, Trash2, Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useProjectStore } from "@/stores/projectStore";

/* ── 常量 ── */
const MATERIAL_TYPES = ["话术库","FAQ","对话录音","经验萃取","产品文档","培训材料","其他"];
const EXP_SOURCES: Record<string,{label:string;color:string}> = {
  E1_COMPANY:  { label:"E1 官方", color:"bg-green-100 text-green-700" },
  E2_INDUSTRY: { label:"E2 实战", color:"bg-blue-100 text-blue-700" },
  E3_CROSS_INDUSTRY: { label:"E3 通用", color:"bg-purple-100 text-purple-700" },
};
const VERIFY_STATUS: Record<string,{label:string;icon:string}> = {
  VERIFIED:   { label:"已校验", icon:"✅" },
  PENDING:    { label:"待校验", icon:"⏳" },
  REWORK:     { label:"返工",   icon:"⚠️" },
};

export default function RawMaterialsPage() {
  const { toast } = useToast();
  const { projectId } = useProjectStore();
  const pid = projectId || "default-project";

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterFormat, setFilterFormat] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [detailTab, setDetailTab] = useState<"preview"|"markdown">("preview");

  const pageSize = 20;
  const utils = trpc.useUtils();

  /* ── 数据查询 ── */
  const { data: rawData, isLoading, refetch } = trpc.raw.getAll.useQuery(
    { projectId: pid, search: search || undefined, limit: pageSize, offset: (page-1)*pageSize },
    { enabled: !!pid }
  );

  /* ── 删除 ── */
  const deleteMut = trpc.raw.delete.useMutation({
    onSuccess: () => { toast({ title:"删除成功" }); utils.raw.getAll.invalidate(); },
    onError: (e) => toast({ title:"删除失败", description:e.message, variant:"destructive" }),
  });

  /* ── 加工 ── */
  const processMut = trpc.pipeline.processRaw.useMutation({
    onSuccess: (d) => {
      toast({ title:`加工完成`, description:`生成 ${d.atomsCreated ?? 0} 个原子块` });
      utils.raw.getAll.invalidate();
    },
    onError: (e) => toast({ title:"加工失败", description:e.message, variant:"destructive" }),
  });

  /* ── 上传成功后刷新 ── */
  useEffect(() => {
    if (!isUploadOpen) { utils.raw.getAll.invalidate(); }
  }, [isUploadOpen]);

  /* ── 过滤 ── */
  const items = (rawData?.items ?? []).filter((f:any) => {
    if (filterFormat !== "ALL" && f.format !== filterFormat) return false;
    if (filterStatus !== "ALL" && f.conversionStatus !== filterStatus) return false;
    if (filterType !== "ALL" && f.materialType !== filterType) return false;
    return true;
  });

  const totalCount = rawData?.totalCount ?? items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const selected = selectedId ? items.find((f:any) => f.id === selectedId) : null;

  /* ── 状态 Badge ── */
  const statusBadge = (s:string) => {
    const map: Record<string,{label:string;cls:string}> = {
      CONVERTED:  { label:"🟢 已处理", cls:"bg-green-50 text-green-700 border-green-200" },
      CONVERTING: { label:"🔵 处理中", cls:"bg-blue-50 text-blue-700 border-blue-200" },
      PENDING:    { label:"🟡 待处理", cls:"bg-yellow-50 text-yellow-700 border-yellow-200" },
      FAILED:     { label:"🔴 失败",   cls:"bg-red-50 text-red-700 border-red-200" },
    };
    const m = map[s] || { label:s, cls:"" };
    return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${m.cls}`}>{m.label}</span>;
  };

  const expBadge = (src:string) => {
    const e = EXP_SOURCES[src];
    if (!e) return <span className="text-xs text-gray-400">—</span>;
    return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${e.color}`}>{e.label}</span>;
  };

  const verifyBadge = (v?:string) => {
    const vv = VERIFY_STATUS[v || "PENDING"] || VERIFY_STATUS.PENDING;
    return <span className="text-xs">{vv.icon} {vv.label}</span>;
  };

  /* ── 上传模态框 ── */
  function UploadModal({ onClose }: { onClose: () => void }) {
    const { currentProject } = useProjectStore();
    const utils = trpc.useUtils();
    const createRaw = trpc.raw.create.useMutation({
      onSuccess: () => {
        utils.raw.getAll.invalidate();
        onClose();
      },
    });

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
      title: "",
      format: "WORD",
      materialType: "PRODUCT_DOC",
      experienceSource: "E1_COMPANY",
    });

    const detectFormat = (fileName: string): string => {
      const ext = fileName.split(".").pop()?.toLowerCase();
      const map: Record<string, string> = {
        doc: "WORD", docx: "WORD",
        pdf: "PDF",
        ppt: "PPT", pptx: "PPT",
        xls: "EXCEL", xlsx: "EXCEL", csv: "EXCEL",
        mp3: "AUDIO", wav: "AUDIO", m4a: "AUDIO",
        mp4: "VIDEO", mov: "VIDEO", avi: "VIDEO",
        png: "SCREENSHOT", jpg: "SCREENSHOT", jpeg: "SCREENSHOT",
      };
      return map[ext ?? ""] ?? "PDF";
    };

    const handleFileChange = (selectedFile: File) => {
      setFile(selectedFile);
      setError("");
      const detectedFormat = detectFormat(selectedFile.name);
      setForm((prev) => ({
        ...prev,
        title: prev.title || selectedFile.name.replace(/\.[^./]+$/, ""),
        format: detectedFormat,
      }));
    };

    const handleSubmit = async () => {
      if (!file) { setError("请先选择文件"); return; }
      if (!form.title.trim()) { setError("请填写素材标题"); return; }
      if (!currentProject) { setError("请先在顶部选择一个 Project"); return; }

      setUploading(true);
      setError("");

      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "文件上传失败");
        }

        const { url: fileUrl } = await uploadRes.json();

        await createRaw.mutateAsync({
          title: form.title,
          projectId: currentProject.id,
          format: form.format,
          materialType: form.materialType,
          experienceSource: form.experienceSource,
          originalFileUrl: fileUrl,
        });
      } catch (err: any) {
        setError(err.message || "上传失败，请重试");
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-[520px] rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-bold">上传素材</h2>

          <label
            className="mt-4 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-brand hover:bg-blue-50"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation();
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) handleFileChange(droppedFile);
            }}
          >
            <Upload className="mx-auto h-10 w-10 text-gray-300" />
            {file ? (
              <p className="mt-2 text-sm font-medium text-brand">{file.name}（{(file.size / 1024 / 1024).toFixed(2)} MB）</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-500">拖拽文件到此处，或点击选择文件</p>
                <p className="text-xs text-gray-400">支持 Word / PDF / PPT / Excel / 音视频 / 截图</p>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept=".doc,.docx,.pdf,.ppt,.pptx,.xls,.xlsx,.csv,.mp3,.wav,.m4a,.mp4,.mov,.avi,.png,.jpg,.jpeg"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) handleFileChange(selected);
              }}
            />
          </label>

          <div className="mt-4 space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="素材标题" className="w-full rounded-lg border px-3 py-2 text-sm" />

            <div className="grid grid-cols-3 gap-3">
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
                {["WORD","PDF","PPT","EXCEL","AUDIO","VIDEO","SCREENSHOT","WEB_LINK"].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>

              <select value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
                {["THEORY","CASE_STUDY","METHODOLOGY","FAQ","SCRIPT","REGULATION","PRODUCT_DOC","TRAINING_MATERIAL","MEETING_RECORD","CUSTOMER_VOICE","INDUSTRY_REPORT","COMPETITOR_ANALYSIS"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <select value={form.experienceSource} onChange={(e) => setForm({ ...form, experienceSource: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
                <option value="E1_COMPANY">E1 企业经验</option>
                <option value="E2_INDUSTRY">E2 行业经验</option>
                <option value="E3_CROSS_INDUSTRY">E3 跨行业</option>
              </select>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} disabled={uploading} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">取消</button>
            <button onClick={handleSubmit} disabled={uploading || !file} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">
              {uploading ? "上传中…" : "确认上传"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Raw 素材管理"
        description="管理原始知识素材，支持上传、转换、加工"
        actions={
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2 bg-brand text-white">
            <Upload className="h-4 w-4" /> 上传素材
          </Button>
        }
      />

      {/* ── 筛选栏 ── */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b bg-gray-50/50">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索素材…"
            className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
        </div>
        <select value={filterFormat} onChange={e=>setFilterFormat(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="ALL">格式：全部</option>
          {["PDF","WORD","EXCEL","PPT","AUDIO","VIDEO"].map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="ALL">转换：全部</option>
          <option value="PENDING">待处理</option><option value="CONVERTING">处理中</option>
          <option value="CONVERTED">已处理</option><option value="FAILED">失败</option>
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="ALL">材料类型：全部</option>
          {MATERIAL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* ── 主区域：表格 + 右侧面板 ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧表格 */}
        <div className={`flex-1 overflow-auto ${selected ? "border-r" : ""}`}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 w-8"><input type="checkbox" className="w-4 h-4 rounded" /></th>
                <th className="px-4 py-3">素材名称</th>
                <th className="px-4 py-3">格式</th>
                <th className="px-4 py-3">材料类型</th>
                <th className="px-4 py-3">经验源</th>
                <th className="px-4 py-3">转换</th>
                <th className="px-4 py-3">校验</th>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((f:any) => (
                <tr key={f.id}
                  onClick={() => setSelectedId(f.id === selectedId ? null : f.id)}
                  className={`hover:bg-blue-50/40 cursor-pointer transition ${f.id === selectedId ? "bg-blue-50" : ""}`}>
                  <td className="px-4 py-3"><input type="checkbox" className="w-4 h-4 rounded" onClick={e=>e.stopPropagation()} /></td>
                  <td className="px-4 py-3 font-medium">{f.title || f.originalFileName}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{f.format}</Badge></td>
                  <td className="px-4 py-3 text-xs">{f.materialType || "—"}</td>
                  <td className="px-4 py-3">{expBadge(f.experienceSource)}</td>
                  <td className="px-4 py-3">{statusBadge(f.conversionStatus)}</td>
                  <td className="px-4 py-3">{verifyBadge(f.verifyStatus)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(f.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={e=>e.stopPropagation()}>
                      <button title="预览" className="p-1.5 rounded hover:bg-gray-100"><Eye className="h-4 w-4 text-gray-500" /></button>
                      <button title="下载" className="p-1.5 rounded hover:bg-gray-100"><Download className="h-4 w-4 text-gray-500" /></button>
                      <button title="加工" disabled={processMut.isPending || f.conversionStatus==="CONVERTED"}
                        onClick={() => processMut.mutate({ rawId:f.id, projectId:pid })}
                        className="p-1.5 rounded hover:bg-blue-50 disabled:opacity-40">
                        <Play className="h-4 w-4 text-blue-600" />
                      </button>
                      <button title="删除" disabled={deleteMut.isPending}
                        onClick={() => { if(confirm("确认删除?")) deleteMut.mutate({id:f.id}); }}
                        className="p-1.5 rounded hover:bg-red-50">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !isLoading && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">暂无素材，请点击上传</td></tr>
              )}
              {isLoading && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">加载中…</td></tr>
              )}
            </tbody>
          </table>

          {/* ── 分页 ── */}
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
            <span>共 {totalCount} 条</span>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span>{page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* ── 右侧详情面板 ── */}
        {selected && (
          <div className="w-[400px] flex-shrink-0 overflow-auto bg-white border-l">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-sm truncate">{selected.title || selected.originalFileName}</h3>
              <button onClick={()=>setSelectedId(null)} className="p-1 rounded hover:bg-gray-200"><X className="h-4 w-4" /></button>
            </div>

            {/* 预览切换 */}
            <div className="flex border-b">
              {(["preview","markdown"] as const).map(t=>(
                <button key={t} onClick={()=>setDetailTab(t)}
                  className={`flex-1 py-2 text-xs font-medium ${detailTab===t ? "border-b-2 border-brand text-brand" : "text-gray-500"}`}>
                  {t==="preview" ? "原件预览" : "Markdown预览"}
                </button>
              ))}
            </div>
            <div className="p-4 text-xs text-gray-500 min-h-[120px] border-b">
              {detailTab==="preview"
                ? <div className="flex items-center justify-center h-24 bg-gray-50 rounded">原件预览区域</div>
                : <pre className="whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded max-h-[200px] overflow-auto">{selected.markdownContent || "暂无Markdown内容"}</pre>
              }
            </div>

            {/* 入库卡元数据 */}
            <div className="p-4 space-y-3 border-b">
              <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">📋 入库卡元数据</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-500">材料类型</label>
                  <select defaultValue={selected.materialType||""} className="w-full mt-1 rounded border px-2 py-1 text-xs">
                    <option value="">请选择</option>
                    {MATERIAL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-500">经验源</label>
                  <select defaultValue={selected.experienceSource||""} className="w-full mt-1 rounded border px-2 py-1 text-xs">
                    <option value="">请选择</option>
                    <option value="E1_COMPANY">E1 官方/标准化</option>
                    <option value="E2_INDUSTRY">E2 实战经验</option>
                    <option value="E3_CROSS_INDUSTRY">E3 行业通用</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-500">行业</label>
                  <select className="w-full mt-1 rounded border px-2 py-1 text-xs">
                    <option>家居建材</option><option>教育</option><option>医疗</option><option>其他</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-500">可对外</label>
                  <select defaultValue={selected.exposureLevel||""} className="w-full mt-1 rounded border px-2 py-1 text-xs">
                    <option value="EXTERNAL">可对外</option><option value="INTERNAL">内部</option>
                    <option value="NEEDS_APPROVAL">需审批</option><option value="STRICTLY_FORBIDDEN">严禁</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-500">有效期</label>
                  <input type="date" className="w-full mt-1 rounded border px-2 py-1 text-xs" />
                </div>
                <div>
                  <label className="text-gray-500">备注</label>
                  <textarea rows={2} className="w-full mt-1 rounded border px-2 py-1 text-xs" placeholder="备注…" />
                </div>
              </div>
              <Button size="sm" className="w-full text-xs">保存元数据</Button>
            </div>

            {/* 关联 */}
            <div className="p-4 space-y-2">
              <details className="group">
                <summary className="text-xs font-semibold text-gray-700 cursor-pointer">▸ 关联 Atoms（{(selected as any)?.atoms?.length ?? 0} 条）</summary>
                <div className="mt-2 space-y-1 pl-3">
                  {((selected as any)?.atoms ?? []).map((a:any) => (
                    <div key={a.id} className="text-xs text-gray-600">• {a.title}</div>
                  ))}
                  {!(selected as any)?.atoms?.length && <div className="text-xs text-gray-400">暂无关联</div>}
                </div>
              </details>
              <details className="group">
                <summary className="text-xs font-semibold text-gray-700 cursor-pointer">▸ 关联 QA Pairs（{(selected as any)?.qaPairs?.length ?? 0} 组）</summary>
                <div className="mt-2 space-y-1 pl-3">
                  {((selected as any)?.qaPairs ?? []).map((q:any) => (
                    <div key={q.id} className="text-xs text-gray-600">• {q.question?.slice(0,40)}</div>
                  ))}
                  {!(selected as any)?.qaPairs?.length && <div className="text-xs text-gray-400">暂无关联</div>}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>

      {/* ── 上传模态框 ── */}
      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
        />
      )}
    </div>
  );
}
