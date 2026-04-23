"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, Shield, Coins, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

const COLORS = ["#2563EB", "#8B5CF6", "#F59E0B", "#16A34A", "#DC2626"];
const MOCK_RUN_TREND = Array.from({ length: 14 }, (_, i) => ({ day: `4/${i + 1}`, runs: 30 + Math.floor(Math.random() * 40), success: 25 + Math.floor(Math.random() * 30) }));
const MOCK_COST_PIE = [{ name: "GPT-4o", value: 45 }, { name: "Claude-3.5", value: 30 }, { name: "DeepSeek-V3", value: 20 }, { name: "其他", value: 5 }];

export default function GovernanceDashboard() {
  const [tab, setTab] = useState(0);
  const TABS = ["装配运行", "质量评分", "成本大盘", "红线异常"];

  const { currentProject } = useProjectStore();

  // 获取仪表板数据
  const { data: projectDashboardData } = trpc.dashboard.getProjectDashboard.useQuery(
    { projectId: currentProject?.id || 'default-project' },
    { enabled: !!currentProject }
  );

  // 获取系统仪表板数据（需要管理员权限）
  const { data: systemDashboardData } = trpc.dashboard.getSystemDashboard.useQuery(undefined, {
    retry: false,
  });

  // 获取项目相关的工作流运行数据
  const { data: workflowRunData } = trpc.analytics.runTrend.useQuery(
    { projectId: currentProject?.id || 'default-project', days: 14 },
    { enabled: !!currentProject }
  );

  // 获取评估数据
  const { data: qualityData } = trpc.analytics.qualityTrend.useQuery(
    { projectId: currentProject?.id || 'default-project' },
    { enabled: !!currentProject }
  );

  // 获取SLA指标
  const { data: slaData } = trpc.analytics.slaMetrics.useQuery(
    { projectId: currentProject?.id || 'default-project' },
    { enabled: !!currentProject }
  );

  // 获取事件列表
  const { data: incidents } = trpc.analytics.incidentList.useQuery({});

  // 计算统计数据
  const runStats = projectDashboardData?.workflowStats || [];
  const totalRuns = runStats.reduce((sum, stat) => sum + stat._count, 0);
  const successRate = totalRuns > 0 ?
    ((runStats.find(s => s.status === 'SUCCESS')?._count || 0) / totalRuns * 100).toFixed(1) + '%' :
    '0%';

  return (
    <div>
      <PageHeader title="可观测性大盘" description="4 看板：装配运行 / 质量评分 / 成本 / 红线与异常" />

      <div className="mb-4 flex gap-1">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`rounded-lg px-4 py-2 text-sm ${tab === i ? "bg-brand text-white" : "border hover:bg-gray-50"}`}>
            {[<Activity key={0} className="inline h-4 w-4 mr-1" />, <Shield key={1} className="inline h-4 w-4 mr-1" />, <Coins key={2} className="inline h-4 w-4 mr-1" />, <AlertTriangle key={3} className="inline h-4 w-4 mr-1" />][i]}{t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatsCard title="日均运行次数" value={projectDashboardData?.recentWorkflows?.length?.toString() || "0"} color="text-brand" />
            <StatsCard title="成功率" value={successRate} color="text-green-600" />
            <StatsCard title="总资源数" value={projectDashboardData?.totalAssets?.toString() || "0"} color="text-pf" />
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold mb-3">每日运行次数与成功率趋势</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={MOCK_RUN_TREND}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} /><Tooltip />
                <Bar dataKey="runs" fill="#2563EB" name="总运行" radius={[4,4,0,0]} />
                <Bar dataKey="success" fill="#16A34A" name="成功" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatsCard title="S8 通过率" value={slaData?.successRate ? (slaData.successRate * 100).toFixed(1) + '%' : '—'} color="text-brand" />
            <StatsCard title="S9 综合评分" value={qualityData?.[0]?.s9OverallScore?.toString() || '—'} color="text-pf" />
            <StatsCard title="平均响应时间" value={slaData?.avgDuration ? slaData.avgDuration.toFixed(2) + 's' : '—'} color="text-orange-600" />
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold mb-3">S8 通过率 / S9 综合评分趋势</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={qualityData?.slice(0, 14).map((d, i) => ({
                day: `第${i+1}次`,
                s8: d.passed ? 100 : 0,
                s9: d.s9OverallScore
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="s8" stroke="#2563EB" strokeWidth={2} name="S8 通过率" />
                <Line yAxisId="right" type="monotone" dataKey="s9" stroke="#8B5CF6" strokeWidth={2} name="S9 评分" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatsCard title="月成本" value="¥12,350" color="text-orange-600" />
            <StatsCard title="日均 Token" value={projectDashboardData?.workflowStats?.reduce((sum, stat) => sum + (stat._avg?.tokenUsage || 0), 0)?.toFixed(0) || '0'} color="text-pf" />
            <StatsCard title="超限告警" value="1 次" color="text-danger" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold mb-3">各模型 Token 消耗占比</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={MOCK_COST_PIE} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, percent}: any) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {MOCK_COST_PIE.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold mb-3">成本 Top5 蓝图</h3>
              <div className="space-y-2">
                {["内容策划蓝图","话术生成蓝图","数据分析蓝图","SEO蓝图","投放策略蓝图"].map((n, i) => (
                  <div key={n} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-sm">{n}</span>
                    <span className="text-xs font-mono text-orange-600">¥{(3000 - i * 500).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 3 && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">红线与异常事件列表</h3>
          <div className="space-y-2">
            {(incidents ?? []).map((inc: any) => (
              <div key={inc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${inc.severity === "CRITICAL" ? "bg-red-100 text-red-700" : inc.severity === "HIGH" ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>{inc.severity}</span>
                  <div><p className="text-sm">{inc.type}</p><p className="text-xs text-gray-400">{new Date(inc.createdAt).toLocaleString("zh-CN")}</p></div>
                </div>
                <StatusBadge status={inc.status === "resolved" ? "SUCCESS" : inc.status === "in_progress" ? "RUNNING" : "PENDING"} />
              </div>
            ))}
            {(!incidents || incidents.length === 0) && <p className="text-sm text-gray-400 text-center py-8">暂无异常事件</p>}
          </div>
        </div>
      )}
    </div>
  );
}