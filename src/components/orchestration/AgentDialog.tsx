import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import type { RouterOutputs } from '@/lib/trpc';

type Agent = RouterOutputs['agent']['getById'];

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
  projectId: string;
  onComplete?: () => void;
}

const DEFAULT_FORM = {
  name: '',
  role: '',
  description: '',
  category: 'GENERAL',
  status: 'DRAFT',
  version: '1.0',
  exposureLevel: 'INTERNAL',
} as const;

type FormState = {
  name: string;
  role: string;
  description: string;
  category: string;
  status: string;
  version: string;
  exposureLevel: string;
};

export default function AgentDialog({ open, onOpenChange, agent, projectId, onComplete }: AgentDialogProps) {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });

  const utils = trpc.useUtils();
  const { toast } = useToast();

  const isEditing = !!agent;

  const resetForm = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
  }, []);

  useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name ?? '',
        role: agent.role ?? '',
        description: agent.description ?? '',
        category: agent.category ?? 'GENERAL',
        status: agent.status ?? 'DRAFT',
        version: agent.version ?? '1.0',
        exposureLevel: agent.exposureLevel ?? 'INTERNAL',
      });
    } else {
      resetForm();
    }
  }, [agent, resetForm]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    resetForm();
  }, [onOpenChange, resetForm]);

  const createAgentMutation = trpc.agent.create.useMutation({
    onSuccess: () => {
      toast({ title: '创建成功', description: 'Agent 已成功创建' });
      utils.agent.getAll.invalidate();
      handleClose();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error.message || '创建 Agent 时出现错误',
        variant: 'destructive',
      });
    },
  });

  const updateAgentMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast({ title: '更新成功', description: 'Agent 已成功更新' });
      utils.agent.getAll.invalidate();
      if (agent?.id) utils.agent.getById.invalidate({ id: agent.id });
      handleClose();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error.message || '更新 Agent 时出现错误',
        variant: 'destructive',
      });
    },
  });

  const isLoading = createAgentMutation.isPending || updateAgentMutation.isPending;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast({ title: '错误', description: '请输入 Agent 名称', variant: 'destructive' });
      return;
    }

    if (isEditing && agent) {
      updateAgentMutation.mutate({
        id: agent.id,
        name: form.name,
        role: form.role,
        description: form.description,
        category: form.category,
        status: form.status as any,
        version: form.version,
        exposureLevel: form.exposureLevel as any,
      });
    } else {
      createAgentMutation.mutate({
        name: form.name,
        projectId,
        role: form.role,
        description: form.description,
        category: form.category,
        status: form.status as any,
        version: form.version,
        exposureLevel: form.exposureLevel as any,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑 Agent' : '创建新 Agent'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="agent-name" className="block text-sm font-medium text-gray-700 mb-1">
              名称 <span className="text-red-500">*</span>
            </label>
            <Input
              id="agent-name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="输入 Agent 名称"
              required
            />
          </div>

          <div>
            <label htmlFor="agent-role" className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <Input
              id="agent-role"
              value={form.role}
              onChange={(e) => setField('role', e.target.value)}
              placeholder="例如：销售顾问、客服专员"
            />
          </div>

          <div>
            <label htmlFor="agent-description" className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <Textarea
              id="agent-description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="输入 Agent 描述"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">通用</SelectItem>
                  <SelectItem value="SALES">销售</SelectItem>
                  <SelectItem value="SUPPORT">客服</SelectItem>
                  <SelectItem value="CONTENT">内容</SelectItem>
                  <SelectItem value="ANALYTICS">分析</SelectItem>
                  <SelectItem value="SECURITY">安全</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
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
              <label htmlFor="agent-version" className="block text-sm font-medium text-gray-700 mb-1">
                版本
              </label>
              <Input
                id="agent-version"
                value={form.version}
                onChange={(e) => setField('version', e.target.value)}
                placeholder="1.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">曝光级别</label>
              <Select value={form.exposureLevel} onValueChange={(v) => setField('exposureLevel', v)}>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEditing ? '更新中...' : '创建中...'
                : isEditing ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
