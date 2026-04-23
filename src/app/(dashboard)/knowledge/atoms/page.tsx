"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LayerBadge } from "@/components/ui/LayerBadge";
import { GranularityBadge } from "@/components/ui/GranularityBadge";
import { SlotTag } from "@/components/ui/SlotTag";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Search, LayoutGrid, Table2, Kanban, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import AtomDialog from "@/components/knowledge/AtomDialog";
import { useToast } from "@/hooks/use-toast";

export default function AtomsPage() {
  const { currentProject } = useProjectStore();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<"table" | "card" | "kanban">("table");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAtom, setEditingAtom] = useState<any>(null);

  const utils = trpc.useUtils();

  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, isLoading } = trpc.atom.getAll.useQuery({
    projectId: currentProject?.id ?? "",
    search: search || undefined,
    layer: (layerFilter || undefined) as "A" | "B" | "C" | "D" | undefined,
    status: (statusFilter || undefined) as "DRAFT" | "TESTING" | "ACTIVE" | "ARCHIVED" | undefined,
    limit,
    offset
  }, {
    enabled: !!currentProject
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
    { key: "title", label: "原子块名称", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "layer", label: "层级", render: (r) => <LayerBadge layer={r.layer} /> },
    { key: "granularity", label: "粒度", render: (r) => <GranularityBadge g={r.granularity} /> },
    { key: "dimensions", label: "维度", render: (r) => <span className="text-xs text-gray-500">{r.dimensions?.slice(0, 5).join(", ")}{r.dimensions?.length > 5 ? "…" : ""}</span> },
    { key: "slotMappings", label: "槽位", render: (r) => <div className="flex flex-wrap gap-1">{r.slotMappings?.slice(0, 3).map((s: string) => <SlotTag key={s} slot={s} />)}</div> },
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

      {view === "table" && <DataTable columns={columns} data={data?.items ?? []} loading={isLoading} />}

      {view === "card" && (
        <div className="grid grid-cols-3 gap-4">
          {(data?.items ?? []).map((atom: any) => (
            <div key={atom.id} className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow cursor-pointer">
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
            </div>
          ))}
        </div>
      )}

      {view === "kanban" && (
        <div className="grid grid-cols-4 gap-4">
          {["ACTIVE","DRAFT","TESTING","ARCHIVED"].map(status => (
            <div key={status} className="rounded-xl bg-gray-50 p-3">
              <h3 className="text-xs font-semibold mb-2">
                <StatusBadge status={status} />
              </h3>
              <div className="space-y-2">
                {(data?.items ?? []).filter((a: any) => a.status === status).map((atom: any) => (
                  <div key={atom.id} className="rounded-lg border bg-white p-3 text-sm">
                    <p className="font-medium text-xs">{atom.title}</p>
                    <div className="mt-1">
                      <LayerBadge layer={atom.layer} />
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      <AtomDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={currentProject?.id ?? ""}
        onComplete={() => setShowCreateDialog(false)}
      />

      <AtomDialog
        open={!!editingAtom}
        onOpenChange={() => setEditingAtom(null)}
        projectId={currentProject?.id ?? ""}
        atom={editingAtom}
        onComplete={() => setEditingAtom(null)}
      />
    </div>
  );
}