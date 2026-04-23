"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { formatPercent } from "@/lib/utils";
import { Activity, CheckCircle, Clock, Coins, Zap, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/use-toast";

export default function RunsPage() {
  const { toast } = useToast();
  const { currentProject } = useProjectStore();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const utils = trpc.useUtils();

  const stats = trpc.workflowRun.todayStats.useQuery({ projectId: currentProject?.id ?? "" }, { enabled: !!currentProject });
  const { data, isLoading } = trpc.workflowRun.list.useQuery({ projectId: currentProject?.id ?? "", page, status: statusFilter || undefined }, { enabled: !!currentProject });

  const deleteRun = trpc.workflowRun.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "运行记录已成功删除",
      });
      utils.workflowRun.list.invalidate();
      utils.workflowRun.todayStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除运行记录时出现错误",
        variant: "destructive",
      });
    }
  });

  const handleDeleteRun = (runId: string, runName: string) => {
    if (window.confirm(`确定要删除运行记录 "${runName}" 吗？此操作不可撤销。`)) {
      deleteRun.mutate({ id: runId });
    }
  };

  const columns: Column<any>[] = [
    { key: "id", label: "执行 ID", render: (r) => <span className="font-mono text-xs text-brand">{r.id.slice(0, 8)}…</span> },
    { key: "blueprint", label: "Blueprint", render: (r) => <span className="text-sm">{r.blueprint?.name} <span className="text-xs text-gray-400">v{r.blueprintVersion}</span></span> },
    { key: "workflowMode", label: "Mode", render: (r) => <span className="rounded bg-oc/10 px-1.5 py-0.5 text-xs font-mono text-oc">{r.workflowMode}</span> },
    { key: "status", label: "状态", render: (r) => <StatusBadge status={r.status} /> },
    { key: "tokenUsage", label: "Token", render: (r) => <span className="text-xs">{r.tokenUsage?.toLocaleString() ?? "—"}</span> },
    { key: "duration", label: "耗时", render: (r) => <span className="text-xs">{r.duration ? r.duration.toFixed(1) + "s" : "—"}</span> },
    { key: "cost", label: "成本", render: (r) => <span className="text-xs">{r.cost ? "¥" + r.cost.toFixed(2) : "—"}</span> },
    { key: "businessResult", label: "回流", render: (r) => (
      <div className="flex gap-1">
        <span className={`h-2 w-2 rounded-full ${r.contentPerformance ? "bg-green-400" : "bg-gray-200"}`} title="内容" />
        <span className={`h-2 w-2 rounded-full ${r.roiMetrics ? "bg-green-400" : "bg-gray-200"}`} title="ROI" />
        <span className={`h-2 w-2 rounded-full ${r.conversionOutcome ? "bg-green-400" : "bg-gray-200"}`} title="客资" />
      </div>
    )},
    { key: "startedAt", label: "时间", render: (r) => <span className="text-xs text-gray-400">{new Date(r.startedAt).toLocaleString("zh-CN")}</span> },
    {
      key: "actions",
      label: "操作",
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              // 查看详情
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteRun(r.id, `${r.id.slice(0, 8)}...`)}
            disabled={deleteRun.isPending}
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="运行记录 Dashboard" description="WorkflowRun 执行记录、Trace 视图与业务结果回流" />

      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatsCard title="今日运行数" value={stats.data?.total ?? 0} icon={<Activity className="h-5 w-5 text-oc" />} color="text-oc" />
        <StatsCard title="成功率" value={stats.data ? formatPercent(stats.data.successRate) : "—"} icon={<CheckCircle className="h-5 w-5 text-green-500" />} color="text-green-600" />
        <StatsCard title="平均耗时" value={stats.data ? stats.data.avgDuration.toFixed(1) + "s" : "—"} icon={<Clock className="h-5 w-5 text-blue-500" />} color="text-blue-600" />
        <StatsCard title="总 Token" value={stats.data?.totalTokens?.toLocaleString() ?? "—"} icon={<Zap className="h-5 w-5 text-purple-500" />} color="text-purple-600" />
        <StatsCard title="总成本" value={stats.data ? "¥" + stats.data.totalCost.toFixed(2) : "—"} icon={<Coins className="h-5 w-5 text-orange-500" />} color="text-orange-600" />
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="">全部状态</option>{["RUNNING","SUCCESS","FAILED","DEGRADED","HUMAN_TAKEOVER"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} loading={isLoading} />
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}