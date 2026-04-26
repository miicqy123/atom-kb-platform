"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { CATEGORY_LABEL_MAP, SUBCATEGORY_LABEL_MAP } from "@/lib/categoryMaps";
import { Play, CheckCircle, Circle, Loader2, ChevronDown, ChevronRight, Scissors, Merge, Tag, X, ChevronLeft } from "lucide-react";
import { ModeSelector, type ProcessingMode } from '@/components/workbench/ModeSelector';
import { ProcessingProgress, type PipelineStatus } from '@/components/workbench/ProcessingProgress';

/* ── 30 维度 ── */
const DIMENSIONS = [
  "品牌定位","品牌故事","产品卖点","技术参数","工艺流程",
  "原料溯源","价值主张","对标竞品","客户画像","场景痛点",
  "服务承诺","售后保障","安装指导","维护保养","环保认证",
  "行业标准","法规合规","价格策略","促销活动","渠道政策",
  "培训体系","团队管理","绩效考核","客户案例","市场分析",
  "竞争情报","供应链","质量控制","创新研发","合规声明",
];

const LAYERS = [
  { id:"A", name:"A 认知层", color:"#6366f1" },
  { id:"B", name:"B 技能层", color:"#06b6d4" },
  { id:"C", name:"C 风格红线层", color:"#f97316" },
  { id:"D", name:"D 系统合规层", color:"#8b5cf6" },
];

const SLOTS = [
  { key:"S0", name:"系统人设", subs:["S0.1","S0.2","S0.3"] },
  { key:"S1", name:"品牌认知", subs:["S1.1","S1.2","S1.3","S1.4"] },
  { key:"S2", name:"行业知识", subs:["S2.1","S2.2","S2.3"] },
  { key:"S3", name:"输入预检", subs:["S3.1","S3.2"] },
  { key:"S4", name:"用户理解", subs:["S4.1","S4.2"] },
  { key:"S5", name:"主执行引擎", subs:["S5.1","S5.2","S5.3"] },
  { key:"S6", name:"路由判断", subs:["S6.1","S6.2"] },
  { key:"S7", name:"输出格式", subs:["S7.1","S7.2"] },
  { key:"S8", name:"对抗验证", subs:["S8.1","S8.2","S8.3"] },
  { key:"S9", name:"质量报告", subs:["S9.1","S9.2"] },
  { key:"S10", name:"兜底策略", subs:["S10.1","S10.2"] },
];

const EXP_SOURCES = [
  { id:"E1", label:"E1 官方", color:"bg-green-100 text-green-700" },
  { id:"E2", label:"E2 实战", color:"bg-blue-100 text-blue-700" },
  { id:"E3", label:"E3 通用", color:"bg-purple-100 text-purple-700" },
];

type Chunk = {
  id: number;
  title: string;
  content: string;
  wordCount: number;
  status: "ok" | "warning" | "error";
  dimTags: number[];
  layer: string;
  slotMappings: string[];
  expSource: string;
  category?: string | null;
  subcategory?: string | null;
};

/* ── 6 站流程 ── */
const STATIONS = [
  { id: 1, name: "文档解析" },
  { id: 2, name: "智能切块" },
  { id: 3, name: "分类打标" },
  { id: 4, name: "QA 生成" },
  { id: 5, name: "质量检查" },
  { id: 6, name: "入库确认" },
];

function WorkbenchContent() {
  const { toast } = useToast();
  const { currentProject } = useProjectStore();

  const searchParams = useSearchParams();
  const rawIdParam = searchParams.get("rawId");
  const rawIdsParam = searchParams.get("rawIds");
  const rawIdList = rawIdsParam ? rawIdsParam.split(",") : rawIdParam ? [rawIdParam] : [];
  const isMultiMode = rawIdList.length > 1;

  const { data: rawData } = trpc.raw.getById.useQuery(
    { id: rawIdList[0]! },
    { enabled: rawIdList.length === 1 }
  );

  const { data: multiRawData } = trpc.raw.getByIds.useQuery(
    { ids: rawIdList },
    { enabled: isMultiMode }
  );
  const utils = trpc.useUtils();

  /* ── 状态 ── */
  const [track, setTrack] = useState<"A" | "B">("A");
  const [station, setStation] = useState(1);
  const [selectedChunk, setSelectedChunk] = useState(0);
  const [activeRawIndex, setActiveRawIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const currentRawData = isMultiMode ? (multiRawData ? multiRawData[activeRawIndex] : undefined) : rawData;
  const markdownPreview = currentRawData?.markdownContent || (rawIdList.length > 0 ? "加载中..." : "请从 Raw 素材管理页面选择素材进入加工");

  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isChunking, setIsChunking] = useState(false);

  // ━━━ P6 新增：模式选择 + 加工状态 ━━━
  const [selectedMode, setSelectedMode] = useState<ProcessingMode | null>(null);
  const [atomPipeStatus, setAtomPipeStatus] = useState<PipelineStatus>('idle');
  const [qaPipeStatus, setQaPipeStatus] = useState<PipelineStatus>('idle');
  const [processResult, setProcessResult] = useState<{ atomCount: number; qaCount: number } | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  const updateMutation = trpc.raw.update.useMutation({
    onSuccess: () => {
      toast({ title: "保存成功", description: "Markdown 内容已更新" });
      setIsEditing(false);
      utils.raw.getById.invalidate({ id: rawIdList[0] });
      utils.raw.getByIds.invalidate({ ids: rawIdList });
    },
    onError: (e) => {
      toast({ title: "保存失败", description: e.message, variant: "destructive" });
    },
  });

  const processWithMode = trpc.pipeline.processWithMode.useMutation({
    onSuccess: (data) => {
      setProcessResult({ atomCount: data.atomCount, qaCount: data.qaCount });
      if (data.mode === 'ATOM_ONLY') {
        setAtomPipeStatus('done');
      } else if (data.mode === 'QA_ONLY') {
        setQaPipeStatus('done');
      } else {
        setAtomPipeStatus('done');
        setQaPipeStatus('done');
      }
      toast({ title: '加工完成', description: `原子块 ${data.atomCount} 个，QA 对 ${data.qaCount} 个` });
    },
    onError: (err) => {
      setProcessError(err.message);
      setAtomPipeStatus('error');
      setQaPipeStatus('error');
      toast({ title: '加工失败', description: err.message });
    },
  });

  function handleStartProcessing() {
    if (!selectedMode || !rawIdList[0] || !currentProject?.id) return;
    setProcessError(null);
    setProcessResult(null);
    if (selectedMode === 'ATOM_ONLY' || selectedMode === 'DUAL') setAtomPipeStatus('running');
    if (selectedMode === 'QA_ONLY' || selectedMode === 'DUAL') setQaPipeStatus('running');
    processWithMode.mutate({
      rawId: rawIdList[0],
      projectId: currentProject.id,
      mode: selectedMode,
    });
  }

  function doChunking() {
    if (!markdownPreview || markdownPreview.length < 10) {
      toast({ title: "无法切块", description: "Markdown 内容为空或太短" });
      return;
    }
    setIsChunking(true);

    const lines = markdownPreview.split("\n");
    const sections: { title: string; content: string }[] = [];
    let currentTitle = "Introduction";
    let currentLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentLines.length > 0) {
          sections.push({ title: currentTitle, content: currentLines.join("\n").trim() });
        }
        currentTitle = line.replace(/^##\s*/, "").trim();
        currentLines = [];
      } else if (line.startsWith("# ") && sections.length === 0 && currentLines.length === 0) {
        currentTitle = line.replace(/^#\s*/, "").trim();
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.length > 0) {
      sections.push({ title: currentTitle, content: currentLines.join("\n").trim() });
    }

    const newChunks: Chunk[] = sections
      .filter(s => s.content.length > 5)
      .map((s, i) => ({
        id: i + 1,
        title: s.title || "Chunk " + (i + 1),
        content: s.content,
        wordCount: s.content.length,
        status: s.content.length > 600 ? "warning" as const : s.content.length < 50 ? "error" as const : "ok" as const,
        dimTags: [],
        layer: "B",
        slotMappings: [],
        expSource: "E1",
      }));

    setChunks(newChunks);
    setSelectedChunk(0);
    setIsChunking(false);
    toast({ title: "切块完成", description: "已切 " + newChunks.length + " 块" });
  }

  /* ── 质检结果 ── */
  const qcResults = {
    danglingRef: 0,
    crossDep: 0,
    tooLarge: chunks.filter(c => c.wordCount > 600).length,
    tooSmall: chunks.filter(c => c.wordCount < 100).length,
  };

  const currentChunk = chunks[selectedChunk];

  const handleEdit = () => {
    setEditContent(markdownPreview);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!rawIdList[0]) return;
    updateMutation.mutate({
      id: rawIdList[0],
      data: { markdownContent: editContent },
    });
  };

  const stationIcon = (s: number) => {
    if (s < station) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === station) return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    return <Circle className="h-4 w-4 text-gray-300" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部信息 */}
      <div className="px-6 py-3 border-b bg-white flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}><ChevronLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-base font-bold">📄 {currentRawData?.title || "品牌话术手册.pdf"}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <StatusBadge status="CONVERTED" />
            <span>材料类型: {currentRawData?.materialType || "话术库"}</span>
            <span>经验源: {currentRawData?.experienceSource || "E1"}</span>
          </div>
        </div>
      </div>

      {/* 批量模式 Tab 切换 */}
      {isMultiMode && multiRawData && multiRawData.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b overflow-x-auto">
          <span className="text-xs text-blue-600 font-medium shrink-0">批量加工 ({multiRawData.length} 篇)：</span>
          {multiRawData.map((rd, i) => (
            <button
              key={rd.id}
              onClick={() => setActiveRawIndex(i)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition ${
                activeRawIndex === i
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {i + 1}. {rd.title?.slice(0, 20)}{rd.title && rd.title.length > 20 ? "..." : ""}
            </button>
          ))}
        </div>
      )}

      {/* 进度条 - 根据模式动态过滤 */}
      <div className="px-6 py-2 border-b bg-gray-50/50">
        <div className="flex items-center gap-1">
          {STATIONS
            .filter((s) => {
              if (!selectedMode) return true;
              if ([1, 5, 6].includes(s.id)) return true;
              if ([2, 3].includes(s.id)) return selectedMode === 'ATOM_ONLY' || selectedMode === 'DUAL';
              if (s.id === 4) return selectedMode === 'QA_ONLY' || selectedMode === 'DUAL';
              return true;
            })
            .map((s, i, filtered) => (
              <div key={s.id} className="flex items-center">
                <button onClick={() => setStation(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                    station === s.id ? "bg-white shadow-sm border font-medium text-blue-700" :
                    s.id < station ? "text-green-600" : "text-gray-400"
                  }`}>
                  {stationIcon(s.id)}
                  <span>站{s.id} {s.name}</span>
                </button>
                {i < filtered.length - 1 && <span className="text-gray-300 mx-1">→</span>}
              </div>
            ))}
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* ══════ 左侧：Markdown 预览 ══════ */}
        <div className="w-[380px] flex-shrink-0 border-r overflow-auto flex flex-col">
          <div className="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-600 flex items-center justify-between">
            <span>Markdown 预览</span>
            {rawIdList.length > 0 && markdownPreview !== "加载中..." && markdownPreview !== "请从 Raw 素材管理页面选择素材进入加工" && (
              isEditing ? (
                <div className="flex gap-1">
                  <button onClick={() => setIsEditing(false)}
                    className="px-2 py-0.5 rounded text-[10px] text-gray-500 hover:bg-gray-200 transition">
                    取消
                  </button>
                  <button onClick={handleSave} disabled={updateMutation.isPending}
                    className="px-2 py-0.5 rounded text-[10px] bg-brand text-white hover:opacity-90 transition disabled:opacity-50">
                    {updateMutation.isPending ? "保存中..." : "保存"}
                  </button>
                </div>
              ) : (
                <button onClick={handleEdit}
                  className="px-2 py-0.5 rounded text-[10px] text-gray-500 hover:bg-gray-200 transition">
                  编辑
                </button>
              )
            )}
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full h-full min-h-[300px] font-mono text-sm p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            ) : (
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {markdownPreview}
              </pre>
            )}
          </div>
        </div>

        {/* ══════ 右侧：加工控制面板 ══════ */}
        <div className="flex-1 overflow-auto">
          {/* 站1：文档解析 + 模式选择 */}
          {station === 1 && (
            <div className="p-6 space-y-6">
              <div className="text-center space-y-3">
                <div className="text-4xl">📄</div>
                <div className="text-sm text-gray-600">文档已解析完成，请选择加工模式</div>
              </div>

              <ModeSelector
                selected={selectedMode}
                onSelect={(mode) => setSelectedMode(mode)}
                disabled={processWithMode.isPending}
              />

              {selectedMode && !processResult && (
                <button
                  onClick={handleStartProcessing}
                  disabled={processWithMode.isPending}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {processWithMode.isPending ? '加工中，请稍候...' : `开始「${selectedMode === 'ATOM_ONLY' ? '原子化入库' : selectedMode === 'QA_ONLY' ? 'QA向量入库' : '全量加工'}」`}
                </button>
              )}

              {(atomPipeStatus !== 'idle' || qaPipeStatus !== 'idle') && selectedMode && (
                <ProcessingProgress
                  mode={selectedMode}
                  atomStatus={atomPipeStatus}
                  qaStatus={qaPipeStatus}
                  atomCount={processResult?.atomCount ?? 0}
                  qaCount={processResult?.qaCount ?? 0}
                  error={processError}
                />
              )}

              {processResult && (
                <div className="flex gap-3">
                  {(selectedMode === 'ATOM_ONLY' || selectedMode === 'DUAL') && (
                    <button
                      onClick={() => setStation(2)}
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white hover:opacity-90"
                    >
                      查看切块详情 → 站② ▶
                    </button>
                  )}
                  {(selectedMode === 'QA_ONLY' || selectedMode === 'DUAL') && (
                    <button
                      onClick={() => { setTrack('B'); setStation(4); }}
                      className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm text-white hover:opacity-90"
                    >
                      查看 QA 对 → 站④ ▶
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Track A · 站2 智能切块 */}
          {track === "A" && station === 2 && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Track A · 站② 智能切块</h2>
                <div className="flex gap-2">
                  <button
                    onClick={doChunking}
                    disabled={isChunking}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Scissors className="h-3 w-3" />
                    {isChunking ? "切块中..." : "一键切块"}
                  </button>
                  <span className="text-xs text-gray-500 leading-8">{chunks.length > 0 ? "已切: " + chunks.length + " 块" : "点击切块开始加工"}</span>
                </div>
              </div>

              {/* Chunk 列表 */}
              <div className="space-y-2">
                {chunks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Scissors className="h-8 w-8 mb-2" />
                    <p className="text-sm">请点击「一键切块」开始加工</p>
                  </div>
                )}
                {chunks.map((chunk, i) => (
                  <div key={chunk.id}
                    onClick={() => setSelectedChunk(i)}
                    className={`border rounded-xl p-4 cursor-pointer transition ${
                      selectedChunk === i ? "border-blue-400 bg-blue-50/30 shadow-sm" : "hover:bg-gray-50"
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Chunk #{chunk.id} — {chunk.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        chunk.status === "ok" ? "bg-green-50 text-green-700" :
                        chunk.status === "warning" ? "bg-yellow-50 text-yellow-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        {chunk.status === "ok" ? "✅ 正常" : chunk.status === "warning" ? "⚠️ 偏大" : "❌ 异常"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">「{chunk.content.slice(0, 80)}…」</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span>📏 {chunk.wordCount}字</span>
                      <div className="flex gap-1">
                        <button className="px-1.5 py-0.5 rounded border hover:bg-gray-100">合并↕</button>
                        <button className="px-1.5 py-0.5 rounded border hover:bg-gray-100">拆分↔</button>
                        <button className="px-1.5 py-0.5 rounded border hover:bg-gray-100">调整✂️</button>
                      </div>
                    </div>
                    {/* 分类标签 */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {chunk.category ? (
                        <>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                            {CATEGORY_LABEL_MAP[chunk.category] || chunk.category}
                          </span>
                          {chunk.subcategory && (
                            <span className="text-[10px] text-gray-400">
                              → {SUBCATEGORY_LABEL_MAP[chunk.subcategory] || chunk.subcategory}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-300">未分类</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 质检面板 */}
              <div className="border rounded-xl p-4 bg-gray-50/50">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">质检面板</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className={qcResults.danglingRef === 0 ? "text-green-600" : "text-red-600"}>
                    {qcResults.danglingRef === 0 ? "✅" : "❌"} 悬空指代: {qcResults.danglingRef}
                  </div>
                  <div className={qcResults.crossDep === 0 ? "text-green-600" : "text-red-600"}>
                    {qcResults.crossDep === 0 ? "✅" : "❌"} 跨块依赖: {qcResults.crossDep}
                  </div>
                  <div className={qcResults.tooLarge === 0 ? "text-green-600" : "text-yellow-600"}>
                    {qcResults.tooLarge === 0 ? "✅" : "⚠️"} 过大块: {qcResults.tooLarge}
                  </div>
                  <div className={qcResults.tooSmall === 0 ? "text-green-600" : "text-yellow-600"}>
                    {qcResults.tooSmall === 0 ? "✅" : "⚠️"} 过小块: {qcResults.tooSmall}
                  </div>
                </div>
              </div>

              <Button onClick={() => setStation(3)} className="w-full bg-brand text-white text-sm">
                确认切块，进入站③ ▶
              </Button>
            </div>
          )}

          {/* Track A · 站3 分类打标 */}
          {track === "A" && station === 3 && currentChunk && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">站③ 分类打标 — Chunk #{currentChunk.id}: {currentChunk.title}</h2>
                <div className="flex gap-2 text-xs">
                  <Button variant="outline" size="sm" disabled={selectedChunk <= 0}
                    onClick={() => setSelectedChunk(i => i - 1)}>◀ 上一块</Button>
                  <Button variant="outline" size="sm" disabled={selectedChunk >= chunks.length - 1}
                    onClick={() => setSelectedChunk(i => i + 1)}>下一块 ▶</Button>
                </div>
              </div>

              {/* 维度编号（多选） */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-600">维度编号（多选）</h3>
                  <span className="text-[10px] text-blue-500">💡 LLM推荐: {currentChunk.dimTags.join(",")} (灰色预填)</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {DIMENSIONS.map((dim, i) => {
                    const isSelected = currentChunk.dimTags.includes(i + 1);
                    return (
                      <label key={i} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer transition ${
                        isSelected ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-600"
                      }`}>
                        <input type="checkbox" checked={isSelected} readOnly className="w-3 h-3 rounded" />
                        <span>{i+1}.{dim}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 投喂层级 */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-600">投喂层级</h3>
                  <span className="text-[10px] text-blue-500">💡 LLM推荐: {currentChunk.layer}</span>
                </div>
                <div className="flex gap-3">
                  {LAYERS.map(l => (
                    <label key={l.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                      currentChunk.layer === l.id ? "border-2 shadow-sm" : "hover:bg-gray-50"
                    }`} style={currentChunk.layer === l.id ? { borderColor: l.color } : {}}>
                      <input type="radio" name="layer" checked={currentChunk.layer === l.id} readOnly />
                      <span className="w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: l.color }}>{l.id}</span>
                      <span className="text-xs">{l.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 槽位映射 */}
              <div className="border rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">槽位映射（树形多选）</h3>
                <div className="space-y-1 max-h-[200px] overflow-auto">
                  {SLOTS.map(slot => (
                    <details key={slot.key} className="group">
                      <summary className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-gray-50 rounded">
                        <ChevronRight className="h-3 w-3 text-gray-400 group-open:rotate-90 transition-transform" />
                        <span className="font-mono text-blue-600">{slot.key}</span>
                        <span>{slot.name}</span>
                      </summary>
                      <div className="pl-7 space-y-0.5">
                        {slot.subs.map(sub => {
                          const isChecked = currentChunk.slotMappings.includes(sub);
                          return (
                            <label key={sub} className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded cursor-pointer ${
                              isChecked ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"
                            }`}>
                              <input type="checkbox" checked={isChecked} readOnly className="w-3 h-3 rounded" />
                              {sub}
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              </div>

              {/* 经验源 + 场景 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-600 mb-2">经验源</h3>
                  <div className="flex gap-2">
                    {EXP_SOURCES.map(e => (
                      <label key={e.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${
                        currentChunk.expSource === e.id ? e.color + " border-current font-medium" : "text-gray-500 hover:bg-gray-50"
                      }`}>
                        <input type="radio" name="exp" checked={currentChunk.expSource === e.id} readOnly className="w-3 h-3" />
                        {e.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-600 mb-2">适用场景</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {["家居建材","无醛体系","销售岗","客服岗","小红书","抖音"].map((s, i) => (
                      <label key={s} className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer border ${
                        i < 3 ? "bg-blue-50 text-blue-700 border-blue-200" : "text-gray-400 hover:bg-gray-50"
                      }`}>
                        <input type="checkbox" checked={i < 3} readOnly className="w-2.5 h-2.5 mr-1" />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">批量应用到同类块</Button>
                <Button onClick={() => setStation(4)} className="flex-1 bg-brand text-white text-sm">
                  确认，进入站④ ▶
                </Button>
              </div>
            </div>
          )}

          {/* Track B · 站4 QA 生成 */}
          {((track === "B") || (track === "A" && station === 4)) && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Track B · 站④ 多角度 QA 对生成</h2>
                <span className="text-xs text-gray-500">进度: ████████████░░░░░░░░ 60% (18/30 组)</span>
              </div>

              {/* 生成进度条 */}
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: "60%" }} />
              </div>

              {/* QA 表格 */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-2 w-12">序号</th>
                      <th className="px-4 py-2">Question</th>
                      <th className="px-4 py-2">Answer (摘要)</th>
                      <th className="px-4 py-2 w-16">Tags</th>
                      <th className="px-4 py-2 w-12">难度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { q:"万华灵荃的品牌核心理念是什么？", layers:["核心回答(85字)","深层解析(120字)","数据论证(95字)","场景应用(110字)","常见误区(80字)","应对话术(130字)","延伸知识(90字)"], total:710, tags:"品牌,故事", diff:"⭐" },
                      { q:"MDI胶粘技术与传统胶有何区别？", layers:["核心回答(92字)","深层解析(150字)","数据论证(110字)","场景应用(95字)","常见误区(85字)","应对话术(140字)","延伸知识(100字)"], total:772, tags:"技术,卖点", diff:"⭐⭐" },
                      { q:"客户说「太贵了」怎么回应？", layers:["核心回答(100字)","深层解析(130字)","数据论证(120字)","场景应用(150字)","常见误区(90字)","应对话术(160字)","延伸知识(80字)"], total:830, tags:"异议,话术", diff:"⭐⭐⭐" },
                    ].map((qa, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-400">Q{String(i+1).padStart(2,"0")}</td>
                        <td className="px-4 py-3 text-xs font-medium">{qa.q}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {qa.layers.map((l, j) => (
                              <div key={j} className="text-[10px] text-gray-500">▸ {l}</div>
                            ))}
                            <div className="text-[10px] text-green-600 font-medium mt-1">📏 总计: {qa.total}字 ✅</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[10px]">{qa.tags}</td>
                        <td className="px-4 py-3 text-xs">{qa.diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">⏸ 暂停生成</Button>
                <Button variant="outline" size="sm" className="text-xs">🔄 重新生成选中</Button>
                <Button onClick={() => setStation(5)} className="flex-1 bg-brand text-white text-sm">
                  确认，进入站⑤质检 ▶
                </Button>
              </div>
            </div>
          )}

          {/* 站5/6 占位 */}
          {track === "A" && (station === 5 || station === 6) && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              站{station} {STATIONS[station-1].name} — 实现中…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkbenchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">加载中...</div>}>
      <WorkbenchContent />
    </Suspense>
  );
}
