'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { CATEGORY_LABEL_MAP, CATEGORY_OPTIONS } from '@/lib/categoryMaps';

interface AtomPickerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  selectedAtomIds: string[];
  onConfirm: (atoms: Array<{ atomId: string; title: string }>) => void;
}

export default function AtomPicker({ open, onClose, projectId, selectedAtomIds, onConfirm }: AtomPickerProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = trpc.atom.getAll.useQuery({
    projectId,
    status: 'ACTIVE',
    limit: 50,
    offset: 0,
  }, { enabled: !!projectId && open });

  const filteredAtoms = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((a: any) => {
      if (search && !a.title?.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter && a.category !== categoryFilter) return false;
      return true;
    });
  }, [data?.items, search, categoryFilter]);

  const handleToggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    const atoms = selected.map(id => {
      const atom = data?.items.find((a: any) => a.id === id);
      return { atomId: id, title: atom?.title || '' };
    });
    onConfirm(atoms);
    setSelected([]);
    setSearch('');
    setCategoryFilter('');
  };

  const handleClose = () => {
    setSelected([]);
    setSearch('');
    setCategoryFilter('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>从原子库选择</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索原子块..."
              className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm"
            />
          </div>

          {/* 类别筛选 */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-2 py-1 rounded-full text-xs transition ${!categoryFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              全部
            </button>
            {CATEGORY_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setCategoryFilter(o.value === categoryFilter ? '' : o.value)}
                className={`px-2 py-1 rounded-full text-xs transition ${categoryFilter === o.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* 列表 */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
          ) : filteredAtoms.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无匹配的原子块</div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg">
              {filteredAtoms.map((a: any) => {
                const isSelected = selected.includes(a.id) || selectedAtomIds.includes(a.id);
                const alreadyAdded = selectedAtomIds.includes(a.id) && !selected.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition ${
                      alreadyAdded ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={alreadyAdded}
                      onChange={() => handleToggle(a.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="flex-1 truncate">{a.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
                      {a.layer}
                    </Badge>
                    {a.category && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-600 border-green-200">
                        {CATEGORY_LABEL_MAP[a.category] || a.category}
                      </Badge>
                    )}
                    {alreadyAdded && <span className="text-[10px] text-gray-400">已添加</span>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-500">已选 {selected.length} 个</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>取消</Button>
              <Button onClick={handleConfirm} disabled={selected.length === 0}>确认添加</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
