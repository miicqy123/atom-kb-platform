'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/Button';
import { ScoreRadar } from '@/components/prompts/ScoreRadar';
import { PromptViewer } from '@/components/prompts/PromptViewer';
import { OptimizationHistory } from '@/components/prompts/OptimizationHistory';
import { ChevronLeft, Sparkles, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PROMPT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '草稿', className: 'bg-gray-100 text-gray-600' },
  OPTIMIZING: { label: '优化中', className: 'bg-blue-100 text-blue-600' },
  READY: { label: '已就绪', className: 'bg-green-100 text-green-600' },
  PUBLISHED: { label: '已发布', className: 'bg-purple-100 text-purple-600' },
};

const DIMENSION_LABELS: Record<string, string> = {
  roleClarity: '角色清晰度',
  taskClarity: '任务明确性',
  inputCompleteness: '输入完整性',
  outputStandard: '输出规范性',
  boundaryConstraint: '边界约束',
  structureReason: '结构合理性',
  conciseness: '简洁度',
};

export default function PromptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: prompt, isLoading } = trpc.prompt.getById.useQuery({ id: params.id });

  const [optimizing, setOptimizing] = useState(false);

  const optimizeMutation = trpc.prompt.optimize.useMutation({
    onSuccess: (result) => {
      toast({ title: '优化完成', description: `最终评分：${result.finalScore.toFixed(2)}` });
      utils.prompt.getById.invalidate({ id: params.id });
      setOptimizing(false);
    },
    onError: (e) => {
      toast({ title: '优化失败', description: e.message, variant: 'destructive' });
      setOptimizing(false);
    },
  });

  const handleOptimize = () => {
    setOptimizing(true);
    optimizeMutation.mutate({ promptId: params.id });
  };

  const handleExport = () => {
    if (!prompt?.fullText) return;
    navigator.clipboard.writeText(prompt.fullText).then(() => {
      toast({ title: '已复制到剪贴板' });
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">加载中...</div>
    );
  }

  if (!prompt) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">提示词不存在</div>
    );
  }

  const statusStyle = PROMPT_STATUS_STYLES[prompt.status] || PROMPT_STATUS_STYLES.DRAFT;

  const dimensions = prompt.scoreDimensions as Record<string, number> | null;
  const diagnosis: string[] = [];
  if (dimensions) {
    Object.entries(dimensions).forEach(([key, value]) => {
      if (typeof value === 'number' && value < 3.5) {
        diagnosis.push(`${DIMENSION_LABELS[key] || key}不足（${value.toFixed(1)}/5.0）`);
      }
    });
  }

  const slots = prompt.slots as Record<string, string> | null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimize}
            disabled={optimizing || prompt.status === 'PUBLISHED'}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {optimizing ? '优化中...' : '优化'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Copy className="h-4 w-4 mr-1" /> 导出
          </Button>
        </div>
      </div>

      <h1 className="text-lg font-bold mb-6">📝 提示词详情</h1>

      <div className="space-y-6">
        {/* 评分面板 */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">评分面板</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.className}`}>
              {statusStyle.label}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <ScoreRadar dimensions={dimensions} overall={prompt.score} />
            </div>
            <div>
              <div className="text-sm text-gray-600 space-y-2 mb-4">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-gray-400">优化轮次</span>
                  <span>
                    {prompt.optimizationRound} / {prompt.maxRounds}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-gray-400">提示词版本</span>
                  <span>v{prompt.version}</span>
                </div>
                {prompt.optimizerUsed && (
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-gray-400">当前优化器</span>
                    <span>{prompt.optimizerUsed}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-gray-400">创建时间</span>
                  <span>{new Date(prompt.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>

              {diagnosis.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">诊断问题：</p>
                  <div className="space-y-1">
                    {diagnosis.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5"
                      >
                        <span>⚠️</span>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 提示词全文 */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold mb-4">提示词全文</h3>
          <PromptViewer fullText={prompt.fullText} slots={slots} thinkingModel={prompt.thinkingModel} />
        </div>

        {/* 优化历史 */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="text-sm font-semibold mb-4">优化历史</h3>
          <OptimizationHistory
            currentRound={prompt.optimizationRound}
            maxRounds={prompt.maxRounds}
            score={prompt.score}
            optimizerUsed={prompt.optimizerUsed}
            status={prompt.status}
          />
        </div>
      </div>
    </div>
  );
}
