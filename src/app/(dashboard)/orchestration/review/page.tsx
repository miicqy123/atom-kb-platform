"use client";
import { useState } from 'react';
import { PageHeader } from "@/components/ui/PageHeader";
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

const URGENCY_COLOR: Record<string, string> = {
  RED: 'bg-red-100 text-red-700',
  YELLOW: 'bg-yellow-100 text-yellow-700',
  GREEN: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '待处理',
  IN_PROGRESS: '处理中',
  APPROVED: '已通过',
  MODIFIED_APPROVED: '修改通过',
  REJECTED: '已拒绝',
  ESCALATED: '已升级',
};

export default function ReviewPage() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modifiedOutput, setModifiedOutput] = useState('');
  const [feedback, setFeedback] = useState('');

  // 获取待处理任务列表
  const { data, refetch } = trpc.review.list.useQuery({ status: 'PENDING' });

  // 获取已处理任务
  const { data: doneData } = trpc.review.list.useQuery({ status: 'APPROVED' });

  // 处理任务 mutation
  const resolveMutation = trpc.review.resolve.useMutation({
    onSuccess: () => {
      toast({ title: '审核已提交' });
      setActiveId(null);
      setModifiedOutput('');
      setFeedback('');
      refetch();
    },
    onError: (e) => toast({ title: '提交失败', description: e.message, variant: 'destructive' }),
  });

  const activeTask = data?.items?.find(t => t.id === activeId);

  return (
    <div className="p-6">
      <PageHeader
        title="人工审核 (HITL)"
        description="质检不通过的节点输出，需要人工介入"
      />

      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* 左：待处理列表 */}
        <div className="col-span-1 border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <span className="font-semibold text-sm">
              待审核 ({data?.items?.length || 0})
            </span>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {data?.items?.map(task => (
              <div
                key={task.id}
                onClick={() => setActiveId(task.id)}
                className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${
                  activeId === task.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${URGENCY_COLOR[task.urgency]}`}>
                    {task.urgency}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(task.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{task.triggerReason}</p>
              </div>
            ))}
            {(!data?.items?.length) && (
              <div className="p-8 text-center text-sm text-gray-400">暂无待审核任务 ✅</div>
            )}
          </div>
        </div>

        {/* 右：审核详情 */}
        <div className="col-span-2 border rounded-xl p-5">
          {activeTask ? (
            <div className="space-y-5">
              {/* 触发原因 */}
              <div>
                <p className="text-xs text-gray-500 mb-1">触发原因</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                  {activeTask.triggerReason}
                </div>
              </div>

              {/* 原始输出（从 WorkflowRun 获取） */}
              <div>
                <p className="text-xs text-gray-500 mb-1">原始 AI 输出</p>
                <div className="bg-gray-50 border rounded-lg px-4 py-3 text-xs font-mono text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {activeTask.workflowRun?.outputContent || '（无原始输出）'}
                </div>
              </div>

              {/* 修改后输出 */}
              <div>
                <p className="text-xs text-gray-500 mb-1">修改后输出（可选）</p>
                <textarea
                  value={modifiedOutput}
                  onChange={e => setModifiedOutput(e.target.value)}
                  placeholder="如需修改输出，在此填写修正版本…"
                  className="w-full h-32 border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              {/* 审核意见 */}
              <div>
                <p className="text-xs text-gray-500 mb-1">审核意见</p>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="说明通过/拒绝的原因，帮助后续优化蓝图…"
                  className="w-full h-20 border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => resolveMutation.mutate({
                    id: activeTask.id,
                    status: 'APPROVED',
                    modifiedOutput,
                    feedback,
                  })}
                  disabled={resolveMutation.isPending}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-40"
                >
                  ✓ 通过
                </button>
                <button
                  onClick={() => resolveMutation.mutate({
                    id: activeTask.id,
                    status: 'MODIFIED_APPROVED',
                    modifiedOutput,
                    feedback,
                  })}
                  disabled={!modifiedOutput || resolveMutation.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
                >
                  ✎ 修改通过
                </button>
                <button
                  onClick={() => resolveMutation.mutate({
                    id: activeTask.id,
                    status: 'REJECTED',
                    modifiedOutput: '',
                    feedback,
                  })}
                  disabled={resolveMutation.isPending}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-40"
                >
                  ✗ 拒绝
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              ← 点击左侧任务开始审核
            </div>
          )}
        </div>
      </div>

      {/* 已处理记录 */}
      <div className="mt-8">
        <h3 className="font-semibold text-sm mb-3 text-gray-600">最近已处理 ({doneData?.items?.length || 0})</h3>
        <div className="space-y-2">
          {doneData?.items?.slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                {STATUS_LABEL[task.status]}
              </span>
              <span className="flex-1 text-gray-600 truncate">{task.triggerReason}</span>
              <span className="text-xs text-gray-400">
                {task.feedback?.slice(0, 30) || '无意见'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}