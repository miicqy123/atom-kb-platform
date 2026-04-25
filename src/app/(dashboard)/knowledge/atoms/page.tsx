"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { LayerBadge } from "@/components/ui/LayerBadge";
import { GranularityBadge } from "@/components/ui/GranularityBadge";
import { SlotTag } from "@/components/ui/SlotTag";
import { Pagination } from "@/components/ui/Pagination";
import {
  CATEGORY_OPTIONS, getSubcategoryOptions,
  CATEGORY_LABEL_MAP, SUBCATEGORY_LABEL_MAP,
} from "@/lib/categoryMaps";
import { Plus, Search, LayoutGrid, Table2, Kanban, Edit, Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AtomDialog from "@/components/knowledge/AtomDialog";
import { useToast } from "@/hooks/use-toast";

export default function AtomsPage() {
  const { projectId } = useProjectStore();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [view, setView] = useState<"table" | "card" | "kanban">("table");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAtom, setEditingAtom] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const utils = trpc.useUtils();

  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, isLoading } = trpc.atom.getAll.useQuery({
    projectId: projectId ?? "",
    search: search || undefined,
    layer: (layerFilter || undefined) as "A" | "B" | "C" | "D" | undefined,
    status: (statusFilter || undefined) as "DRAFT" | "TESTING" | "ACTIVE" | "ARCHIVED" | undefined,
    category: (categoryFilter || undefined) as "CAT_WHO" | "CAT_WHAT" | "CAT_HOW" | "CAT_STYLE" | "CAT_FENCE" | "CAT_PROOF" | undefined,
    subcategory: (subcategoryFilter || undefined) as
      | "WHO_BRAND" | "WHO_ROLE" | "WHO_AUDIENCE" | "WHO_TERM"
      | "WHAT_PRODUCT" | "WHAT_USP" | "WHAT_PRICE" | "WHAT_CERT"
      | "HOW_SOP" | "HOW_METHOD" | "HOW_TACTIC" | "HOW_BEST"
      | "STYLE_HOOK" | "STYLE_WORD" | "STYLE_TONE" | "STYLE_RHYTHM"
      | "FENCE_BAN" | "FENCE_ALLOW" | "FENCE_LAW" | "FENCE_BLUR"
      | "PROOF_CASE" | "PROOF_DATA" | "PROOF_FAIL" | "PROOF_COMPARE"
      | undefined,
    limit,
    offset
  }, {
    enabled: !!projectId
  });

  const { data: stats } = trpc.atom.getStats.useQuery({
    projectId: projectId ?? "",
  }, {
    enabled: !!projectId
  });

  // 批量激活 mutation
  const activateMutation = trpc.atom.batchActivate.useMutation({
    onSuccess: (d) => {
      toast({ title: `已激活 ${d.count} 个原子块` });
      setSelectedIds([]);
      utils.atom.getAll.invalidate();
    },
    onError: (e) => toast({ title: '激活失败', description: e.message, variant: 'destructive' }),
  });

  // 批量归档 mutation
  const archiveMutation = trpc.atom.batchArchive.useMutation({
    onSuccess: (d) => {
      toast({ title: `已归档 ${d.count} 个原子块` });
      setSelectedIds([]);
      utils.atom.getAll.invalidate();
    },
  });

  const deleteMutation = trpc.atom.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "原子块已成功删除",
      });
      utils.atom.getAll.invalidate(); // 使缓存失效
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除原子块时出现错误",
        variant: "destructive",
      });
    }
  });

  const columns: Column<any>[] = [
    {
      key: "checkbox",
      label: <input
        type="checkbox"
        checked={data?.items?.length > 0 && selectedIds.length === data.items.filter((a: any) => a.status === 'DRAFT').length}
        onChange={e => {
          if (e.target.checked) {
            // Select all draft items
            const draftIds = data?.items?.filter((a: any) => a.status === 'DRAFT').map((a: any) => a.id) || [];
            setSelectedIds(draftIds);
          } else {
            setSelectedIds([]);
          }
        }}
        className="w-4 h-4 rounded"
      />,
      render: (r: any) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(r.id)}
          onChange={e => {
            if (e.target.checked) setSelectedIds(prev => [...prev, r.id]);
            else setSelectedIds(prev => prev.filter(id => id !== r.id));
          }}
          className="w-4 h-4 rounded"
        />
      )
    },
    { key: "title", label: "原子块名称", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "layer", label: "层级", render: (r) => <LayerBadge layer={r.layer} /> },
    { key: "granularity", label: "粒度", render: (r) => <GranularityBadge g={r.granularity} /> },
    { key: "dimensions", label: "维度", render: (r) => <span className="text-xs text-gray-500">{r.dimensions?.slice(0, 5).join(", ")}{r.dimensions?.length > 5 ? "…" : ""}</span> },
    { key: "slotMappings", label: "槽位", render: (r) => <div className="flex flex-wrap gap-1">{r.slotMappings?.slice(0, 3).map((s: string) => <SlotTag key={s} slot={s} />)}</div> },
    { key: "category", label: "类别", render: (r) => {
      const label = CATEGORY_LABEL_MAP[r.category];
      if (!label) return <span className="text-xs text-gray-400">-</span>;
      const colorMap: Record<string, string> = {
        CAT_WHO: "bg-blue-100 text-blue-700 border-blue-200",
        CAT_WHAT: "bg-green-100 text-green-700 border-green-200",
        CAT_HOW: "bg-orange-100 text-orange-700 border-orange-200",
        CAT_STYLE: "bg-purple-100 text-purple-700 border-purple-200",
        CAT_FENCE: "bg-red-100 text-red-700 border-red-200",
        CAT_PROOF: "bg-yellow-100 text-yellow-700 border-yellow-200",
      };
      return <Badge variant="outline" className={colorMap[r.category] || ""}>{label}</Badge>;
    }},
    { key: "subcategory", label: "子类别", render: (r) => {
      const label = SUBCATEGORY_LABEL_MAP[r.subcategory];
      return <span className="text-xs text-gray-600">{label || "-"}</span>;
    }},
    { key: "status", label: "状态", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", label: "创建时间", render: (r) => <span className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</span> },
    { key: "actions", label: "操作", render: (r) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditingAtom(r)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm("确定要删除这个原子块吗？此操作不可撤销。")) {
              deleteMutation.mutate({ id: r.id });
            }
          }}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
        {/* 单条快捷激活 */}
        {r.status === 'DRAFT' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => activateMutation.mutate({ ids: [r.id], projectId: projectId ?? "" })}
          >
            激活
          </Button>
        )}
      </div>
    )},
  ];

  // 计算总页数
  const totalPages = data ? Math.ceil(data.totalCount / limit) : 1;

  return (
    <div>
      <PageHeader
        title="Atoms 原子块浏览器"
        description="多视图浏览与编辑原子块资产"
        actions={
          <Button className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4" />新建原子块
          </Button>
        }
      />

      {/* ── 统计面板 ── */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-gray-400 mb-1">原子块总数</p>
          <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
        </div>
        {["A","B","C","D"].map(l => {
          const count = stats?.byLayer?.find(s => s.layer === l)?._count?._all ?? 0;
          return (
            <div key={l} className="rounded-xl border bg-white p-4">
              <p className="text-xs text-gray-400 mb-1">{l} 层</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      {/* ── 按类别分布 ── */}
      {(() => {
        const categoryChartData = (stats?.byCategory || [])
          .filter(item => item.category !== null)
          .map(item => ({
            name: CATEGORY_LABEL_MAP[item.category!] || item.category!,
            value: item._count._all,
            category: item.category!,
          }));

        const CATEGORY_COLORS: Record<string, string> = {
          CAT_WHO: '#3B82F6',
          CAT_WHAT: '#22C55E',
          CAT_HOW: '#F97316',
          CAT_STYLE: '#A855F7',
          CAT_FENCE: '#EF4444',
          CAT_PROOF: '#EAB308',
        };

        return categoryChartData.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> 按内容类别分布
            </h3>
            <div className="bg-white rounded-lg border p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical" margin={{ left: 80, right: 20, top: 4, bottom: 4 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryChartData.map((entry) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-400 text-center py-8">
              暂无分类数据，新入库的原子块将自动打标签
            </p>
          </div>
        );
      })()}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索原子块…"
            className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm"
          />
        </div>
        <select
          value={layerFilter}
          onChange={e => setLayerFilter(e.target.value)}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">全部层级</option>
          {["A","B","C","D"].map(l => <option key={l} value={l}>{l} 层</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">全部状态</option>
          {["DRAFT","TESTING","ACTIVE","ARCHIVED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={e => {
            setCategoryFilter(e.target.value);
            setSubcategoryFilter("");
          }}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">全部类别</option>
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={subcategoryFilter}
          onChange={e => setSubcategoryFilter(e.target.value)}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">全部子类别</option>
          {getSubcategoryOptions(categoryFilter || undefined).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex rounded-lg border">
          {(["table", "card", "kanban"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1.5 ${view === v ? "bg-brand/10 text-brand" : "text-gray-400"}`}
            >
              {v === "table" ? <Table2 className="h-4 w-4" /> : v === "card" ? <LayoutGrid className="h-4 w-4" /> : <Kanban className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      {view === "table" && (
        <>
          {/* ── 批量操作栏 ── */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
              <span className="text-sm text-blue-700 font-medium">已选 {selectedIds.length} 项</span>
              <button
                onClick={() => activateMutation.mutate({ ids: selectedIds, projectId: projectId ?? "" })}
                disabled={activateMutation.isPending}
                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-40"
              >
                ✓ 批量激活（ACTIVE）
              </button>
              <button
                onClick={() => archiveMutation.mutate({ ids: selectedIds })}
                disabled={archiveMutation.isPending}
                className="px-3 py-1.5 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 disabled:opacity-40"
              >
                归档
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
              >
                取消选择
              </button>
            </div>
          )}
          <DataTable columns={columns} data={data?.items ?? []} loading={isLoading} />
        </>
      )}

      {view === "card" && (
        <>
          {/* ── 批量操作栏 ── */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
              <span className="text-sm text-blue-700 font-medium">已选 {selectedIds.length} 项</span>
              <button
                onClick={() => activateMutation.mutate({ ids: selectedIds, projectId: projectId ?? "" })}
                disabled={activateMutation.isPending}
                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-40"
              >
                ✓ 批量激活（ACTIVE）
              </button>
              <button
                onClick={() => archiveMutation.mutate({ ids: selectedIds })}
                disabled={archiveMutation.isPending}
                className="px-3 py-1.5 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 disabled:opacity-40"
              >
                归档
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
              >
                取消选择
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {(data?.items ?? []).map((atom: any) => (
              <div key={atom.id} className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(atom.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(prev => [...prev, atom.id]);
                      else setSelectedIds(prev => prev.filter(id => id !== atom.id));
                    }}
                    className="mt-1 w-4 h-4 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm">{atom.title}</h3>
                      <StatusBadge status={atom.status} />
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{atom.content}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <LayerBadge layer={atom.layer} />
                      <GranularityBadge g={atom.granularity} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{new Date(atom.createdAt).toLocaleDateString()}</span>
                      <span>v{atom.version}</span>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingAtom(atom)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("确定要删除这个原子块吗？此操作不可撤销。")) {
                            deleteMutation.mutate({ id: atom.id });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                    {/* 单条快捷激活 */}
                    {atom.status === 'DRAFT' && (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => activateMutation.mutate({ ids: [atom.id], projectId: projectId ?? "" })}
                          className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100"
                        >
                          激活
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "kanban" && (
        <>
          {/* ── 批量操作栏 ── */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
              <span className="text-sm text-blue-700 font-medium">已选 {selectedIds.length} 项</span>
              <button
                onClick={() => activateMutation.mutate({ ids: selectedIds, projectId: projectId ?? "" })}
                disabled={activateMutation.isPending}
                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-40"
              >
                ✓ 批量激活（ACTIVE）
              </button>
              <button
                onClick={() => archiveMutation.mutate({ ids: selectedIds })}
                disabled={archiveMutation.isPending}
                className="px-3 py-1.5 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 disabled:opacity-40"
              >
                归档
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
              >
                取消选择
              </button>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            {["ACTIVE","DRAFT","TESTING","ARCHIVED"].map(status => (
              <div key={status} className="rounded-xl bg-gray-50 p-3">
                <h3 className="text-xs font-semibold mb-2">
                  <StatusBadge status={status} />
                </h3>
                <div className="space-y-2">
                  {(data?.items ?? []).filter((a: any) => a.status === status).map((atom: any) => (
                    <div key={atom.id} className="rounded-lg border bg-white p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(atom.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedIds(prev => [...prev, atom.id]);
                            else setSelectedIds(prev => prev.filter(id => id !== atom.id));
                          }}
                          className="mt-0.5 w-4 h-4 rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-xs">{atom.title}</p>
                          <div className="mt-1">
                            <LayerBadge layer={atom.layer} />
                          </div>
                          <div className="mt-2 flex justify-between">
                            <span className="text-xs">{new Date(atom.createdAt).toLocaleDateString()}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingAtom(atom)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm("确定要删除这个原子块吗？此操作不可撤销。")) {
                                    deleteMutation.mutate({ id: atom.id });
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          {/* 单条快捷激活 */}
                          {atom.status === 'DRAFT' && (
                            <div className="mt-1">
                              <button
                                onClick={() => activateMutation.mutate({ ids: [atom.id], projectId: projectId ?? "" })}
                                className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100"
                              >
                                激活
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      <AtomDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId ?? ""}
        onComplete={() => setShowCreateDialog(false)}
      />

      <AtomDialog
        open={!!editingAtom}
        onOpenChange={() => setEditingAtom(null)}
        projectId={projectId ?? ""}
        atom={editingAtom}
        onComplete={() => setEditingAtom(null)}
      />
    </div>
  );
}