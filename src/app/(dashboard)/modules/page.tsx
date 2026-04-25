'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ModuleCard } from '@/components/modules/ModuleCard';
import ModuleEditor from '@/components/modules/ModuleEditor';
import { useToast } from '@/hooks/use-toast';

export default function ModulesPage() {
  const { projectId } = useProjectStore();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | undefined>(undefined);

  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, isLoading } = trpc.module.getAll.useQuery({
    projectId: projectId ?? '',
    status: (statusFilter || undefined) as any,
    search: search || undefined,
    limit,
    offset,
  }, { enabled: !!projectId });

  const deleteMutation = trpc.module.delete.useMutation({
    onSuccess: () => {
      toast({ title: '模块已删除' });
      utils.module.getAll.invalidate();
    },
    onError: (e) => toast({ title: '删除失败', description: e.message, variant: 'destructive' }),
  });

  const utils = trpc.useUtils();

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 1;

  const handleEdit = (id: string) => {
    setEditingModuleId(id);
    setEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个模块吗？此操作不可撤销。')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingModuleId(undefined);
  };

  return (
    <div>
      <PageHeader
        title="🧩 模块管理"
        description="管理原子块模块，按场景组合原子块"
        actions={
          <Button
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white"
            onClick={() => { setEditingModuleId(undefined); setEditorOpen(true); }}
          >
            <Plus className="h-4 w-4" /> 新建模块
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索模块名称..."
            className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">全部状态</option>
          {[
            { value: 'DRAFT', label: '草稿' },
            { value: 'TESTING', label: '测试中' },
            { value: 'ACTIVE', label: '已激活' },
            { value: 'ARCHIVED', label: '已归档' },
          ].map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">加载中...</div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🧩</p>
          <p className="text-sm">暂无模块，点击右上角「新建模块」创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.items ?? []).map((mod: any) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {data && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      <ModuleEditor
        open={editorOpen}
        onClose={handleCloseEditor}
        projectId={projectId ?? ''}
        moduleId={editingModuleId}
      />
    </div>
  );
}
