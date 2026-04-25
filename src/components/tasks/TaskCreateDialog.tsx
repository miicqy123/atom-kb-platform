'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

const TASK_TYPE_OPTIONS = [
  { value: 'SHORT_VIDEO', label: '短视频文案' },
  { value: 'MOMENTS', label: '朋友圈文案' },
  { value: 'SALES_TALK', label: '销售话术' },
  { value: 'LIVE_TALK', label: '直播话术' },
  { value: 'BRAND_STORY', label: '品牌故事' },
  { value: 'IMAGE_PROMPT', label: '做图提示词' },
  { value: 'ANALYSIS', label: '选题分析' },
  { value: 'GENERAL', label: '通用' },
  { value: 'CUSTOM', label: '自定义' },
];

const PLATFORM_OPTIONS = [
  { value: 'DOUYIN', label: '抖音' },
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'SHIPINHAO', label: '视频号' },
  { value: 'WECHAT_MOMENTS', label: '朋友圈' },
  { value: 'GENERAL', label: '通用' },
];

const AUDIENCE_OPTIONS = [
  { value: 'BOSS', label: '企业老板' },
  { value: 'EXECUTOR', label: '执行者' },
  { value: 'CONSUMER', label: 'C端消费者' },
  { value: 'GENERAL', label: '通用' },
];

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export default function TaskCreateDialog({ open, onClose, projectId }: TaskCreateDialogProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [type, setType] = useState('SHORT_VIDEO');
  const [platform, setPlatform] = useState('GENERAL');
  const [audience, setAudience] = useState('GENERAL');

  const utils = trpc.useUtils();

  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      toast({ title: '任务已创建' });
      utils.task.getAll.invalidate();
      setDescription('');
      setType('SHORT_VIDEO');
      setPlatform('GENERAL');
      setAudience('GENERAL');
      onClose();
    },
    onError: (e) => toast({ title: '创建失败', description: e.message, variant: 'destructive' }),
  });

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({ title: '请输入任务描述', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      projectId,
      description: description.trim(),
      type: type as any,
      platform: platform as any,
      audience: audience as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建任务</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务描述 *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="用一句话描述任务目标..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务类型 *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {TASK_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标平台</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标受众</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? '创建中...' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
