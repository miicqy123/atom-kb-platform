"use client";
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { useProjectStore } from '@/stores/projectStore';

const AGENT_LABELS: Record<string, { icon: string; color: string; desc: string }> = {
  'agent-organizer':    { icon: '🎯', color: 'bg-blue-100 text-blue-800',   desc: '总调度' },
  'context-manager':   { icon: '🧠', color: 'bg-purple-100 text-purple-800', desc: '上下文管理' },
  'slot-filler':       { icon: '✍️', color: 'bg-green-100 text-green-800',  desc: '槽位填充' },
  'quality-checker':   { icon: '🔍', color: 'bg-yellow-100 text-yellow-800', desc: 'S8质检' },
  'conflict-arbiter':  { icon: '⚖️', color: 'bg-orange-100 text-orange-800', desc: '冲突仲裁' },
  'hitl-dispatcher':   { icon: '🚨', color: 'bg-red-100 text-red-800',      desc: 'HITL分发' },
  'feedback-learner':  { icon: '📊', color: 'bg-teal-100 text-teal-800',    desc: '反馈学习' },
  'blueprint-optimizer':{ icon: '⚡', color: 'bg-indigo-100 text-indigo-800', desc: '蓝图优化' },
};

export default function MultiAgentPage() {
  const { projectId } = useProjectStore();
  const { toast } = useToast();
  const [blueprintId, setBlueprintId] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [activeAgents, setActiveAgents] = useState<string[]>([]);

  const { data: blueprints } = trpc.blueprint.getAll?.useQuery?.(
    { projectId },
    { enabled: !!projectId }
  ) ?? { data: null };

  const runMutation = trpc.orchestration.runMultiAgent.useMutation({
    onMutate: () => {
      setActiveAgents(['agent-organizer', 'context-manager']);
      setResults([]);
      setFinalPrompt('');
    },
    onSuccess: (data) => {
      setResults(data.results);
      setFinalPrompt(data.finalPrompt);
      setActiveAgents([]);
      toast({
        title: `编排完成`,
        description: `${data.results.length} 个槽位，${data.hitlTasks.length} 个HITL任务`,
      });
    },
    onError: (e) => {
      setActiveAgents([]);
      toast({ title: '编排失败', description: e.message, variant: 'destructive' });
    },
  });

  const feedbackMutation = trpc.orchestration.runFeedbackLearner.useMutation({
    onSuccess: (d) => toast({ title: '反馈分析完成', description: `发现 ${(d as any).insights?.dimensionGaps?.length || 0} 个维度缺口` }),
  });

  const optimizeMutation = trpc.orchestration.runBlueprintOptimizer.useMutation({
    onSuccess: (d) => toast({ title: '蓝图优化分析完成', description: `健康度：${(d as any).optimization?.overallHealth}` }),
  });

  return (
    <div className="p-6">
      <PageHeader title="多角色元编排" description="8个AI角色协作完成蓝图装配" />

      {/* 角色状态展示 */}
      <div className="grid grid-cols-4 gap-3 mt-6 mb-6">
        {Object.entries(AGENT_LABELS).map(([role, info]) => (
          <div key={role} className={`rounded-xl p-3 border ${
            activeAgents.includes(role)
              ? 'border-blue-400 shadow-md animate-pulse'
              : 'border-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{info.icon}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
                {info.desc}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono truncate">{role}</p>
            {activeAgents.includes(role) && (
              <div className="mt-1 flex gap-0.5">
                {[0,1,2].map(i => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce`}
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 执行面板 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-4">🚀 启动编排</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">选择蓝图</label>
              <select
                value={blueprintId}
                onChange={e => setBlueprintId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">请选择</option>
                {blueprints?.items?.map((bp: any) => (
                  <option key={bp.id} value={bp.id}>{bp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">用户任务描述</label>
              <textarea
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder="描述本次需要生成的提示词的业务场景…"
                className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none"
              />
            </div>
            <button
              onClick={() => runMutation.mutate({ blueprintId, projectId, userQuery })}
              disabled={!blueprintId || !userQuery || runMutation.isPending}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              {runMutation.isPending ? '⚙️ 8角色协作中…' : '▶ 启动多角色编排'}
            </button>

            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={() => feedbackMutation.mutate({ projectId, lookbackDays: 7 })}
                disabled={!projectId || feedbackMutation.isPending}
                className="flex-1 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs hover:bg-teal-100 disabled:opacity-40"
              >
                {feedbackMutation.isPending ? '分析中…' : '📊 反馈学习'}
              </button>
              <button
                onClick={() => optimizeMutation.mutate({ blueprintId })}
                disabled={!blueprintId || optimizeMutation.isPending}
                className="flex-1 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs hover:bg-indigo-100 disabled:opacity-40"
              >
                {optimizeMutation.isPending ? '分析中…' : '⚡ 蓝图优化'}
              </button>
            </div>
          </div>
        </div>

        {/* 槽位执行结果 */}
        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-3">执行结果（{results.length} 个槽位）</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border text-sm ${
                r.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold">{r.slotKey}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    r.passed ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {r.passed ? `✓ ${r.score}分` : `✗ ${r.score}分→HITL`}
                  </span>
                  <span className="text-xs text-gray-400">{AGENT_LABELS[r.agentRole]?.icon} {r.agentRole}</span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{r.output?.slice(0, 120)}</p>
              </div>
            ))}
            {results.length === 0 && !runMutation.isPending && (
              <p className="text-sm text-gray-400 text-center py-8">执行后在此查看各槽位结果</p>
            )}
          </div>
        </div>
      </div>

      {/* 最终系统提示词 */}
      {finalPrompt && (
        <div className="mt-6 border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">📄 最终系统提示词</h3>
            <button
              onClick={() => navigator.clipboard.writeText(finalPrompt)}
              className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 px-3 py-1 rounded-lg"
            >
              复制全文
            </button>
          </div>
          <textarea
            readOnly
            value={finalPrompt}
            className="w-full h-64 text-xs font-mono border rounded-lg p-3 bg-gray-50 resize-none"
          />
        </div>
      )}
    </div>
  );
}