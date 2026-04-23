"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { GitBranch, RotateCcw, ArrowLeftRight } from "lucide-react";

type VersionEntry = { version: number; time: string; author: string; status: string; changes: string };

const MOCK_VERSIONS: VersionEntry[] = [
  { version: 3, time: "2026-04-20 14:30", author: "张工", status: "active", changes: "更新 S5 创作类槽位取料规则" },
  { version: 2, time: "2026-04-18 09:15", author: "李工", status: "archived", changes: "新增 S8 对抗验证配置" },
  { version: 1, time: "2026-04-15 16:00", author: "张工", status: "archived", changes: "初始版本创建" },
];

export default function VersionsPage() {
  const [selected, setSelected] = useState<number[]>([3, 2]);

  return (
    <div>
      <PageHeader title="版本历史与对比" description="蓝图版本管理、Diff 对比与一键回滚" />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><GitBranch className="h-4 w-4" />版本时间线</h3>
          <div className="space-y-3">
            {MOCK_VERSIONS.map(v => (
              <div key={v.version} className={`rounded-lg border p-3 cursor-pointer ${selected.includes(v.version) ? "ring-2 ring-brand" : "hover:bg-gray-50"}`} onClick={() => {
                setSelected(prev => prev.includes(v.version) ? prev.filter(x => x !== v.version) : [prev[prev.length - 1], v.version].filter(Boolean));
              }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">v{v.version}</span>
                  <span className={`text-xs rounded px-1.5 py-0.5 ${v.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{v.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{v.time} · {v.author}</p>
                <p className="text-xs text-gray-600 mt-1">{v.changes}</p>
                {v.status !== "active" && <button className="mt-2 flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"><RotateCcw className="h-3 w-3" />回滚到此版本</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" />Diff 对比: v{selected[0]} ↔ v{selected[1]}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-red-50 p-3">
              <h4 className="text-xs font-semibold text-red-600 mb-2">v{selected[1]}（旧版）</h4>
              <div className="font-mono text-xs space-y-1">
                <p className="line-through text-red-400">S5.maxTokens: 2000</p>
                <p className="line-through text-red-400">S5.fallback: skip</p>
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <h4 className="text-xs font-semibold text-green-600 mb-2">v{selected[0]}（新版）</h4>
              <div className="font-mono text-xs space-y-1">
                <p className="text-green-600">S5.maxTokens: 3000</p>
                <p className="text-green-600">S5.fallback: base_pack</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}