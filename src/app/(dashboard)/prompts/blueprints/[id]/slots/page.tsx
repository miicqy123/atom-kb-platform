"use client";
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/PageHeader';

const SLOT_KEYS = ['S0','S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'];
const SLOT_NAMES: Record<string, string> = {
  S0: '目标', S1: '角色', S2: '输入规范', S3: '预检', S4: '红线',
  S5: '流程', S6: '路由', S7: '输出', S8: '质检', S9: '评分卡', S10: '工具箱',
};

export default function SlotsConfigPage({ params }: { params: { id: string } }) {
  const blueprintId = params.id;
  const { toast } = useToast();
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [form, setForm] = useState({
    topN: 3,
    layers: ['A','B','C','D'] as ('A' | 'B' | 'C' | 'D')[],
    dimensions: ''
  });

  const { data: slots, refetch } = trpc.blueprint.preview.useQuery({ blueprintId });

  const createSlotMutation = trpc.slotConfig.create.useMutation({
    onSuccess: () => { toast({ title: '槽位已创建' }); setEditingSlot(null); refetch(); },
    onError: (e) => toast({ title: '创建失败', description: e.message, variant: 'destructive' }),
  });

  const deleteSlotMutation = trpc.slotConfig.delete.useMutation({
    onSuccess: () => { toast({ title: '槽位已删除' }); refetch(); },
  });

  const configuredSlots = new Set(slots?.map(s => s.slotKey) || []);

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="槽位配置" description={`蓝图 ${blueprintId} 的取料规则配置`} />

      <div className="grid grid-cols-2 gap-4 mt-6">
        {SLOT_KEYS.map(slotKey => {
          const isConfigured = configuredSlots.has(slotKey);
          const slotData = slots?.find(s => s.slotKey === slotKey);
          return (
            <div key={slotKey} className={`border rounded-xl p-4 ${
              isConfigured ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{slotKey}</span>
                  <span className="text-xs text-gray-500">{SLOT_NAMES[slotKey]}</span>
                </div>
                <div className="flex gap-1">
                  {isConfigured ? (
                    <>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">已配置</span>
                      <button
                        onClick={() => deleteSlotMutation.mutate({ blueprintId, slotKey })}
                        className="text-xs text-red-400 hover:text-red-600 ml-1"
                      >删除</button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingSlot(slotKey)}
                      className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                    >+ 配置</button>
                  )}
                </div>
              </div>
              {isConfigured && slotData?.assembledContent && (
                <p className="text-xs text-gray-500 line-clamp-2">{slotData.assembledContent}</p>
              )}
              {!isConfigured && (
                <p className="text-xs text-gray-300">未配置取料规则</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 配置弹窗 */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[480px] shadow-2xl">
            <h3 className="font-semibold mb-4">
              配置 {editingSlot}（{SLOT_NAMES[editingSlot]}）取料规则
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">TopN 取料数量</label>
                <input
                  type="number"
                  value={form.topN}
                  onChange={e => setForm(f => ({ ...f, topN: Number(e.target.value) }))}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  min={1} max={10}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">允许层级</label>
                <div className="flex gap-2">
                  {(['A','B','C','D'] as const).map(layer => (
                    <label key={layer} className="flex items-center gap-1 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.layers.includes(layer)}
                        onChange={e => {
                          if (e.target.checked) setForm(f => ({ ...f, layers: [...f.layers, layer] }));
                          else setForm(f => ({ ...f, layers: f.layers.filter(l => l !== layer) }));
                        }}
                        value={layer}
                        className="w-4 h-4"
                      />
                      {layer} 层
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">维度过滤（逗号分隔，如 1,5,12，留空=不限）</label>
                <input
                  type="text"
                  value={form.dimensions}
                  onChange={e => setForm(f => ({ ...f, dimensions: e.target.value }))}
                  placeholder="如：1,2,3 或留空"
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const dims = form.dimensions
                    ? form.dimensions.split(',').map(s => parseInt(s.trim())).filter(Boolean)
                    : [];
                  createSlotMutation.mutate({
                    blueprintId,
                    slotKey: editingSlot,
                    topN: form.topN,
                    layers: form.layers,
                    dimensions: dims,
                    conflictPriority: ['D','C','B','A'],
                  });
                }}
                disabled={createSlotMutation.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
              >
                {createSlotMutation.isPending ? '保存中…' : '保存配置'}
              </button>
              <button
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
