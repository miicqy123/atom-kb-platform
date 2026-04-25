import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { AtomTagEditor } from './AtomTagEditor';
import { Badge } from '@/components/ui/Badge';
import {
  CATEGORY_OPTIONS, getSubcategoryOptions,
  CATEGORY_LABEL_MAP, SUBCATEGORY_LABEL_MAP,
} from '@/lib/categoryMaps';

interface AtomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  atom?: any; // 编辑时传递现有atom数据
  onComplete?: () => void; // 操作完成后回调
}

export default function AtomDialog({ open, onOpenChange, projectId, atom, onComplete }: AtomDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [layer, setLayer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [granularity, setGranularity] = useState<'ATOM' | 'MODULE' | 'PACK'>('ATOM');
  const [experienceSource, setExperienceSource] = useState<'E1_COMPANY' | 'E2_INDUSTRY' | 'E3_CROSS_INDUSTRY'>('E1_COMPANY');
  const [exposureLevel, setExposureLevel] = useState<'INTERNAL' | 'EXTERNAL' | 'NEEDS_APPROVAL' | 'STRICTLY_FORBIDDEN'>('INTERNAL');
  const [status, setStatus] = useState<'DRAFT' | 'TESTING' | 'ACTIVE' | 'ARCHIVED'>('DRAFT');
  const [dimensions, setDimensions] = useState<number[]>([]);
  const [slotMappings, setSlotMappings] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { toast } = useToast();

  // 版本历史相关逻辑
  const { data: versionHistory } = trpc.atom.getVersionHistory.useQuery({ atomId: atom?.id }, { enabled: !!atom?.id });
  const createVersionMutation = trpc.atom.createVersion.useMutation({
    onSuccess: (d) => toast({ title: `版本 ${d.snapshotVersion} 快照已保存` }),
    onError: (error) => toast({ title: '存档失败', description: error.message, variant: 'destructive' }),
  });

  const createAtomMutation = trpc.atom.create.useMutation({
    onSuccess: () => {
      toast({
        title: '创建成功',
        description: '原子块已成功创建',
      });
      utils.atom.getAll.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error.message || '创建原子块时出现错误',
        variant: 'destructive',
      });
    }
  });

  const updateAtomMutation = trpc.atom.update.useMutation({
    onSuccess: () => {
      toast({
        title: '更新成功',
        description: '原子块已成功更新',
      });
      utils.atom.getAll.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error.message || '更新原子块时出现错误',
        variant: 'destructive',
      });
    }
  });

  const isEditing = !!atom;

  useEffect(() => {
    if (atom) {
      setTitle(atom.title || '');
      setContent(atom.content || '');
      setLayer(atom.layer || 'A');
      setGranularity(atom.granularity || 'ATOM');
      setExperienceSource(atom.experienceSource || 'E1_COMPANY');
      setExposureLevel(atom.exposureLevel || 'INTERNAL');
      setStatus(atom.status || 'DRAFT');
      setDimensions(atom.dimensions || []);
      setSlotMappings(atom.slotMappings || []);
      setCategory(atom.category || null);
      setSubcategory(atom.subcategory || null);
    } else {
      resetForm();
    }
  }, [atom]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setLayer('A');
    setGranularity('ATOM');
    setExperienceSource('E1_COMPANY');
    setExposureLevel('INTERNAL');
    setStatus('DRAFT');
    setDimensions([]);
    setSlotMappings([]);
    setCategory(null);
    setSubcategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: '错误',
        description: '请输入原子块标题',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: '错误',
        description: '请输入原子块内容',
        variant: 'destructive',
      });
      return;
    }

    if (isEditing) {
      // 更新现有原子块
      updateAtomMutation.mutate({
        id: atom.id,
        title,
        content,
        layer,
        granularity,
        experienceSource,
        exposureLevel,
        status,
        dimensions,
        slotMappings,
        category: category || undefined,
        subcategory: subcategory || undefined,
      } as any);
    } else {
      // 创建新原子块
      createAtomMutation.mutate({
        title,
        content,
        projectId,
        layer,
        granularity,
        experienceSource,
        exposureLevel,
        status,
        category: category || undefined,
        subcategory: subcategory || undefined,
      } as any);
    }
  };

  const handleCreateVersion = () => {
    if (atom?.id) {
      createVersionMutation.mutate({ id: atom.id, reason: '手动存档' });
    }
  };

  const isLoading = createAtomMutation.isPending || updateAtomMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑原子块' : '创建新原子块'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              标题 *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入原子块标题"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              内容 *
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入原子块详细内容"
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="layer" className="block text-sm font-medium text-gray-700 mb-1">
                层级
              </label>
              <select
                id="layer"
                value={layer}
                onChange={(e) => setLayer(e.target.value as 'A' | 'B' | 'C' | 'D')}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="A">A 层</option>
                <option value="B">B 层</option>
                <option value="C">C 层</option>
                <option value="D">D 层</option>
              </select>
            </div>

            <div>
              <label htmlFor="granularity" className="block text-sm font-medium text-gray-700 mb-1">
                粒度
              </label>
              <select
                id="granularity"
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as 'ATOM' | 'MODULE' | 'PACK')}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="ATOM">原子</option>
                <option value="MODULE">模块</option>
                <option value="PACK">包</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="experienceSource" className="block text-sm font-medium text-gray-700 mb-1">
                经验来源
              </label>
              <select
                id="experienceSource"
                value={experienceSource}
                onChange={(e) => setExperienceSource(e.target.value as 'E1_COMPANY' | 'E2_INDUSTRY' | 'E3_CROSS_INDUSTRY')}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="E1_COMPANY">公司经验</option>
                <option value="E2_INDUSTRY">行业经验</option>
                <option value="E3_CROSS_INDUSTRY">跨行业经验</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'TESTING' | 'ACTIVE' | 'ARCHIVED')}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="DRAFT">草稿</option>
                <option value="TESTING">测试中</option>
                <option value="ACTIVE">激活</option>
                <option value="ARCHIVED">归档</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="exposureLevel" className="block text-sm font-medium text-gray-700 mb-1">
              曝光级别
            </label>
            <select
              id="exposureLevel"
              value={exposureLevel}
              onChange={(e) => setExposureLevel(e.target.value as 'INTERNAL' | 'EXTERNAL' | 'NEEDS_APPROVAL' | 'STRICTLY_FORBIDDEN')}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="INTERNAL">内部</option>
              <option value="EXTERNAL">外部</option>
              <option value="NEEDS_APPROVAL">需审批</option>
              <option value="STRICTLY_FORBIDDEN">严格禁止</option>
            </select>
          </div>

          {/* ── 内容分类 ── */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-600">内容分类</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  内容类别
                </label>
                <select
                  id="category"
                  value={category ?? ''}
                  onChange={(e) => {
                    setCategory(e.target.value || null);
                    setSubcategory(null);
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">未分类</option>
                  {CATEGORY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                  内容子类
                </label>
                <select
                  id="subcategory"
                  value={subcategory ?? ''}
                  onChange={(e) => setSubcategory(e.target.value || null)}
                  disabled={!category}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">未分类</option>
                  {getSubcategoryOptions(category || undefined).map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* 当前分类标签展示 */}
            {category && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-gray-400">当前：</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                  {CATEGORY_LABEL_MAP[category]}
                </Badge>
                {subcategory && (
                  <span className="text-xs text-gray-500">/ {SUBCATEGORY_LABEL_MAP[subcategory]}</span>
                )}
              </div>
            )}
          </div>

          {/* 手动标注修正面板 - 仅在编辑模式下显示 */}
          {isEditing && (
            <div className="mt-4 border rounded-lg p-4 bg-white">
              <AtomTagEditor
                atomId={atom.id}
                currentLayer={atom.layer}
                currentSlots={atom.slotMappings || []}
                currentDimensions={atom.dimensions || []}
                currentGranularity={atom.granularity}
                onSaved={() => {
                  // 刷新页面数据
                  utils.atom.getAll.invalidate();
                }}
              />
            </div>
          )}

          {/* 版本历史面板 - 仅在编辑模式下显示 */}
          {isEditing && (
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500">版本历史</h4>
                <button
                  onClick={handleCreateVersion}
                  disabled={createVersionMutation.isPending}
                  className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
                >
                  + 存档当前版本
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {versionHistory?.map(v => (
                  <div key={v.id} className="text-xs border rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono bg-gray-100 px-1.5 rounded">v{v.version}</span>
                      <span className="text-gray-400">{new Date(v.createdAt).toLocaleDateString('zh-CN')}</span>
                      <span className="text-gray-500 truncate">{v.reason}</span>
                    </div>
                    <p className="text-gray-400 line-clamp-2">{v.content?.slice(0, 100)}</p>
                  </div>
                ))}
                {versionHistory && versionHistory.length === 0 && (
                  <p className="text-xs text-gray-400 italic">暂无版本历史</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (isEditing ? '更新中...' : '创建中...') : (isEditing ? '更新' : '创建')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}