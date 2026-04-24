"use client";
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { useProjectStore } from '@/stores/projectStore';

export default function BasePacksPage() {
  const { projectId } = useProjectStore();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slotKey: 'S0', content: '', scope: 'GLOBAL' });

  const { data, refetch } = trpc.basePack.list.useQuery();

  const createMutation = trpc.basePack.create.useMutation({
    onSuccess: () => { toast({ title: 'BasePack 已创建' }); setCreating(false); setForm({ slotKey: 'S0', content: '', scope: 'GLOBAL' }); refetch(); },
    onError: (e) => toast({ title: '创建失败', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = trpc.basePack.delete.useMutation({
    onSuccess: () => { toast({ title: '已删除' }); refetch(); },
    onError: (e) => toast({ title: '删除失败', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="p-6">
      <PageHeader title="BasePack 基础包" description="可复用的提示词基础包，供蓝图引用" />

      <div className="flex justify-end mt-4 mb-6">
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >+ 新建 BasePack</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {data?.items?.map(pack => (
          <div key={pack.id} className="border rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm">{pack.slotKey}</h3>
              <button
                onClick={() => deleteMutation.mutate({ id: pack.id })}
                className="text-xs text-red-400 hover:text-red-600"
              >删除</button>
            </div>
            <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-y-auto font-sans">
              {pack.content?.slice(0, 300)}{(pack.content?.length ?? 0) > 300 ? '…' : ''}
            </pre>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{pack.scope}</span>
              <span className="text-xs text-gray-400">v{pack.version}</span>
            </div>
          </div>
        ))}
        {(!data?.items?.length) && (
          <div className="col-span-2 text-center py-16 text-gray-400 text-sm">
            暂无 BasePack，点击右上角新建
          </div>
        )}
      </div>

      {/* 新建弹窗 */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[560px] shadow-2xl">
            <h3 className="font-semibold mb-4">新建 BasePack</h3>
            <div className="space-y-4">
              <select
                value={form.slotKey}
                onChange={e => setForm(f => ({ ...f, slotKey: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="S0">S0 - 全局人设</option>
                <option value="S1">S1 - 任务指令</option>
                <option value="S2">S2 - 用户画像</option>
                <option value="S3">S3 - 预调规则</option>
                <option value="S4">S4 - 知识注入</option>
                <option value="S5">S5 - 主执行</option>
                <option value="S6">S6 - 路由调度</option>
                <option value="S7">S7 - 输出格式</option>
                <option value="S8">S8 - 对抗验证</option>
                <option value="S9">S9 - 质量报告</option>
                <option value="S10">S10 - 元指令</option>
              </select>
              <select
                value={form.scope}
                onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="GLOBAL">全局</option>
                <option value="PROJECT">项目</option>
                <option value="TEAM">团队</option>
              </select>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="BasePack 内容（提示词片段）"
                className="w-full border rounded-lg px-3 py-2 text-sm h-40 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => createMutation.mutate({
                  slotKey: form.slotKey,
                  content: form.content,
                  scope: form.scope
                })}
                disabled={!form.slotKey || !form.content || createMutation.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
              >
                {createMutation.isPending ? '创建中…' : '创建'}
              </button>
              <button onClick={() => setCreating(false)} className="px-4 py-2 border rounded-lg text-sm">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
