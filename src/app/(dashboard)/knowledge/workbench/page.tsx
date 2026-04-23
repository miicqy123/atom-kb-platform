"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChevronRight, Wand2, Tag, Layers, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import WorkbenchDialog from "@/components/knowledge/WorkbenchDialog";

type Station = { id: string; name: string; icon: React.ReactNode; status: "done" | "active" | "pending" };

export default function WorkbenchPage() {
  const [activeTrack, setActiveTrack] = useState<"A" | "B">("A");
  const [activeStation, setActiveStation] = useState(1);
  const [showProcessDialog, setShowProcessDialog] = useState(false);

  const { data: currentProject } = trpc.project.getCurrent.useQuery(); // 假设有一个获取当前项目的方法

  const trackAStations: Station[] = [
    { id: "1", name: "格式归一", icon: <CheckCircle2 className="h-4 w-4" />, status: "done" },
    { id: "2", name: "智能切块", icon: <Wand2 className="h-4 w-4" />, status: "active" },
    { id: "3", name: "分类打标", icon: <Tag className="h-4 w-4" />, status: "pending" },
    { id: "4", name: "粒度分级", icon: <Layers className="h-4 w-4" />, status: "pending" },
    { id: "5", name: "元数据补齐", icon: <Database className="h-4 w-4" />, status: "pending" },
    { id: "6", name: "质检入库", icon: <CheckCircle2 className="h-4 w-4" />, status: "pending" },
  ];

  const trackBStations: Station[] = [
    { id: "1", name: "材料类型识别", icon: <Tag className="h-4 w-4" />, status: "active" },
    { id: "2", name: "P.A.O. 策略分析", icon: <Wand2 className="h-4 w-4" />, status: "pending" },
    { id: "3", name: "知识点提炼", icon: <Layers className="h-4 w-4" />, status: "pending" },
    { id: "4", name: "QA 对生成", icon: <Database className="h-4 w-4" />, status: "pending" },
    { id: "5", name: "质检溯源", icon: <AlertTriangle className="h-4 w-4" />, status: "pending" },
    { id: "6", name: "向量化入库", icon: <CheckCircle2 className="h-4 w-4" />, status: "pending" },
  ];

  const stations = activeTrack === "A" ? trackAStations : trackBStations;

  const currentStation = stations[activeStation - 1]?.name || "";

  return (
    <div>
      <PageHeader title="知识加工工作台" description="双轨生产线控制台 — Track A 原子化 / Track B QA 对生产" />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTrack("A")} className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTrack === "A" ? "bg-blue-600 text-white" : "border bg-white"}`}>Track A · 原子化加工</button>
        <button onClick={() => setActiveTrack("B")} className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTrack === "B" ? "bg-purple-600 text-white" : "border bg-white"}`}>Track B · QA 对生产</button>
      </div>

      <div className="mb-6 flex items-center gap-1">
        {stations.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button onClick={() => setActiveStation(i + 1)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                s.status === "done" ? "bg-green-50 text-green-700" : s.status === "active" ? "bg-brand/10 text-brand ring-1 ring-brand" : "bg-gray-50 text-gray-400"
              }`}>
              {s.icon}<span>{s.name}</span>
            </button>
            {i < stations.length - 1 && <ChevronRight className="h-4 w-4 text-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Markdown 全文预览</h3>
          <div className="h-96 overflow-y-auto rounded-lg bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-600">
            <p>## 产品知识文档</p><p>\n本文档介绍了产品的核心功能与技术架构...</p>
            <p>\n### 1. 系统概述</p><p>原子化知识库平台是一个...</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">站 {activeStation} · {currentStation} 控制面板</h3>
          {activeTrack === "A" && activeStation === 2 && <ChunkingPanel onProcess={() => setShowProcessDialog(true)} />}
          {activeTrack === "A" && activeStation === 3 && <TaggingPanel onProcess={() => setShowProcessDialog(true)} />}
          {activeTrack === "B" && activeStation === 4 && <QAGenerationPanel onProcess={() => setShowProcessDialog(true)} />}
          {![2, 3, 4].includes(activeStation) && (
            <div className="space-y-3">
              <button
                className="w-full rounded-lg bg-brand py-2 text-sm text-white hover:bg-brand-dark"
                onClick={() => setShowProcessDialog(true)}
              >
                开始处理
              </button>
              <div className="text-sm text-gray-400 py-8 text-center">此站功能面板加载中…</div>
            </div>
          )}
        </div>
      </div>

      {showProcessDialog && currentProject && (
        <WorkbenchDialog
          open={showProcessDialog}
          onOpenChange={setShowProcessDialog}
          projectId={currentProject.id}
          rawId="sample-raw-id" // 实际应用中应从上下文获取
          station={currentStation}
          onComplete={() => setShowProcessDialog(false)}
        />
      )}
    </div>
  );
}

function ChunkingPanel({ onProcess }: { onProcess: () => void }) {
  return (
    <div className="space-y-3">
      <button className="w-full rounded-lg bg-brand py-2 text-sm text-white hover:bg-brand-dark" onClick={onProcess}>⚡ 一键智能切块</button>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-gray-400">块 #{i}</span>
              <span className="text-xs text-gray-400">~320 字</span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">这是第 {i} 个切块的内容预览文本…</p>
            <div className="mt-2 flex gap-1">
              <button className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50">合并 ↕</button>
              <button className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50">拆分 ✂️</button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-yellow-50 p-2 text-xs text-yellow-700">⚠️ 检测到 1 处悬空指代，2 处跨块依赖</div>
    </div>
  );
}

function TaggingPanel({ onProcess }: { onProcess: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">为每个块配置 5 维标签（LLM 已自动推荐灰色预填）</p>
      <div className="space-y-2">
        <div>
          <label className="text-xs font-medium">维度编号</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {[1,2,3,7,16].map(d => <span key={d} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">维度{d}</span>)}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">投喂层级</label>
          <div className="flex gap-2 mt-1">
            {["A","B","C","D"].map(l => <label key={l} className="flex items-center gap-1 text-xs"><input type="radio" name="layer" defaultChecked={l==="A"} />{l}</label>)}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">槽位映射</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {["S1.1","S2.3","S4.2"].map(s => <span key={s} className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-600">{s}</span>)}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">经验源</label>
          <select className="mt-1 rounded border px-2 py-1 text-xs">
            <option>E1 企业经验</option>
            <option>E2 行业经验</option>
            <option>E3 跨行业</option>
          </select>
        </div>
      </div>
      <button className="w-full rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700" onClick={onProcess}>✅ 确认标签 → 下一站</button>
    </div>
  );
}

function QAGenerationPanel({ onProcess }: { onProcess: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">QA 生成进度</span>
        <span className="text-xs text-brand">12/20 对</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-brand" style={{ width: "60%" }} />
      </div>
      <div className="max-h-56 overflow-y-auto space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-brand">Q{i}: 什么是原子化知识库的核心架构？</p>
            <p className="mt-1 text-xs text-gray-600 line-clamp-3">A{i}: 原子化知识库的核心架构包含四库（Raw/Atoms/QA Pairs/Blueprint）和三路索引…</p>
            <div className="mt-1 flex gap-1">
              {["产品知识","架构"].map(t => <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{t}</span>)}
            </div>
          </div>
        ))}
      </div>
      <button className="w-full rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700" onClick={onProcess}>✅ 完成生成 → 下一站</button>
    </div>
  );
}