import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface DimensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension?: any; // 编辑时传递现有维度数据
  onComplete?: () => void; // 操作完成后回调
}

export default function DimensionDialog({ open, onOpenChange, dimension, onComplete }: DimensionDialogProps) {
  const [number, setNumber] = useState(1);
  const [name, setName] = useState('');
  const [layer, setLayer] = useState('A');

  const utils = trpc.useUtils();
  const { toast } = useToast();

  const createDimensionMutation = trpc.taxonomy.createDimension.useMutation({
    onSuccess: () => {
      toast({
        title: '创建成功',
        description: '维度已成功创建',
      });
      utils.taxonomy.dimensions.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error.message || '创建维度时出现错误',
        variant: 'destructive',
      });
    }
  });

  const updateDimensionMutation = trpc.taxonomy.updateDimension.useMutation({
    onSuccess: () => {
      toast({
        title: '更新成功',
        description: '维度已成功更新',
      });
      utils.taxonomy.dimensions.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error.message || '更新维度时出现错误',
        variant: 'destructive',
      });
    }
  });

  const isEditing = !!dimension;

  useEffect(() => {
    if (dimension) {
      setNumber(dimension.number || 1);
      setName(dimension.name || '');
      setLayer(dimension.layer || 'A');
    } else {
      resetForm();
    }
  }, [dimension]);

  const resetForm = () => {
    setNumber(1);
    setName('');
    setLayer('A');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: '错误',
        description: '请输入维度名称',
        variant: 'destructive',
      });
      return;
    }

    if (isEditing) {
      // 更新现有维度
      updateDimensionMutation.mutate({
        id: dimension.id,
        number,
        name,
        layer: layer as 'A' | 'B' | 'C' | 'D',
      });
    } else {
      // 创建新维度
      createDimensionMutation.mutate({
        number,
        name,
        layer: layer as 'A' | 'B' | 'C' | 'D',
        tenantId: 'default-tenant' // 实际应用中应从上下文获取
      });
    }
  };

  const isLoading = createDimensionMutation.isPending || updateDimensionMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑维度' : '创建新维度'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
              维度编号 *
            </label>
            <Input
              id="number"
              type="number"
              value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
              placeholder="输入维度编号"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              维度名称 *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入维度名称"
              required
            />
          </div>

          <div>
            <label htmlFor="layer" className="block text-sm font-medium text-gray-700 mb-1">
              层级
            </label>
            <Select value={layer} onValueChange={setLayer}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A 认知层</SelectItem>
                <SelectItem value="B">B 技能层</SelectItem>
                <SelectItem value="C">C 风格红线层</SelectItem>
                <SelectItem value="D">D 系统合规层</SelectItem>
              </SelectContent>
            </Select>
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