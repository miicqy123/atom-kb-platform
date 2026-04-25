'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { TASK_TYPE_OPTIONS, PLATFORM_OPTIONS, AUDIENCE_OPTIONS } from '@/lib/taskMaps';
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ModuleEntry {
  moduleId: string;
  name: string;
  order: number;
}

interface PackEditorProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  packId?: string;
}

function CheckboxGroup({ label, options, selected, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const isChecked = selected.includes(o.value);
          return (
            <label key={o.value} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs cursor-pointer transition ${
              isChecked ? 'bg-brand/10 text-brand border border-brand/30' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onChange(o.value)}
                className="hidden"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function PackEditor({ open, onClose, projectId, packId }: PackEditorProps) {
  const { toast } = useToast();
  const isEditing = !!packId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [audiences, setAudiences] = useState<string[]>([]);
  const [modules, setModules] = useState<ModuleEntry[]>([]);
  const [showModulePicker, setShowModulePicker] = useState(false);

  const utils = trpc.useUtils();

  // 加载已有数据（编辑模式）
  useEffect(() => {
    if (open) {
      if (packId) {
        utils.pack.getById.fetch({ id: packId }).then(data => {
          if (data) {
            setName(data.name);
            setDescription(data.description || '');
            setTaskTypes(data.taskTypes as string[]);
            setPlatforms(data.platforms as string[]);
            setAudiences(data.audiences as string[]);
            setModules(data.modules.map((pm: any, i: number) => ({
              moduleId: pm.module.id,
              name: pm.module.name,
              order: i,
            })));
          }
        });
      } else {
        setName('');
        setDescription('');
        setTaskTypes([]);
        setPlatforms([]);
        setAudiences([]);
        setModules([]);
      }
    }
  }, [open, packId, projectId]);

  const createMutation = trpc.pack.create.useMutation({
    onSuccess: () => {
      toast({ title: '场景包已创建' });
      utils.pack.getAll.invalidate();
      onClose();
    },
    onError: (e) => toast({ title: '创建失败', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = trpc.pack.update.useMutation({
    onSuccess: () => {
      toast({ title: '场景包已更新' });
      utils.pack.getAll.invalidate();
      onClose();
    },
    onError: (e) => toast({ title: '更新失败', description: e.message, variant: 'destructive' }),
  });

  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: '请输入场景包名称', variant: 'destructive' });
      return;
    }
    const moduleIds = modules.map((m, i) => ({ moduleId: m.moduleId, order: i }));

    if (isEditing) {
      updateMutation.mutate({
        id: packId!,
        name: name.trim(),
        description: description.trim() || undefined,
        taskTypes,
        platforms,
        audiences,
        moduleIds,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        projectId,
        taskTypes,
        platforms,
        audiences,
        moduleIds,
      });
    }
  };

  const handleRemoveModule = (moduleId: string) => {
    setModules(prev => prev.filter(m => m.moduleId !== moduleId));
  };

  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const list = [...modules];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setModules(list.map((m, i) => ({ ...m, order: i })));
  };

  const handleAddModules = (selected: Array<{ moduleId: string; name: string }>) => {
    const existing = new Set(modules.map(m => m.moduleId));
    const toAdd = selected.filter(m => !existing.has(m.moduleId));
    setModules(prev => [
      ...prev,
      ...toAdd.map((m, i) => ({ moduleId: m.moduleId, name: m.name, order: prev.length + i })),
    ]);
    setShowModulePicker(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? '编辑场景包' : '新建场景包'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">场景包名称 *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="输入场景包名称"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="可选：描述场景包的用途和范围"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* 路由条件 */}
            <div className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
              <p className="text-xs font-medium text-gray-500">路由条件</p>
              <CheckboxGroup
                label="任务类型"
                options={TASK_TYPE_OPTIONS}
                selected={taskTypes}
                onChange={v => setTaskTypes(prev => toggleArray(prev, v))}
              />
              <CheckboxGroup
                label="平台"
                options={PLATFORM_OPTIONS}
                selected={platforms}
                onChange={v => setPlatforms(prev => toggleArray(prev, v))}
              />
              <CheckboxGroup
                label="受众"
                options={AUDIENCE_OPTIONS}
                selected={audiences}
                onChange={v => setAudiences(prev => toggleArray(prev, v))}
              />
            </div>

            {/* 模块列表 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">包含模块</label>
                <Button variant="outline" size="sm" onClick={() => setShowModulePicker(true)}>
                  <Plus className="h-3 w-3 mr-1" /> 添加模块
                </Button>
              </div>
              {modules.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 border rounded-lg">
                  暂无模块，点击上方按钮添加
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-1">
                  {modules.map((m, i) => (
                    <div key={m.moduleId} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-sm">
                      <span className="text-[10px] text-gray-400 w-4">{i + 1}</span>
                      <span className="flex-1 truncate text-xs">{m.name}</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleMoveModule(i, 'up')} disabled={i === 0} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleMoveModule(i, 'down')} disabled={i === modules.length - 1} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => handleRemoveModule(m.moduleId)} className="p-0.5 hover:bg-red-50 rounded">
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

      {/* 模块选择器 */}
      <ModulePicker
        open={showModulePicker}
        onClose={() => setShowModulePicker(false)}
        projectId={projectId}
        selectedModuleIds={modules.map(m => m.moduleId)}
        onConfirm={handleAddModules}
      />
    </>
  );
}

function ModulePicker({ open, onClose, projectId, selectedModuleIds, onConfirm }: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  selectedModuleIds: string[];
  onConfirm: (modules: Array<{ moduleId: string; name: string }>) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = trpc.module.getAll.useQuery({
    projectId,
    limit: 100,
    offset: 0,
  }, { enabled: !!projectId && open });

  const availableModules = (data?.items ?? []).filter((m: any) =>
    !selectedModuleIds.includes(m.id)
  );

  const handleToggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    const items = selected.map(id => {
      const mod = data?.items.find((m: any) => m.id === id);
      return { moduleId: id, name: mod?.name || '' };
    });
    onConfirm(items);
    setSelected([]);
  };

  const handleClose = () => {
    setSelected([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>选择模块</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
        ) : availableModules.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">暂无可用的模块</div>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg">
            {availableModules.map((m: any) => (
              <label key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => handleToggle(m.id)}
                  className="w-4 h-4 rounded"
                />
                <span className="flex-1 truncate">{m.name}</span>
                <span className="text-[10px] text-gray-400">{m.atoms?.length ?? 0} 原子块</span>
              </label>
            ))}
          </div>
        )}

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
