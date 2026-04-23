"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AlertCircle, CheckCircle, Edit3, ArrowUp, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/use-toast";

export default function ReviewPage() {
  const { toast } = useToast();
  const { currentProject } = useProjectStore();
  const { data: queue, refetch } = trpc.review.queue.useQuery({ projectId: currentProject?.id ?? "" }, { enabled: !!currentProject });
  const resolve = trpc.review.resolve.useMutation();
  const deleteTask = trpc.review.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "审核任务已成功删除",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除审核任务时出现错误",
        variant: "destructive",
      });
    }
  });

  const [selected, setSelected] = useState<any>(null);
  const [editOutput, setEditOutput] = useState("");

  const urgencyColor = (u: string) => u === "RED" ? "bg-red-500" : u === "YELLOW" ? "bg-yellow-400" : "bg-green-400";

  const handleDeleteTask = (taskId: string, taskName: string) => {
    if (window.confirm(`确定要删除审核任务 "${taskName}" 吗？此操作不可撤销。`)) {
      deleteTask.mutate({ id: taskId });
    }
  };

  return (
    <div>
      <PageHeader title="HITL 人工接管队列" description="处理 S8 不通过 / 红线冲突 / 置信度极低 / 重试超限的人工审核任务" />

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-2">
          <h3 className="text-sm font-semibold mb-2">待审核队列 ({(queue ?? []).length})</h3>
          {(queue ?? []).map((task: any) => (
            <div key={task.id} onClick={() => { setSelected(task); setEditOutput(task.workflowRun?.outputContent ?? ""); }}
              className={`rounded-lg border p-3 cursor-pointer transition-colors ${selected?.id === task.id ? "ring-2 ring-oc border-oc" : "hover:bg-gray-50"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${urgencyColor(task.urgency)}`} />
                  <span className="text-sm font-medium">{task.workflowRun?.blueprint?.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={task.status} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id, task.workflowRun?.blueprint?.name || task.id);
                    }}
                    disabled={deleteTask.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">触发原因: {task.triggerReason}</p>
              <p className="text-xs text-gray-400">排队: {new Date(task.createdAt).toLocaleString("zh-CN")}</p>
              {task.assignee && <p className="text-xs text-gray-400">处理人: {task.assignee.name}</p>}
            </div>
          ))}
          {(!queue || queue.length === 0) && <p className="text-sm text-gray-400 text-center py-8">🎉 队列已清空</p>}
        </div>

        <div className="col-span-3">
          {selected ? (
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold mb-4">审核工作台</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">原始输入 + 上下文</h4>
                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">{JSON.stringify(selected.workflowRun?.inputData, null, 2) ?? "无输入数据"}</pre>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3">
                  <h4 className="text-xs font-semibold text-yellow-700 mb-2">模型输出（含质检标记）</h4>
                  <textarea value={editOutput} onChange={e => setEditOutput(e.target.value)} className="w-full h-32 text-xs font-mono border rounded p-2 bg-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => resolve.mutate({ id: selected.id, status: "APPROVED" })}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-xs text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-3.5 w-3.5" />通过
                </Button>
                <Button
                  onClick={() => resolve.mutate({ id: selected.id, status: "MODIFIED_APPROVED", modifiedOutput: editOutput })}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs text-white hover:bg-blue-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />修改后通过
                </Button>
                <Button
                  onClick={() => resolve.mutate({ id: selected.id, status: "REJECTED", feedback: "质量不达标" })}
                  className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-xs text-white hover:bg-red-700"
                >
                  <X className="h-3.5 w-3.5" />驳回
                </Button>
                <Button
                  onClick={() => resolve.mutate({ id: selected.id, status: "ESCALATED" })}
                  variant="outline"
                  className="flex items-center gap-1 px-4 py-2 text-xs"
                >
                  <ArrowUp className="h-3.5 w-3.5" />升级
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-12 text-center text-gray-400">
              <AlertCircle className="mx-auto h-10 w-10 mb-2" />
              <p>选择左侧任务以进入审核工作台</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}