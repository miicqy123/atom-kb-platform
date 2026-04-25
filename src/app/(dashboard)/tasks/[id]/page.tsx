'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/Button';
import { ChevronLeft } from 'lucide-react';
import { TASK_TYPE_MAP, PLATFORM_MAP, AUDIENCE_MAP } from '@/lib/taskMaps';

const STATUS_MAP: Record<string, { icon: string; label: string }> = {
  pending: { icon: '⏳', label: '待处理' },
  processing: { icon: '🔄', label: '处理中' },
  done: { icon: '✅', label: '完成' },
  failed: { icon: '❌', label: '失败' },
};

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: task, isLoading } = trpc.task.getById.useQuery({ id: params.id });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">加载中...</div>;
  }

  if (!task) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">任务不存在</div>;
  }

  const st = STATUS_MAP[task.status] || STATUS_MAP.pending;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" /> 返回列表
      </Button>

      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-lg font-bold mb-6">📋 任务详情</h1>

        <div className="space-y-4">
          <div>
            <span className="text-xs text-gray-400 block mb-1">任务描述</span>
            <p className="text-sm">{task.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400 block mb-1">任务类型</span>
              <p className="text-sm">{TASK_TYPE_MAP[task.type] || task.type}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">目标平台</span>
              <p className="text-sm">{PLATFORM_MAP[task.platform] || task.platform}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">目标受众</span>
              <p className="text-sm">{AUDIENCE_MAP[task.audience] || task.audience}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">状态</span>
              <p className="text-sm">{st.icon} {st.label}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">创建时间</span>
              <p className="text-sm">{new Date(task.createdAt).toLocaleDateString('zh-CN')}</p>
            </div>
          </div>
        </div>

        {/* 关联提示词 */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">关联提示词</h3>
          {task.prompt ? (
            <div className="rounded-xl border p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">评分：</span>
                  <span className="text-lg font-bold">{task.prompt.score ?? '--'}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {task.prompt.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-3 mb-3">
                {task.prompt.fullText?.slice(0, 200)}
                {(task.prompt.fullText?.length ?? 0) > 200 ? '...' : ''}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-xs"
              >
                查看提示词详情（开发中）
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border p-6 text-center text-sm text-gray-400">
              暂无提示词
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
