"use client";
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { useProjectStore } from '@/stores/projectStore';

export default function DimensionConfigPage() {
  const { projectId } = useProjectStore();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', layer: 'A' });

  const { data, refetch } = trpc.dimension.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const updateMutation = trpc.dimension.update.useMutation({
    onSuccess: () => { toast({ title: '维度已更新' }); setEditingId(null); refetch(); },
  });

  return (
    <div className="p-6">
      <PageHeader title="维度配置" description="管理知识库的 30 个标注维度" />
      <div className="mt-4 space-y-2">
        {data?.items?.map(dim => (
          <div key={dim.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-10 text-center">
              D{String(dim.number).padStart(2,'0')}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              dim.layer === 'A' ? 'bg-blue-100 text-blue-700' :
              dim.layer === 'B' ? 'bg-green-100 text-green-700' :
              dim.layer === 'C' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
            }`}>{dim.layer} 层</span>
            {editingId === dim.id ? (
              <>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({...f, name: e.target.value}))}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                />
                <input
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({...f, description: e.target.value}))}
                  className="flex-1 border rounded px-2 py-1 text-xs text-gray-500"
                  placeholder={(dim as any).description || '描述'}
                />
                <button onClick={() => updateMutation.mutate({ id: dim.id, name: editForm.name, description: editForm.description })}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded">保存</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">取消</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{dim.name || `维度 ${dim.number}`}</span>
                <span className="flex-1 text-xs text-gray-400 truncate">{(dim as any).description}</span>
                <button
                  onClick={() => { setEditingId(dim.id); setEditForm({ name: dim.name || '', description: (dim as any).description || '', layer: dim.layer }); }}
                  className="text-xs text-blue-500 hover:underline"
                >编辑</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}