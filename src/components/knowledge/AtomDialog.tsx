import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

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

  const utils = trpc.useUtils();
  const { toast } = useToast();

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
        slotMappings
      });
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
        status
      });
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