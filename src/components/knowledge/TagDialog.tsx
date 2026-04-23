import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: any; // 编辑时传递现有标签数据
  onComplete?: () => void; // 操作完成后回调
}

export default function TagDialog({ open, onOpenChange, tag, onComplete }: TagDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('position');

  const utils = trpc.useUtils();
  const { toast } = useToast();

  const createTagMutation = trpc.taxonomy.createTag.useMutation({
    onSuccess: () => {
      toast({
        title: '创建成功',
        description: '标签已成功创建',
      });
      utils.taxonomy.scenarioTags.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error.message || '创建标签时出现错误',
        variant: 'destructive',
      });
    }
  });

  const updateTagMutation = trpc.taxonomy.updateTag.useMutation({
    onSuccess: () => {
      toast({
        title: '更新成功',
        description: '标签已成功更新',
      });
      utils.taxonomy.scenarioTags.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error.message || '更新标签时出现错误',
        variant: 'destructive',
      });
    }
  });

  const isEditing = !!tag;

  useEffect(() => {
    if (tag) {
      setName(tag.name || '');
      setType(tag.type || 'position');
    } else {
      resetForm();
    }
  }, [tag]);

  const resetForm = () => {
    setName('');
    setType('position');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: '错误',
        description: '请输入标签名称',
        variant: 'destructive',
      });
      return;
    }

    if (isEditing) {
      // 更新现有标签
      updateTagMutation.mutate({
        id: tag.id,
        name,
        type
      });
    } else {
      // 创建新标签
      createTagMutation.mutate({
        type,
        name
      });
    }
  };

  const isLoading = createTagMutation.isPending || updateTagMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑标签' : '创建新标签'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              标签类型
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="position">岗位标签</SelectItem>
                <SelectItem value="platform">平台标签</SelectItem>
                <SelectItem value="audience">受众标签</SelectItem>
                <SelectItem value="business_line">业务线标签</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              标签名称 *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入标签名称"
              required
            />
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