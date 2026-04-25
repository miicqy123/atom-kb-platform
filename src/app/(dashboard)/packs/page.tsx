'use client';

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PackCard } from '@/components/packs/PackCard';
import PackEditor from '@/components/packs/PackEditor';
import RouteTestPanel from '@/components/packs/RouteTestPanel';

export default function PacksPage() {
  const { projectId } = useProjectStore();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPackId, setEditingPackId] = useState<string | undefined>(undefined);

  // 路由测试预设：从 PackCard 的「测试匹配」触发
  const [testPreset, setTestPreset] = useState<{
    taskType: string; platform?: string; audience?: string;
  } | null>(null);
  const testPanelRef = useRef<HTMLDivElement>(null);

  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, isLoading } = trpc.pack.getAll.useQuery({
    projectId: projectId ?? '',
    status: (statusFilter || undefined) as any,
    limit,
    offset,
  }, { enabled: !!projectId });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 1;

  const handleEdit = (id: string) => {
    setEditingPackId(id);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingPackId(undefined);
  };

  const handleTestRoute = (packId: string) => {
    const pack = data?.items.find((p: any) => p.id === packId);
    if (!pack) return;
    setTestPreset({
      taskType: (pack.taskTypes as string[])[0] || '',
      platform: (pack.platforms as string[])[0],
      audience: (pack.audiences as string[])[0],
    });
    setTimeout(() => {
      testPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div>
      <PageHeader
        title="📦 场景包管理"
        description="管理场景包，按路由条件自动匹配提示词场景"
        actions={
          <Button
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white"
            onClick={() => { setEditingPackId(undefined); setEditorOpen(true); }}
          >
            <Plus className="h-4 w-4" /> 新建场景包
          </Button>
        }
      />

      {/* 筛选 */}
      <div className="mb-4 flex items-center gap-3">
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

      {/* 列表 */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">加载中...</div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm">暂无场景包，点击右上角「新建场景包」创建</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.items ?? []).map((pack: any) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onEdit={handleEdit}
              onTestRoute={handleTestRoute}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {data && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      {/* 路由测试面板 */}
      <div ref={testPanelRef} className="mt-8">
        <RouteTestPanel projectId={projectId ?? ''} preset={testPreset} />
      </div>

      {/* 编辑器 */}
      <PackEditor
        open={editorOpen}
        onClose={handleCloseEditor}
        projectId={projectId ?? ''}
        packId={editingPackId}
      />
    </div>
  );
}
