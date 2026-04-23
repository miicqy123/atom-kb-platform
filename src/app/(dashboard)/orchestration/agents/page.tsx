"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Plus, Bot, Zap, Clock, BarChart3, Edit, Trash2, Coins, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import AgentDialog from "@/components/orchestration/AgentDialog";
import { useToast } from "@/hooks/use-toast";
import type { RouterOutputs } from "@/lib/trpc";

type Agent = RouterOutputs["agent"]["getAll"]["items"][number];

const AGENT_STATUS_MAP: Record<string, string> = {
  DRAFT: "PENDING",
  REVIEW: "CONVERTING",
  APPROVED: "SUCCESS",
  ARCHIVED: "FAILED",
};

const AGENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  REVIEW: "审核中",
  APPROVED: "已批准",
  ARCHIVED: "已归档",
};

interface DeleteConfirmDialogProps {
  agentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function DeleteConfirmDialog({ agentName, onConfirm, onCancel, isLoading }: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">确认删除</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              确定要删除 Agent <span className="font-medium text-gray-800">"{agentName}"</span> 吗？此操作不可撤销。
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            取消
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? "删除中..." : "确认删除"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { toast } = useToast();
  const { currentProject } = useProjectStore();
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.agent.getAll.useQuery(
    { projectId: currentProject?.id ?? "" },
    { enabled: !!currentProject }
  );

  const agents = data?.items ?? [];

  const deleteAgent = trpc.agent.delete.useMutation({
    onSuccess: () => {
      toast({ title: "删除成功", description: "Agent 已成功删除" });
      utils.agent.getAll.invalidate();
      setDeletingAgent(null);
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除 Agent 时出现错误",
        variant: "destructive",
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setDialogMode("create");
  };

  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setDialogMode("edit");
  };

  const handleCloseDialog = () => {
    setDialogMode(null);
    setEditingAgent(null);
  };

  return (
    <div>
      <PageHeader
        title="Agent 列表"
        description="管理 Agent 实例、绑定蓝图与运行统计"
        actions={
          <Button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" />新建 Agent
          </Button>
        }
      />

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">加载中…</div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Bot className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">暂无 Agent</h3>
          <p className="text-sm text-gray-400 mb-6">创建第一个 Agent，绑定蓝图并开始运行</p>
          <Button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" />新建 Agent
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl border bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{agent.description ?? "无描述"}</p>
                  </div>
                </div>
                <StatusBadge
                  status={AGENT_STATUS_MAP[agent.status] ?? "PENDING"}
                  label={AGENT_STATUS_LABEL[agent.status]}
                />
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">绑定蓝图</p>
                <div className="flex flex-wrap gap-1">
                  {agent.blueprints?.length > 0
                    ? agent.blueprints.map((ab) => (
                        <span
                          key={ab.blueprintId}
                          className="rounded bg-brand/10 px-2 py-0.5 text-xs text-brand"
                        >
                          {ab.blueprint?.name}
                        </span>
                      ))
                    : <span className="text-xs text-gray-300">未绑定</span>
                  }
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <Zap className="mx-auto h-4 w-4 text-gray-300 mb-0.5" />
                  <p className="text-xs font-bold">{agent.totalRuns || 0}</p>
                  <p className="text-[10px] text-gray-400">总运行</p>
                </div>
                <div>
                  <BarChart3 className="mx-auto h-4 w-4 text-gray-300 mb-0.5" />
                  <p className="text-xs font-bold">
                    {agent.successRate != null ? (agent.successRate * 100).toFixed(0) + "%" : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400">成功率</p>
                </div>
                <div>
                  <Clock className="mx-auto h-4 w-4 text-gray-300 mb-0.5" />
                  <p className="text-xs font-bold">
                    {agent.avgDuration != null ? agent.avgDuration.toFixed(1) + "s" : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400">平均耗时</p>
                </div>
                <div>
                  <Coins className="mx-auto h-4 w-4 text-gray-300 mb-0.5" />
                  <p className="text-xs font-bold">
                    {agent.avgTokens != null ? Math.round(agent.avgTokens) : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400">平均Token</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenEdit(agent)}
                  title="编辑"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeletingAgent(agent)}
                  title="删除"
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AgentDialog
        open={dialogMode !== null}
        onOpenChange={(open) => { if (!open) handleCloseDialog(); }}
        agent={editingAgent}
        projectId={currentProject?.id ?? ""}
        onComplete={handleCloseDialog}
      />

      {deletingAgent && (
        <DeleteConfirmDialog
          agentName={deletingAgent.name}
          isLoading={deleteAgent.isPending}
          onConfirm={() => deleteAgent.mutate({ id: deletingAgent.id })}
          onCancel={() => setDeletingAgent(null)}
        />
      )}
    </div>
  );
}
