"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RotateCcw, Eye, GitCompare, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Mock 版本数据 ── */
const VERSIONS = [
  {
    version: 3, status: "active", date: "2026-04-20", author: "杰",
    transition: "配置中 → 已上线",
    changes: [
      { type: "+", desc: "S1 新增2个原子块（品牌理念话术包、品牌差异化定位）" },
      { type: "-", desc: "S1 移除1个原子块（品牌历程汇总）" },
      { type: "~", desc: "S1 max_tokens 600 → 800" },
      { type: "~", desc: "S4 新增场景标签「一对一沟通」" },
    ],
    slots: {
      S1: { atoms: ["品牌故事-核心","品牌理念话术包","品牌差异化定位"], maxTokens: 800 },
      S4: { atoms: ["用户画像匹配","需求深度分析","场景路由"], maxTokens: 600 },
    }
  },
  {
    version: 2, status: "archived", date: "2026-04-15", author: "杰",
    transition: "testing → active",
    changes: [
      { type: "+", desc: "S2 新增行业知识模块" },
      { type: "~", desc: "S5 Generator 温度 0.5 → 0.7" },
    ],
    slots: {
      S1: { atoms: ["品牌故事-核心","品牌历程汇总"], maxTokens: 600 },
      S4: { atoms: ["用户画像匹配","需求深度分析"], maxTokens: 600 },
    }
  },
  {
    version: 1, status: "archived", date: "2026-04-08", author: "杰",
    transition: "draft → testing",
    changes: [
      { type: "+", desc: "初始版本创建" },
      { type: "+", desc: "配置 S0-S5 基础槽位" },
    ],
    slots: {
      S1: { atoms: ["品牌故事-核心"], maxTokens: 400 },
    }
  },
];

export default function VersionHistoryPage() {
  const { toast } = useToast();
  const [selectedA, setSelectedA] = useState(1); // index
  const [selectedB, setSelectedB] = useState(0); // index
  const [showDiff, setShowDiff] = useState(true);

  const vA = VERSIONS[selectedA];
  const vB = VERSIONS[selectedB];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="版本历史与对比" description="查看蓝图版本变更记录，对比差异" />

      <div className="flex flex-1 overflow-hidden">
        {/* ── 左侧：版本时间线 ── */}
        <div className="w-64 border-r bg-gray-50/50 overflow-auto flex-shrink-0 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">版本时间线</h3>
          <div className="space-y-0">
            {VERSIONS.map((v, i) => (
              <div key={v.version} className="relative pl-6 pb-6">
                {/* 时间线连接线 */}
                {i < VERSIONS.length - 1 && (
                  <div className="absolute left-[9px] top-4 w-0.5 h-full bg-gray-200" />
                )}
                {/* 圆点 */}
                <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                  v.status === "active" ? "bg-green-500 border-green-500" : "bg-white border-gray-300"
                }`}>
                  {v.status === "active" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>

                <div className={`cursor-pointer rounded-lg p-3 transition ${
                  selectedA === i || selectedB === i ? "bg-white border shadow-sm" : "hover:bg-white"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">v{v.version}</span>
                    <Badge variant={v.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {v.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{v.date}</div>
                  <div className="text-xs text-gray-500">{v.author}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{v.transition}</div>

                  <div className="flex gap-1 mt-2">
                    <button onClick={() => setSelectedA(i)}
                      className={`px-2 py-0.5 rounded text-[10px] ${selectedA === i ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      左侧
                    </button>
                    <button onClick={() => setSelectedB(i)}
                      className={`px-2 py-0.5 rounded text-[10px] ${selectedB === i ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      右侧
                    </button>
                    {v.status !== "active" && (
                      <button onClick={() => toast({ title: `已回滚到 v${v.version}` })}
                        className="px-2 py-0.5 rounded text-[10px] bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center gap-0.5">
                        <RotateCcw className="h-2.5 w-2.5" /> 回滚
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 右侧：Diff 对比 ── */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold">对比:</span>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-mono">v{vA.version}</span>
            <GitCompare className="h-4 w-4 text-gray-400" />
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg font-mono">v{vB.version}</span>
          </div>

          {/* 并排对比 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 左侧 v_old */}
            <div className="border rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-blue-50 border-b text-xs font-semibold text-blue-700">
                v{vA.version} ({vA.status}) — {vA.date}
              </div>
              <div className="p-4 space-y-2 text-xs">
                {Object.entries(vA.slots).map(([slotKey, slotData]) => (
                  <div key={slotKey}>
                    <div className="font-semibold text-gray-700">{slotKey}:</div>
                    {slotData.atoms.map((a: string) => {
                      // 检查是否在新版本中被移除
                      const otherSlot = vB.slots[slotKey as keyof typeof vB.slots];
                      const inOther = otherSlot?.atoms.includes(a);
                      return (
                        <div key={a} className={`pl-4 py-0.5 ${!inOther ? "bg-red-50 text-red-700 line-through" : "text-gray-600"}`}>
                          {!inOther ? "- " : "  "}{a}
                        </div>
                      );
                    })}
                    <div className="pl-4 text-gray-400">max_tokens: {slotData.maxTokens}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧 v_new */}
            <div className="border rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-green-50 border-b text-xs font-semibold text-green-700">
                v{vB.version} ({vB.status}) — {vB.date}
              </div>
              <div className="p-4 space-y-2 text-xs">
                {Object.entries(vB.slots).map(([slotKey, slotData]) => (
                  <div key={slotKey}>
                    <div className="font-semibold text-gray-700">{slotKey}:</div>
                    {slotData.atoms.map((a: string) => {
                      const otherSlot = vA.slots[slotKey as keyof typeof vA.slots];
                      const inOther = otherSlot?.atoms.includes(a);
                      return (
                        <div key={a} className={`pl-4 py-0.5 ${!inOther ? "bg-green-50 text-green-700 font-medium" : "text-gray-600"}`}>
                          {!inOther ? "+ " : "  "}{a}
                        </div>
                      );
                    })}
                    <div className={`pl-4 ${
                      (vA.slots[slotKey as keyof typeof vA.slots]?.maxTokens) !== slotData.maxTokens
                        ? "text-yellow-700 bg-yellow-50" : "text-gray-400"
                    }`}>
                      max_tokens: {slotData.maxTokens}
                      {(vA.slots[slotKey as keyof typeof vA.slots]?.maxTokens) !== slotData.maxTokens &&
                        ` (was ${vA.slots[slotKey as keyof typeof vA.slots]?.maxTokens})`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 变更摘要 */}
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-600">
              变更摘要 (v{vA.version} → v{vB.version})
            </div>
            <div className="p-4 space-y-1">
              {vB.changes.map((c, i) => (
                <div key={i} className={`text-xs px-3 py-1 rounded ${
                  c.type === "+" ? "bg-green-50 text-green-700" :
                  c.type === "-" ? "bg-red-50 text-red-700" :
                  "bg-yellow-50 text-yellow-700"
                }`}>
                  {c.type} {c.desc}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Eye className="h-3.5 w-3.5" /> 查看 v{vB.version} 关联快照
            </Button>
            {vA.status !== "active" && (
              <Button variant="outline" size="sm" className="text-xs gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => toast({ title: `已回滚到 v${vA.version}` })}>
                <RotateCcw className="h-3.5 w-3.5" /> 一键回滚到 v{vA.version}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
