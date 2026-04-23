"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

const VIEW_TABS = ["按槽位分组", "按蓝图反查", "维度×层级矩阵", "孤儿视图", "高频引用热力"];

export default function MappingsPage() {
  const { currentProject } = useProjectStore();
  const [view, setView] = useState(0);

  const matrix = trpc.atom.dimensionLayerMatrix.useQuery({ projectId: currentProject?.id ?? "" }, { enabled: !!currentProject && view === 2 });
  const orphans = trpc.atom.orphans.useQuery({ projectId: currentProject?.id ?? "" }, { enabled: !!currentProject && view === 3 });
  const hotAtoms = trpc.atom.hotAtoms.useQuery({ projectId: currentProject?.id ?? "" }, { enabled: !!currentProject && view === 4 });

  return (
    <div>
      <PageHeader title="5 种映射视图" description="可视化知识库与蓝图槽位的映射关系" />

      <div className="mb-4 flex gap-1">
        {VIEW_TABS.map((t, i) => (
          <button key={t} onClick={() => setView(i)} className={cn("rounded-lg px-3 py-1.5 text-sm", view === i ? "bg-brand text-white" : "border hover:bg-gray-50")}>{t}</button>
        ))}
      </div>

      {view === 2 && matrix.data && (
        <div className="overflow-x-auto rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">维度 × 层级矩阵（红色 = 0 条，需补料）</h3>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1">维度</th>
                <th className="px-2 py-1">A 认知</th>
                <th className="px-2 py-1">B 技能</th>
                <th className="px-2 py-1">C 风格</th>
                <th className="px-2 py-1">D 合规</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(matrix.data).map(([dim, layers]: [string, any]) => (
                <tr key={dim} className="border-t">
                  <td className="px-2 py-1 font-mono font-medium">D{dim}</td>
                  {["A","B","C","D"].map(l => (
                    <td key={l} className={cn("px-2 py-1 text-center", layers[l] === 0 ? "bg-red-100 text-red-600 font-bold" : "")}>{layers[l]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 3 && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">未被引用的孤儿原子块</h3>
          <div className="space-y-2">
            {(orphans.data ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <span className="font-medium text-sm">{a.title}</span>
                  <div className="flex gap-1 mt-1">
                    {a.slotMappings?.map((s: string) => <span key={s} className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-mono text-indigo-600">{s}</span>)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50">补关联</button>
                  <button className="rounded border px-2 py-1 text-xs text-orange-600 hover:bg-orange-50">归档</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 4 && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">高频引用原子块（按关联蓝图数排序）</h3>
          <div className="space-y-2">
            {(hotAtoms.data ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{a.title}</span>
                  {(a._count?.blueprints ?? 0) >= 5 && <span className="text-sm">🔥</span>}
                </div>
                <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">{a._count?.blueprints ?? 0} 蓝图引用</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(view === 0 || view === 1) && <div className="rounded-xl border bg-white p-12 text-center text-gray-400">视图 {view + 1} 渲染区域</div>}
    </div>
  );
}