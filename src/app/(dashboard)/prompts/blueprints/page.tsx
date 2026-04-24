"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Search, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const MODE_STYLE: Record<string,{label:string;cls:string}> = {
  dag: { label:"DAG", cls:"bg-blue-100 text-blue-700" },
  react: { label:"ReAct", cls:"bg-purple-100 text-purple-700" },
  role_collaboration: { label:"角色协作", cls:"bg-orange-100 text-orange-700" },
  stateful_graph: { label:"有状态图", cls:"bg-green-100 text-green-700" },
};

export default function BlueprintsPage() {
  const { projectId } = useProjectStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const limit = 20;

  const { data, isLoading } = trpc.blueprint.getAll.useQuery({
    projectId: projectId ?? "", search: search || undefined, status: statusFilter || undefined, limit, offset: (page - 1) * limit,
  }, { enabled: !!projectId });

  const createMut = trpc.blueprint.create.useMutation({
    onSuccess: () => { toast({ title: "蓝图已创建" }); utils.blueprint.getAll.invalidate(); },
    onError: (e) => toast({ title: "创建失败", description: e.message, variant: "destructive" }),
  });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 1;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="蓝图库" description="管理和配置提示词蓝图"
        action={
          <Button onClick={() => createMut.mutate({ name: "新蓝图", projectId: projectId!, description: "" })}
            disabled={!projectId || createMut.isPending} className="gap-2 bg-brand text-white">
            <Plus className="h-4 w-4" /> {createMut.isPending ? "创建中…" : "新建蓝图"}
          </Button>
        }
      />

      {/* 筛选 */}
      <div className="flex items-center gap-3 px-6 py-3 border-b">
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索蓝图…"
            className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="">全部状态</option>
          {["DRAFT","REVIEW","APPROVED","ARCHIVED"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* 卡片网格 */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">加载中…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(data?.items ?? []).map((bp: any) => (
              <div key={bp.id} className="border rounded-xl bg-white p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/prompts/blueprints/${bp.id}`} className="text-sm font-bold text-gray-800 hover:text-brand">
                    📋 {bp.name}
                  </Link>
                  <StatusBadge status={bp.status} />
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                  {bp.position && <div>岗位: {bp.position}</div>}
                  {bp.taskName && <div>任务: {bp.taskName}</div>}
                  <div className="flex items-center gap-2">
                    <span>Mode:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MODE_STYLE[bp.workflowMode]?.cls || "bg-gray-100"}`}>
                      {MODE_STYLE[bp.workflowMode]?.label || bp.workflowMode}
                    </span>
                  </div>
                </div>

                {/* 质检进度 */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span>质检通过率</span>
                    <span>{bp.qualityPassRate ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-full rounded-full ${(bp.qualityPassRate ?? 0) >= 90 ? "bg-green-500" : (bp.qualityPassRate ?? 0) >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, bp.qualityPassRate ?? 0)}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">v{bp.version} · 📎引用 {bp._count?.atoms ?? 0} 个原子块</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Link href={`/prompts/blueprints/${bp.id}`}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-medium hover:bg-blue-100">
                      配置槽位
                    </Link>
                    <button className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-medium hover:bg-green-100 flex items-center gap-0.5">
                      <Play className="h-3 w-3" /> 测试
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && <div className="px-6 pb-4"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>}
    </div>
  );
}
