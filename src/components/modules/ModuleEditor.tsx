'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_LABEL_MAP } from '@/lib/categoryMaps';
import AtomPicker from './AtomPicker';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

interface AtomEntry {
  atomId: string;
  title: string;
  order: number;
  category?: string | null;
}

interface ModuleEditorProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  moduleId?: string;
}

export default function ModuleEditor({ open, onClose, projectId, moduleId }: ModuleEditorProps) {
  const { toast } = useToast();
  const isEditing = !!moduleId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scenesText, setScenesText] = useState('');
  const [atoms, setAtoms] = useState<AtomEntry[]>([]);
  const [showAtomPicker, setShowAtomPicker] = useState(false);

  const utils = trpc.useUtils();

  // 加载已有模块数据（编辑模式）
  const { data: modulesData } = trpc.module.getAll.useQuery(
    { projectId, limit: 1, offset: 0 },
    { enabled: false }
  );

  useEffect(() => {
    if (open) {
      if (moduleId) {
        // 编辑模式：直接重新获取
        utils.module.getAll.fetch({ projectId, limit: 100, offset: 0 }).then(data => {
          const mod = data.items.find((m: any) => m.id === moduleId);
          if (mod) {
            setName(mod.name);
            setDescription(mod.description || '');
            setScenesText((mod.applicableScenes || []).join(', '));
            setAtoms(mod.atoms.map((ma: any, i: number) => ({
              atomId: ma.atom.id,
              title: ma.atom.title,
              order: i,
              category: ma.atom.category,
            })));
          }
        });
      } else {
        setName('');
        setDescription('');
        setScenesText('');
        setAtoms([]);
      }
    }
  }, [open, moduleId, projectId]);

  const createMutation = trpc.module.create.useMutation({
    onSuccess: () => {
      toast({ title: '模块已创建' });
      utils.module.getAll.invalidate();
      onClose();
    },
    onError: (e) => toast({ title: '创建失败', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = trpc.module.update.useMutation({
    onSuccess: () => {
      toast({ title: '模块已更新' });
      utils.module.getAll.invalidate();
      onClose();
    },
    onError: (e) => toast({ title: '更新失败', description: e.message, variant: 'destructive' }),
  });

  const handleAddAtoms = (newAtoms: Array<{ atomId: string; title: string }>) => {
    const existing = new Set(atoms.map(a => a.atomId));
    const toAdd = newAtoms.filter(a => !existing.has(a.atomId));
    setAtoms(prev => [
      ...prev,
      ...toAdd.map((a, i) => ({ atomId: a.atomId, title: a.title, order: prev.length + i })),
    ]);
    setShowAtomPicker(false);
  };

  const handleRemoveAtom = (atomId: string) => {
    setAtoms(prev => prev.filter(a => a.atomId !== atomId));
  };

  const handleMoveAtom = (index: number, direction: 'up' | 'down') => {
    const newAtoms = [...atoms];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newAtoms.length) return;
    [newAtoms[index], newAtoms[target]] = [newAtoms[target], newAtoms[index]];
    setAtoms(newAtoms.map((a, i) => ({ ...a, order: i })));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: '请输入模块名称', variant: 'destructive' });
      return;
    }
    const scenes = scenesText.split(',').map(s => s.trim()).filter(Boolean);
    const atomIds = atoms.map((a, i) => ({ atomId: a.atomId, order: i }));

    if (isEditing) {
      updateMutation.mutate({
        id: moduleId,
        name: name.trim(),
        description: description.trim() || undefined,
        applicableScenes: scenes,
        atomIds,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        projectId,
        atomIds,
        applicableScenes: scenes,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? '编辑模块' : '新建模块'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 模块名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模块名称 *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="输入模块名称"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="可选：描述模块的用途和内容"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* 适用场景 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                适用场景 <span className="text-gray-400 font-normal">（逗号分隔）</span>
              </label>
              <input
                value={scenesText}
                onChange={e => setScenesText(e.target.value)}
                placeholder="如：销售场景, 客服场景"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              {scenesText && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {scenesText.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 原子块列表 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">原子块列表</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAtomPicker(true)}
                >
                  <Plus className="h-3 w-3 mr-1" /> 从原子库添加
                </Button>
              </div>
              {atoms.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 border rounded-lg">
                  暂无原子块，点击上方按钮添加
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-1">
                  {atoms.map((a, i) => (
                    <div key={a.atomId} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-sm">
                      <span className="text-[10px] text-gray-400 w-4">{i + 1}</span>
                      <span className="flex-1 truncate text-xs">{a.title}</span>
                      {a.category && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
                          {CATEGORY_LABEL_MAP[a.category] || a.category}
                        </Badge>
                      )}
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleMoveAtom(i, 'up')} disabled={i === 0} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleMoveAtom(i, 'down')} disabled={i === atoms.length - 1} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => handleRemoveAtom(a.atomId)} className="p-0.5 hover:bg-red-50 rounded">
                        <X className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? '保存中...' : isEditing ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AtomPicker
        open={showAtomPicker}
        onClose={() => setShowAtomPicker(false)}
        projectId={projectId}
        selectedAtomIds={atoms.map(a => a.atomId)}
        onConfirm={handleAddAtoms}
      />
    </>
  );
}
