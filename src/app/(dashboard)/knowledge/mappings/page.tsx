// src/app/(dashboard)/knowledge/mappings/page.tsx
"use client";
import { useState } from 'react';
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';
import { Badge } from '@/components/ui/Badge';

export default function MappingsPage() {
  const { projectId } = useProjectStore();
  const [tab, setTab] = useState('by-slot');

  const { data: atoms } = trpc.atom.getAll.useQuery({ projectId: projectId ?? "", limit: 200 });
  const { data: blueprints } = trpc.blueprint.getAll.useQuery({ projectId: projectId ?? "" });

  // 由于无法直接从atom获取蓝图信息，暂时使用mock数据或者隐藏相关字段
  const atomsWithCount = (atoms?.items || []).map(atom => ({
    ...atom,
    blueprintCount: atom.blueprints?.length || 0 // 获取关联的蓝图数量
  }));

  // 视图1：按槽位分组
  const bySlot = (atomsWithCount || []).reduce<Record<string, any[]>>((acc, atom) => {
    const slot = atom.slotMappings?.[0] || '未分配';
    if (!acc[slot]) acc[slot] = [];
    acc[slot].push(atom);
    return acc;
  }, {});

  // 视图4：孤儿（未被蓝图引用）- 由于当前API限制，暂时显示全部
  const orphans = atomsWithCount;

  return (
    <div className="p-6">
      <PageHeader title="知识库 ↔ Prompt 映射" description="5种映射视图" />
      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="by-slot">按槽位分组</TabsTrigger>
          <TabsTrigger value="by-blueprint">蓝图反查</TabsTrigger>
          <TabsTrigger value="matrix">维度×层级矩阵</TabsTrigger>
          <TabsTrigger value="orphan">孤儿视图</TabsTrigger>
          <TabsTrigger value="heatmap">高频引用</TabsTrigger>
        </TabsList>

        {/* 视图1：按槽位分组 */}
        <TabsContent value="by-slot">
          {Object.entries(bySlot).sort().map(([slot, items]) => (
            <div key={slot} className="mb-6">
              <h3 className="font-semibold text-sm mb-2 text-blue-600">{slot} ({items.length})</h3>
              <div className="space-y-1">
                {items.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 border rounded text-sm">
                    <Badge variant="outline">{a.layer}</Badge>
                    <span className="flex-1 truncate">{a.title}</span>
                    <Badge variant="secondary">{a.granularity}</Badge>
                    <span className="text-gray-400 text-xs">
                      {a.blueprintCount || 0} 蓝图
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* 视图2：蓝图反查 */}
        <TabsContent value="by-blueprint">
          <div className="space-y-6">
            {(blueprints?.items || []).map((bp: any) => {
              const bpAtoms = (atoms?.items || []).filter(
                a => a.blueprints?.some((ab: any) => ab.blueprint?.id === bp.id)
              );
              return (
                <div key={bp.id} className="border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-sm">{bp.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{bp.status}</span>
                    <span className="text-xs text-gray-400 ml-auto">{bpAtoms.length} 个原子块</span>
                  </div>
                  <div className="space-y-1">
                    {bpAtoms.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs text-gray-600 p-1.5 bg-gray-50 rounded">
                        <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{a.layer}</span>
                        <span className="truncate flex-1">{a.title}</span>
                        <span className="text-gray-400">{a.slotMappings?.[0]}</span>
                      </div>
                    ))}
                    {bpAtoms.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">暂无关联原子块</p>
                    )}
                  </div>
                </div>
              );
            })}
            {!(blueprints?.items?.length) && (
              <p className="text-sm text-gray-400 text-center py-8">暂无蓝图</p>
            )}
          </div>
        </TabsContent>

        {/* 视图3：30×4 维度×层级矩阵 */}
        <TabsContent value="matrix">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2 text-left w-32">维度</th>
                  {(['A','B','C','D'] as const).map(layer => (
                    <th key={layer} className={`border px-3 py-2 text-center ${
                      layer === 'A' ? 'bg-blue-50' :
                      layer === 'B' ? 'bg-green-50' :
                      layer === 'C' ? 'bg-orange-50' : 'bg-red-50'
                    }`}>{layer} 层</th>
                  ))}
                  <th className="border px-3 py-2 text-center bg-gray-50">合计</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(dim => {
                  const dimAtoms = (atoms?.items || []).filter(
                    (a: any) => a.dimensions?.includes(dim)
                  );
                  const byLayer = {
                    A: dimAtoms.filter((a: any) => a.layer === 'A').length,
                    B: dimAtoms.filter((a: any) => a.layer === 'B').length,
                    C: dimAtoms.filter((a: any) => a.layer === 'C').length,
                    D: dimAtoms.filter((a: any) => a.layer === 'D').length,
                  };
                  const total = dimAtoms.length;
                  return (
                    <tr key={dim} className={`hover:bg-yellow-50 ${
                      total === 0 ? 'text-gray-300' : ''
                    }`}>
                      <td className="border px-3 py-1.5 font-mono">D{String(dim).padStart(2,'0')}</td>
                      {(['A','B','C','D'] as const).map(layer => (
                        <td key={layer} className="border px-3 py-1.5 text-center">
                          {byLayer[layer] > 0 ? (
                            <span className={`inline-block w-6 h-6 rounded-full text-white text-xs leading-6 ${
                              layer === 'A' ? 'bg-blue-500' :
                              layer === 'B' ? 'bg-green-500' :
                              layer === 'C' ? 'bg-orange-500' : 'bg-red-500'
                            }`}>{byLayer[layer]}</span>
                          ) : <span className="text-gray-200">·</span>}
                        </td>
                      ))}
                      <td className="border px-3 py-1.5 text-center font-semibold">
                        {total > 0 ? total : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-2">数字 = 该维度×层级下的原子块数量，点击可筛选（待实现）</p>
          </div>
        </TabsContent>

        {/* 视图4：孤儿视图 */}
        <TabsContent value="orphan">
          <div className="mb-2 text-sm text-orange-500">
            共 {orphans.length} 个原子块（暂无蓝图关联数据）
          </div>
          {orphans.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-2 border rounded text-sm mb-1">
              <Badge variant="outline">{a.layer}</Badge>
              <span className="flex-1 truncate">{a.title}</span>
              <span className="text-xs text-gray-400">{a.slotMappings?.[0]}</span>
            </div>
          ))}
        </TabsContent>

        {/* 视图5：高频引用 */}
        <TabsContent value="heatmap">
          {[...(atomsWithCount || [])]
            .sort((a, b) => (b.blueprintCount || 0) - (a.blueprintCount || 0))
            .slice(0, 20)
            .map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 border rounded text-sm mb-1">
                <span className="w-6 text-center font-bold text-orange-500">
                  {a.blueprintCount || 0}
                </span>
                <Badge variant="outline">{a.layer}</Badge>
                <span className="flex-1 truncate">{a.title}</span>
              </div>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}