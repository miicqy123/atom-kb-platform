"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Plus, GitBranch, RefreshCw, Users, Database, Play, Settings, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import WorkflowDialog from "@/components/orchestration/WorkflowDialog";
import { useToast } from "@/hooks/use-toast";

const MODES = [
  { key: "DAG", label: "DAG 有向无环图", icon: <GitBranch className="h-5 w-5" />, desc: "固定节点顺序执行，适合标准化流程", color: "border-blue-200 bg-blue-50" },
  { key: "REACT", label: "ReAct 推理-行动", icon: <RefreshCw className="h-5 w-5" />, desc: "思考→行动→观察循环，适合探索性任务", color: "border-purple-200 bg-purple-50" },
  { key: "ROLE_COLLABORATION", label: "角色协作", icon: <Users className="h-5 w-5" />, desc: "多角色协作分工，适合复杂内容生产", color: "border-green-200 bg-green-50" },
  { key: "STATEFUL_GRAPH", label: "有状态图+HITL", icon: <Database className="h-5 w-5" />, desc: "支持断点恢复和人工接管，适合高风险任务", color: "border-orange-200 bg-orange-50" },
];

export default function WorkflowsPage() {
  const { toast } = useToast();
  const { currentProject } = useProjectStore();
  const [activeMode, setActiveMode] = useState("DAG");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);

  const utils = trpc.useUtils();

  // 获取工作流列表
  const { data: workflows, isLoading, refetch } = trpc.workflow.getAll.useQuery(
    { projectId: currentProject?.id ?? "" },
    { enabled: !!currentProject }
  );

  const deleteWorkflow = trpc.workflow.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "Workflow 已成功删除",
      });
      utils.workflow.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除 Workflow 时出现错误",
        variant: "destructive",
      });
    }
  });

  const handleDeleteWorkflow = (workflowId: string, workflowName: string) => {
    if (window.confirm(`确定要删除 Workflow "${workflowName}" 吗？此操作不可撤销。`)) {
      deleteWorkflow.mutate({ id: workflowId });
    }
  };

  const runWorkflow = trpc.workflow.run.useMutation({
    onSuccess: () => {
      toast({
        title: "运行成功",
        description: "Workflow 已开始运行",
      });
    },
    onError: (error) => {
      toast({
        title: "运行失败",
        description: error.message || "运行 Workflow 时出现错误",
        variant: "destructive",
      });
    }
  });

  const handleRunWorkflow = (workflowId: string, workflowName: string) => {
    runWorkflow.mutate({ id: workflowId });
  };

  return (
    <div>
      <PageHeader
        title="Workflow 模板管理"
        description="管理 4 种 workflow_mode 的节点编排模板"
        actions={
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" />新建模板
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        {MODES.map(m => (
          <button key={m.key} onClick={() => setActiveMode(m.key)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${activeMode === m.key ? m.color + " ring-2 ring-brand" : "border-gray-100 bg-white hover:border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-2">{m.icon}<span className="font-semibold text-sm">{m.label}</span></div>
            <p className="text-xs text-gray-500">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* 显示现有工作流列表 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">我的工作流</h3>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">加载中…</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(workflows?.items ?? []).map((workflow: any) => (
              <div key={workflow.id} className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{workflow.name}</h4>
                  <StatusBadge status={workflow.status} />
                </div>
                <p className="text-xs text-gray-500 mb-3">{workflow.description || "暂无描述"}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{workflow.triggerType}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRunWorkflow(workflow.id, workflow.name)}
                      disabled={runWorkflow.isPending}
                      className="text-xs"
                    >
                      <Play className="h-3 w-3 mr-1" /> 运行
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingWorkflow(workflow)}
                      className="text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" /> 编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteWorkflow(workflow.id, workflow.name)}
                      disabled={deleteWorkflow.isPending}
                      className="text-xs"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {workflows && workflows.items.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                暂无工作流，请创建新的工作流模板
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-sm font-semibold mb-4">可视化节点编辑器 — {MODES.find(m => m.key === activeMode)?.label}</h3>
        <div className="h-80 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <GitBranch className="mx-auto h-12 w-12 mb-2" />
            <p className="text-sm">拖拽节点到画布以配置 Workflow</p>
            <p className="text-xs mt-1">每个节点可绑定蓝图/工具/人工审核点</p>
            <div className="mt-4 flex gap-2 justify-center">
              <span className="rounded border px-2 py-1 text-xs">🎯 Planner</span>
              <span className="rounded border px-2 py-1 text-xs">⚡ Generator</span>
              <span className="rounded border px-2 py-1 text-xs">✅ Evaluator</span>
              <span className="rounded border px-2 py-1 text-xs">🤝 Handoff</span>
              <span className="rounded border px-2 py-1 text-xs">👤 HITL</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3"><h4 className="text-xs font-semibold mb-1">3A 闭环配置</h4><p className="text-xs text-gray-500">每个节点的 Planner → Generator → Evaluator 参数</p></div>
          <div className="rounded-lg border p-3"><h4 className="text-xs font-semibold mb-1">Handoff 协议</h4><p className="text-xs text-gray-500">节点间消息格式预览</p></div>
          <div className="rounded-lg border p-3"><h4 className="text-xs font-semibold mb-1">Checkpointer</h4><p className="text-xs text-gray-500">stateful_graph 持久化 + 人工接管点</p></div>
        </div>
      </div>

      <WorkflowDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={currentProject?.id ?? ""}
        onComplete={() => {
          setShowCreateDialog(false);
        }}
      />

      <WorkflowDialog
        open={!!editingWorkflow}
        onOpenChange={() => setEditingWorkflow(null)}
        workflow={editingWorkflow}
        projectId={currentProject?.id ?? ""}
        onComplete={() => {
          setEditingWorkflow(null);
        }}
      />
    </div>
  );
}