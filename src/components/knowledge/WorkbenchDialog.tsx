import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface WorkbenchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  rawId: string;
  station: string; // 当前工作站名称
  onComplete?: () => void; // 操作完成后回调
}

export default function WorkbenchDialog({ open, onOpenChange, projectId, rawId, station, onComplete }: WorkbenchDialogProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  const utils = trpc.useUtils();
  const { toast } = useToast();

  const processMutation = trpc.workbench.process.useMutation({
    onSuccess: () => {
      toast({
        title: '处理成功',
        description: `工作站 "${station}" 的处理已成功完成`,
      });
      // 刷新相关数据
      utils.workbench.getProgress.invalidate();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '处理失败',
        description: error.message || `在 "${station}" 工作站处理时出现错误`,
        variant: 'destructive',
      });
    }
  });

  useEffect(() => {
    if (open) {
      // 如果需要加载当前处理内容，可以在这里加载
      setTitle(`${station} - 处理结果`);
    }
  }, [open, station]);

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: '错误',
        description: '请输入处理结果',
        variant: 'destructive',
      });
      return;
    }

    // 调用后端处理
    processMutation.mutate({
      projectId,
      rawId,
      station,
      content,
      tags,
      title
    });
  };

  const isLoading = processMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{station} 工作站</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              处理项名称
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入处理项名称"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              处理结果 *
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`输入在 "${station}" 工作站的处理结果`}
              rows={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="输入标签并回车添加"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <div key={tag} className="flex items-center bg-gray-100 rounded px-2 py-1 text-sm">
                  {tag}
                  <button
                    type="button"
                    className="ml-1 text-gray-500 hover:text-gray-700"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setTitle('');
                setContent('');
                setTags([]);
                setCurrentTag('');
              }}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? '处理中...' : '确认处理'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}