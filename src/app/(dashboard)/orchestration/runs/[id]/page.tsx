"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCard } from "@/components/ui/StatsCard";
import { FeedbackWidget } from "@/components/orchestration/FeedbackWidget";
import { formatPercent } from "@/lib/utils";
import { Activity, CheckCircle, Clock, Coins, Zap } from "lucide-react";

export default function RunDetailPage() {
  const { id: runId } = useParams<{ id: string }>();

  const { data: run, isLoading } = trpc.workflowRun.getById.useQuery({ id: runId });

  if (isLoading) {
    return <div className="p-6">加载中...</div>;
  }

  if (!run) {
    return <div className="p-6">运行记录不存在</div>;
  }

  return (
    <div>
      <PageHeader
        title={`运行记录 #${run.id.slice(0, 8)}`}
        description={`${run.blueprint?.name} - v${run.blueprintVersion}`}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard title="状态" value={<StatusBadge status={run.status} />} />
        <StatsCard title="Token 使用" value={run.tokenUsage?.toLocaleString() ?? "—"} icon={<Zap className="h-5 w-5 text-purple-500" />} />
        <StatsCard title="执行耗时" value={run.duration ? run.duration.toFixed(1) + "s" : "—"} icon={<Clock className="h-5 w-5 text-blue-500" />} />
        <StatsCard title="成本" value={run.cost ? "¥" + run.cost.toFixed(2) : "—"} icon={<Coins className="h-5 w-5 text-orange-500" />} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-medium mb-3">输入数据</h3>
          <pre className="whitespace-pre-wrap break-words text-xs bg-gray-50 p-3 rounded">
            {JSON.stringify(run.inputData, null, 2)}
          </pre>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-medium mb-3">输出内容</h3>
          <pre className="whitespace-pre-wrap break-words text-xs bg-gray-50 p-3 rounded">
            {run.outputContent || "暂无输出"}
          </pre>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4">
        <h3 className="font-medium mb-3">性能指标</h3>
        <div className="grid grid-cols-3 gap-4">
          {run.contentPerformance && (
            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">内容性能</h4>
              <pre className="text-xs">{JSON.stringify(run.contentPerformance, null, 2)}</pre>
            </div>
          )}
          {run.roiMetrics && (
            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">ROI 指标</h4>
              <pre className="text-xs">{JSON.stringify(run.roiMetrics, null, 2)}</pre>
            </div>
          )}
          {run.conversionOutcome && (
            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">转化结果</h4>
              <pre className="text-xs">{JSON.stringify(run.conversionOutcome, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      {/* 业务结果回流反馈组件 */}
      <div className="mt-6">
        <FeedbackWidget runId={runId} />
      </div>
    </div>
  );
}