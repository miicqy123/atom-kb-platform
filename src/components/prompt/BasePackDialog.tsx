import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

const SLOT_NAMES: Record<string, string> = {
  S0: "全局人设",
  S1: "任务指令",
  S2: "用户画像",
  S3: "预检规则",
  S4: "知识注入",
  S5: "主执行",
  S6: "路由调度",
  S7: "输出格式",
  S8: "对抗验证",
  S9: "质量报告",
  S10: "元指令"
};

interface BasePackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pack?: any; // 编辑时传递现有蓝图数据
  onComplete?: () => void; // 操作完成后回调
}

export default function BasePackDialog({ open, onOpenChange, pack, onComplete }: BasePackDialogProps) {
  const [name, setName] = useState('');
  const [slotKey, setSlotKey] = useState('S0');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState('GLOBAL');

  const utils = trpc.useUtils();
  const { toast } = useToast();

  const createPackMutation = trpc.basePack.create.useMutation({
    onSuccess: () => {
      toast({
        title: '创建成功',
        description: '蓝图已成功创建',
      });
      utils.basePack.list.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error.message || '创建蓝图时出现错误',
        variant: 'destructive',
      });
    }
  });

  const updatePackMutation = trpc.basePack.update.useMutation({
    onSuccess: () => {
      toast({
        title: '更新成功',
        description: '蓝图已成功更新',
      });
      utils.basePack.list.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error.message || '更新蓝图时出现错误',
        variant: 'destructive',
      });
    }
  });

  const isEditing = !!pack;

  useEffect(() => {
    if (pack) {
      setName(pack.name || '');
      setSlotKey(pack.slotKey || 'S0');
      setContent(pack.content || '');
      setScope(pack.scope || 'GLOBAL');
    } else {
      resetForm();
    }
  }, [pack]);

  const resetForm = () => {
    setName('');
    setSlotKey('S0');
    setContent('');
    setScope('GLOBAL');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: '错误',
        description: '请输入蓝图内容',
        variant: 'destructive',
      });
      return;
    }

    if (isEditing) {
      // 更新现有蓝图
      updatePackMutation.mutate({
        id: pack.id,
        content,
        scope
      } as any);
    } else {
      // 创建新蓝图
      createPackMutation.mutate({
        slotKey,
        content,
        scope
      });
    }
  };

  const isLoading = createPackMutation.isPending || updatePackMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑蓝图' : '创建新蓝图'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              蓝图名称 *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入蓝图名称"
              required
            />
          </div>

          <div>
            <label htmlFor="slotKey" className="block text-sm font-medium text-gray-700 mb-1">
              槽位
            </label>
            <Select value={slotKey} onValueChange={setSlotKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SLOT_NAMES).map(([key, name]) => (
                  <SelectItem key={key} value={key}>{key} - {name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-1">
              应用范围
            </label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">全局</SelectItem>
                <SelectItem value="PROJECT">项目</SelectItem>
                <SelectItem value="TEAM">团队</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              蓝图内容 *
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入蓝图内容"
              rows={10}
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