// src/components/knowledge/AtomTagEditor.tsx
"use client";
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

const LAYERS = ['A','B','C','D'] as const;
const SLOT_KEYS = ['S0','S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'];
const GRANULARITIES = ['ATOM','MODULE','PACK'] as const;

interface Props {
  atomId: string;
  currentLayer: string;
  currentSlots: string[];
  currentDimensions: number[];
  currentGranularity: string;
  onSaved?: () => void;
}

export function AtomTagEditor({
  atomId, currentLayer, currentSlots, currentDimensions, currentGranularity, onSaved
}: Props) {
  const { toast } = useToast();
  const [layer, setLayer] = useState(currentLayer);
  const [slots, setSlots] = useState<string[]>(currentSlots);
  const [dims, setDims] = useState<number[]>(currentDimensions);
  const [granularity, setGranularity] = useState(currentGranularity);

  const mutation = trpc.atom.updateTags.useMutation({
    onSuccess: () => { toast({ title: '标注已更新' }); onSaved?.(); },
    onError: (e) => toast({ title: '更新失败', description: e.message, variant: 'destructive' }),
  });

  const toggleSlot = (s: string) =>
    setSlots(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleDim = (d: number) =>
    setDims(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-gray-50">
      <h4 className="text-sm font-semibold">✏️ 修正标注</h4>

      {/* 层级 */}
      <div>
        <p className="text-xs text-gray-500 mb-1">层级</p>
        <div className="flex gap-2">
          {LAYERS.map(l => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                layer === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >{l} 层</button>
          ))}
        </div>
      </div>

      {/* 主槽位 */}
      <div>
        <p className="text-xs text-gray-500 mb-1">槽位映射（可多选）</p>
        <div className="flex flex-wrap gap-1.5">
          {SLOT_KEYS.map(s => (
            <button
              key={s}
              onClick={() => toggleSlot(s)}
              className={`px-2 py-0.5 rounded text-xs border ${
                slots.includes(s) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-400 border-gray-200'
              }`}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* 颗粒度 */}
      <div>
        <p className="text-xs text-gray-500 mb-1">颗粒度</p>
        <div className="flex gap-2">
          {GRANULARITIES.map(g => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                granularity === g ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >{g}</button>
          ))}
        </div>
      </div>

      {/* 维度 */}
      <div>
        <p className="text-xs text-gray-500 mb-1">维度（1-30，可多选）</p>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
            <button
              key={d}
              onClick={() => toggleDim(d)}
              className={`w-7 h-7 rounded text-xs border ${
                dims.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-200'
              }`}
            >{d}</button>
          ))}
        </div>
      </div>

      <button
        onClick={() => mutation.mutate({ id: atomId, layer: layer as any, slotMappings: slots, dimensions: dims, granularity: granularity as any })}
        disabled={mutation.isPending}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40"
      >
        {mutation.isPending ? '保存中…' : '保存标注修正'}
      </button>
    </div>
  );
}