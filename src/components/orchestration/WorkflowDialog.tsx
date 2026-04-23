import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface WorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: any; // 编辑时传递现有 Workflow 数据
  projectId: string; // 当前项目 ID
  onComplete?: () => void; // 操作完成后回调
}

export default function WorkflowDialog({ open, onOpenChange, workflow, projectId, onComplete }: WorkflowDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [status, setStatus] = useState('DRAFT');
  const [version, setVersion] = useState('1.0');
  const [exposureLevel, setExposureLevel] = useState('INTERNAL');
  const [triggerType, setTriggerType] = useState('MANUAL');

  const utils = trpc.useUtils();
  const { toast } = useToast();

  const createWorkflowMutation = trpc.workflow.create.useMutation({
    onSuccess: () => {
      toast({
        title: '创建成功',
        description: 'Workflow 已成功创建',
      });
      utils.workflow.getAll.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error.message || '创建 Workflow 时出现错误',
        variant: 'destructive',
      });
    }
  });

  const updateWorkflowMutation = trpc.workflow.update.useMutation({
    onSuccess: () => {
      toast({
        title: '更新成功',
        description: 'Workflow 已成功更新',
      });
      utils.workflow.getAll.invalidate(); // 使缓存失效
      utils.workflow.getById.invalidate({ id: workflow.id }); // 使详情缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error.message || '更新 Workflow 时出现错误',
        variant: 'destructive',
      });
    }
  });

  const isEditing = !!workflow;

  useEffect(() => {
    if (workflow) {
      setName(workflow.name || '');
      setDescription(workflow.description || '');
      setCategory(workflow.category || 'GENERAL');
      setStatus(workflow.status || 'DRAFT');
      setVersion(workflow.version || '1.0');
      setExposureLevel(workflow.exposureLevel || 'INTERNAL');
      setTriggerType(workflow.triggerType || 'MANUAL');
    } else {
      resetForm();
    }
  }, [workflow]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('GENERAL');
    setStatus('DRAFT');
    setVersion('1.0');
    setExposureLevel('INTERNAL');
    setTriggerType('MANUAL');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: '错误',
        description: '请输入 Workflow 名称',
        variant: 'destructive',
      });
      return;
    }

    if (isEditing) {
      // 更新现有 Workflow
      updateWorkflowMutation.mutate({
        id: workflow.id,
        name,
        description,
        category,
        status,
        version,
        exposureLevel,
        triggerType
      });
    } else {
      // 创建新 Workflow
      createWorkflowMutation.mutate({
        name,
        projectId,
        description,
        category,
        status,
        version,
        exposureLevel,
        triggerType
      });
    }
  };

  const isLoading = createWorkflowMutation.isPending || updateWorkflowMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑 Workflow' : '创建新 Workflow'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              名称 *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入 Workflow 名称"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入 Workflow 描述"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                分类
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">通用</SelectItem>
                  <SelectItem value="DATA_PROCESSING">数据处理</SelectItem>
                  <SelectItem value="CONTENT_GENERATION">内容生成</SelectItem>
                  <SelectItem value="QA_VALIDATION">质检验证</SelectItem>
                  <SelectItem value="MONITORING">监控</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">草稿</SelectItem>
                  <SelectItem value="REVIEW">审核中</SelectItem>
                  <SelectItem value="APPROVED">已批准</SelectItem>
                  <SelectItem value="ARCHIVED">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                版本
              </label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
              />
            </div>

            <div>
              <label htmlFor="exposureLevel" className="block text-sm font-medium text-gray-700 mb-1">
                曝光级别
              </label>
              <Select value={exposureLevel} onValueChange={setExposureLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">内部</SelectItem>
                  <SelectItem value="NEEDS_APPROVAL">需审批</SelectItem>
                  <SelectItem value="EXTERNAL">外部</SelectItem>
                  <SelectItem value="STRICTLY_FORBIDDEN">严格禁止</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="triggerType" className="block text-sm font-medium text-gray-700 mb-1">
              触发类型
            </label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">手动</SelectItem>
                <SelectItem value="SCHEDULED">定时</SelectItem>
                <SelectItem value="EVENT">事件驱动</SelectItem>
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