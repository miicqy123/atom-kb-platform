"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

export default function BlueprintsPage() {
  const { currentProject } = useProjectStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, isLoading } = trpc.blueprint.getAll.useQuery({
    projectId: currentProject?.id ?? "",
    search: search || undefined,
    status: statusFilter || undefined,
    limit,
    offset
  }, {
    enabled: !!currentProject
  });

  const columns = [
    { key: "name", label: "蓝图名称" },
    { key: "status", label: "状态" },
    { key: "position", label: "岗位" },
    { key: "taskName", label: "任务" },
    { key: "version", label: "版本" },
    { key: "createdAt", label: "创建时间" }
  ];

  // 计算总页数
  const totalPages = data ? Math.ceil(data.totalCount / limit) : 1;

  return (
    <div>
      <PageHeader title="蓝图库" description="Blueprint 蓝图的创建、配置与版本管理"
        actions={<button className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white"><Plus className="h-4 w-4" />新建蓝图</button>} />

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索蓝图…" className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="">全部状态</option>
          {["DRAFT","REVIEW","APPROVED","ARCHIVED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <div className="py-12 text-center text-gray-400">加载中…</div> : (
        <div className="grid grid-cols-3 gap-4">
          {(data?.items ?? []).map((bp: any) => (
            <Link href={`/prompts/editor/${bp.id}`} key={bp.id} className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{bp.name}</h3>
                <StatusBadge status={bp.status} />
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {bp.position && <p>岗位: {bp.position}</p>}
                {bp.taskName && <p>任务: {bp.taskName}</p>}
                <p>workflow: <span className="font-mono text-brand">{bp.workflowMode}</span></p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">v{bp.version} · 引用 {bp._count?.atoms ?? 0} 原子块</span>
                {bp.qualityPassRate != null && <ConfidenceBar value={bp.qualityPassRate} />}
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
    </div>
  );
}