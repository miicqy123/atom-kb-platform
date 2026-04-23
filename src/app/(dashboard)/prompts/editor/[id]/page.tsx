"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { SlotTag } from "@/components/ui/SlotTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Settings, Eye, Package, ChevronDown, ChevronRight, Search, Check, X } from "lucide-react";

export default function BlueprintEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: bp } = trpc.blueprint.getById.useQuery({ id });
  const preview = trpc.blueprint.assemblePreview.useQuery({ blueprintId: id });
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSlot, setPickerSlot] = useState("");

  const recommend = trpc.blueprint.recommendAtoms.useQuery({ blueprintId: id, slotKey: pickerSlot }, { enabled: showPicker && !!pickerSlot });

  if (!bp) return <div className="py-12 text-center text-gray-400">加载中…</div>;

  return (
    <div>
      <PageHeader title={`蓝图: ${bp.name}`} description={`${bp.position ?? ""} · ${bp.taskName ?? ""}`}
        actions={<div className="flex gap-2"><StatusBadge status={bp.status} /><span className="text-xs text-gray-400">v{bp.version}</span></div>} />

      <div className="grid grid-cols-12 gap-6">
        {/* 左栏: 蓝图信息 */}
        <div className="col-span-3 rounded-xl border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">蓝图信息</h3>
          <div className="text-xs space-y-2">
            <div><span className="text-gray-500">企业:</span> {bp.enterprise ?? "—"}</div>
            <div><span className="text-gray-500">岗位:</span> {bp.position ?? "—"}</div>
            <div><span className="text-gray-500">workflow_mode:</span> <span className="font-mono text-pf">{bp.workflowMode}</span></div>
            <div><span className="text-gray-500">版本:</span> v{bp.version}</div>
            <div><span className="text-gray-500">状态:</span> <StatusBadge status={bp.status} /></div>
          </div>
        </div>

        {/* 中栏: 槽位装配画布 */}
        <div className="col-span-5 rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">🔧 槽位装配画布</h3>
          <div className="space-y-2">
            {(bp.slotConfigs ?? []).map((sc: any) => (
              <div key={sc.id} className="rounded-lg border">
                <button onClick={() => setExpandedSlot(expandedSlot === sc.slotKey ? null : sc.slotKey)} className="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    {expandedSlot === sc.slotKey ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <SlotTag slot={sc.slotKey} />
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">{bp.atoms?.filter((a: any) => a.slotKey === sc.slotKey).length ?? 0} 原子块</span>
                  </div>
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {expandedSlot === sc.slotKey && (
                  <div className="border-t px-3 py-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-500">max_tokens:</span> {sc.maxTokens ?? "自动"}</div>
                      <div><span className="text-gray-500">dedupe:</span> {sc.dedupe ? "✅" : "❌"}</div>
                      <div><span className="text-gray-500">优先级:</span> {(sc.conflictPriority ?? []).join(" > ")}</div>
                      <div><span className="text-gray-500">fallback:</span> {sc.fallbackStrategy}</div>
                    </div>
                    <div className="space-y-1">
                      {bp.atoms?.filter((a: any) => a.slotKey === sc.slotKey).map((ab: any) => (
                        <div key={ab.atomId} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs">
                          <span>{ab.atom?.title}</span>
                          <button className="text-red-400 hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setPickerSlot(sc.slotKey); setShowPicker(true); }} className="w-full rounded-lg border border-dashed py-1.5 text-xs text-brand hover:bg-blue-50">+ 从库选料</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右栏: 预览 / 选料 */}
        <div className="col-span-4 rounded-xl border bg-white p-4">
          {showPicker ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">📦 从库选料 — <SlotTag slot={pickerSlot} /></h3>
                <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input placeholder="搜索原子块…" className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm" />
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(recommend.data ?? []).map((atom: any) => (
                  <div key={atom.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div>
                      <p className="text-sm font-medium">{atom.title}</p>
                      <p className="text-xs text-gray-400">被 {atom._count?.blueprints ?? 0} 蓝图引用</p>
                    </div>
                    <button className="rounded bg-brand px-2 py-1 text-xs text-white">
                      <Check className="inline h-3 w-3" /> 选用
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold">实时预览</h3>
              </div>
              {preview.data && (
                <div>
                  <div className="mb-3 flex gap-2">
                    <div className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs text-brand font-medium">预估 {preview.data.totalTokens} tokens</div>
                    <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs">{preview.data.slotStats.length} 槽位</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-3 font-mono text-xs leading-relaxed">
                    <pre className="whitespace-pre-wrap">{preview.data.prompt || "暂无装配内容"}</pre>
                  </div>
                  <div className="mt-3 space-y-1">
                    {preview.data.slotStats.map((s: any) => (
                      <div key={s.slot} className="flex items-center justify-between text-xs">
                        <SlotTag slot={s.slot} />
                        <span className="text-gray-500">{s.atomCount} 块 · {s.tokens} tokens</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}