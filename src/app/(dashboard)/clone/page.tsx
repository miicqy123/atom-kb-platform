'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import InputPanel from '@/components/clone/InputPanel';
import StepResult from '@/components/clone/StepResult';
import PromptPreview from '@/components/clone/PromptPreview';

export default function ClonePage() {
  const { projectId } = useProjectStore();
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [stage, setStage] = useState<'idle' | 'submitting' | 'result_ready'>('idle');
  const [result, setResult] = useState<{
    prompt: string;
    slots: Record<string, string>;
    rules: string[];
  } | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: {
    inputType: 'text' | 'url' | 'image';
    content: string;
    taskType?: string;
    platform?: string;
  }) => {
    if (!projectId) return;
    setStage('submitting');

    try {
      const { taskId } = await trpc.clone.create.mutateAsync({
        projectId,
        inputType: data.inputType,
        content: data.content,
        taskType: data.taskType as any,
        platform: data.platform,
      });

      const reverseResult = await trpc.clone.reverse.mutateAsync({
        taskId,
        content: data.content,
      });

      // 获取 slots 数据用于分段展示
      let slots: Record<string, string> = {};
      try {
        const promptDetail = await trpc.prompt.getById.fetch({ id: reverseResult.promptId });
        slots = (promptDetail.slots as Record<string, string>) || {};
      } catch {
        // fallback: empty slots
      }

      setPromptId(reverseResult.promptId);
      setResult({
        prompt: reverseResult.prompt,
        slots,
        rules: reverseResult.rules,
      });
      setStage('result_ready');
    } catch (e: any) {
      toast({ title: '反推失败', description: e.message, variant: 'destructive' });
      setStage('idle');
    }
  };

  const handleToAtoms = async () => {
    if (!projectId || !promptId) return;
    setSaving(true);
    try {
      const res = await trpc.clone.toAtoms.mutateAsync({ promptId, projectId });
      toast({ title: `已拆解 ${res.atomsCreated} 个原子块入库` });
    } catch (e: any) {
      toast({ title: '拆解失败', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSave = () => {
    if (promptId) {
      router.push(`/prompts/${promptId}`);
    }
  };

  const handleCopy = () => {
    if (!result?.prompt) return;
    navigator.clipboard.writeText(result.prompt).then(() => {
      toast({ title: '已复制到剪贴板' });
    });
  };

  return (
    <div>
      <PageHeader
        title="⚡ 快速复刻"
        description="通过粘贴优质内容，自动反推生成可复用的结构化提示词"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        <InputPanel onSubmit={handleSubmit} loading={stage === 'submitting'} />

        {stage !== 'idle' && (
          <StepResult result={result} loading={stage === 'submitting'} />
        )}

        {result && stage === 'result_ready' && (
          <PromptPreview
            prompt={result.prompt}
            slots={result.slots}
            onSaveAsPrompt={handleSave}
            onToAtoms={handleToAtoms}
            onCopy={handleCopy}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
