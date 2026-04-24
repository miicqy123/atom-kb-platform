"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { Trophy, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/use-toast";

export default function EvaluationPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<"scores" | "ab">("scores");

  // 获取统计数据
  const { data: stats } = trpc.evaluation.getStats.useQuery();
  // 获取评分趋势数据
  const { data: scoreTrend } = trpc.evaluation.getScoreTrend.useQuery({ limit: 10 });
  // 获取雷达图数据
  const { data: radarData } = trpc.evaluation.getRadarData.useQuery();

  // 删除评价记录的mutation
  const deleteEvaluation = trpc.evaluation.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "评价记录已成功删除",
      });
      utils.evaluation.getScoreTrend.invalidate();
      utils.evaluation.getStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除评价记录时出现错误",
        variant: "destructive",
      });
    }
  });

  // 计算统计值
  const statsData = stats as any;
  const totalRecords = statsData?._count?._all || statsData?.total || 0;
  const avgS8 = statsData?._avg?.s9OverallScore || 0;
  const avgS9 = statsData?.avgScore || 0;

  // 格式化趋势数据以适应图表
  const chartData = scoreTrend?.map((record, index) => ({
    run: `#${scoreTrend.length - index}`,
    s8: typeof record.s8Scores === 'number' ? record.s8Scores : 0,
    s9: record.s9OverallScore,
    date: new Date(record.createdAt).toLocaleDateString(),
    workflowName: `Run ${record.id}`
  })) || [];

  return (
    <div>
      <PageHeader title="评分诊断与 A/B 对比" description="S8/S9 质检评分趋势与蓝图版本对比" />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("scores")} className={`rounded-lg px-4 py-2 text-sm ${tab === "scores" ? "bg-pf text-white" : "border"}`}>评分面板</button>
        <button onClick={() => setTab("ab")} className={`rounded-lg px-4 py-2 text-sm ${tab === "ab" ? "bg-pf text-white" : "border"}`}>A/B 对比</button>
      </div>

      {tab === "scores" && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatsCard title="总评估次数" value={totalRecords.toString()} color="text-brand" />
            <StatsCard title="S8 平均分" value={avgS8 ? avgS8.toFixed(1) : "0.0"} color="text-pf" />
            <StatsCard title="S9 平均分" value={avgS9 ? avgS9.toFixed(1) : "0.0"} color="text-purple-600" />
            <StatsCard title="最近评估" value={scoreTrend?.length ? "✓" : "—" } color="text-green-600" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">S8/S9 评分趋势</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="run" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name) => [`${value}`, name === 's8' ? 'S8评分' : 'S9评分']}
                    labelFormatter={(label) => `运行: ${label}`}
                  />
                  <Line type="monotone" dataKey="s8" stroke="#2563EB" strokeWidth={2} name="S8" />
                  <Line type="monotone" dataKey="s9" stroke="#8B5CF6" strokeWidth={2} name="S9" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold mb-3">各维度评分雷达图</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData || []}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 评价记录列表 */}
          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold mb-3">评估记录</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2">运行</th>
                    <th className="pb-2">S8 评分</th>
                    <th className="pb-2">S9 评分</th>
                    <th className="pb-2">状态</th>
                    <th className="pb-2">日期</th>
                    <th className="pb-2">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {scoreTrend?.map(record => (
                    <tr key={record.id} className="border-b border-gray-100">
                      <td className="py-2">{`Run ${record.workflowRun?.id?.slice(0, 8) ?? record.id}`}</td>
                      <td className="py-2">{typeof record.s8Scores === 'number' ? record.s8Scores : JSON.stringify(record.s8Scores)}</td>
                      <td className="py-2">{record.s9OverallScore}</td>
                      <td className="py-2">{record.passed ? '通过' : '未通过'}</td>
                      <td className="py-2">{new Date(record.createdAt).toLocaleDateString()}</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => {
                            // 编辑功能
                          }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm(`确定要删除这条评估记录吗？`)) {
                                deleteEvaluation.mutate({ id: record.id });
                              }
                            }}
                            disabled={deleteEvaluation.isPending}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-gray-500">暂无评估记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "ab" && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4">
              <select className="rounded-lg border px-3 py-2 text-sm">
                <option>蓝图 A — v3</option>
              </select>
              <span className="text-gray-400 self-center">vs</span>
              <select className="rounded-lg border px-3 py-2 text-sm">
                <option>蓝图 A — v2</option>
              </select>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-pf px-4 py-2 text-sm text-white">
              <Trophy className="h-4 w-4" />标记胜出版本
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-brand mb-2">版本 A (v3) 输出</h4>
              <div className="text-xs text-gray-600 leading-relaxed">这是版本 A 针对相同输入生成的内容输出示例…</div>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <h4 className="text-sm font-semibold text-pf mb-2">版本 B (v2) 输出</h4>
              <div className="text-xs text-gray-600 leading-relaxed">这是版本 B 针对相同输入生成的内容输出示例…</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}