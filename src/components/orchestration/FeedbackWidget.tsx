// src/components/orchestration/FeedbackWidget.tsx
"use client";
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

export function FeedbackWidget({ runId }: { runId: string }) {
  const { toast } = useToast();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = trpc.workflowRun.reportBusinessResult.useMutation({
    onSuccess: () => { setSubmitted(true); toast({ title: '反馈已提交，感谢！' }); },
    onError: (e) => toast({ title: '提交失败', description: e.message, variant: 'destructive' }),
  });

  if (submitted) {
    return (
      <div className="text-center py-4 text-sm text-green-600">✅ 反馈已记录</div>
    );
  }

  return (
    <div className="border rounded-xl p-4 bg-gray-50">
      <p className="text-sm font-medium mb-3">这次输出对你有帮助吗？</p>
      <div className="flex gap-2 mb-3">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            onClick={() => setScore(n)}
            className={`w-9 h-9 rounded-full text-sm font-bold border-2 transition-colors ${
              score === n
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'
            }`}
          >{n}</button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="可选：说明原因或建议改进…"
        className="w-full border rounded-lg px-3 py-2 text-xs resize-none h-16 mb-3"
      />
      <button
        onClick={() => mutation.mutate({
          runId,
          userSatisfactionScore: score || undefined,
          userComment: comment || undefined,
        })}
        disabled={!score || mutation.isPending}
        className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-40"
      >
        提交反馈
      </button>
    </div>
  );
}