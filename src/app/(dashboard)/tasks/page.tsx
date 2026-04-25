'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TaskTable } from '@/components/tasks/TaskTable';
import TaskCreateDialog from '@/components/tasks/TaskCreateDialog';

export default function TasksPage() {
  const router = useRouter();
  const { projectId } = useProjectStore();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, isLoading } = trpc.task.getAll.useQuery({
    projectId: projectId ?? '',
    status: statusFilter || undefined,
    limit,
    offset,
  }, { enabled: !!projectId });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 1;

  return (
    <div>
      <PageHeader
        title="📋 任务管理"
        description="管理内容生成任务"
        actions={
          <Button
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" /> 新建任务
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">全部状态</option>
          {[
            { value: 'pending', label: '⏳ 待处理' },
            { value: 'processing', label: '🔄 处理中' },
            { value: 'done', label: '✅ 完成' },
            { value: 'failed', label: '❌ 失败' },
          ].map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <TaskTable
        items={data?.items ?? []}
        loading={isLoading}
        onViewDetail={(id) => router.push(`/tasks/${id}`)}
      />

      {data && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      <TaskCreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={projectId ?? ''}
      />
    </div>
  );
}
