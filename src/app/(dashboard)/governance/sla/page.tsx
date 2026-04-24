"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Activity, Target, Clock, AlertTriangle, CheckCircle, TrendingUp, Calendar, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

const ROLES = [
  { id: "planner", name: "Planner", color: "#3B82F6" },
  { id: "generator", name: "Generator", color: "#10B981" },
  { id: "evaluator", name: "Evaluator", color: "#F59E0B" },
  { id: "coordinator", name: "Coordinator", color: "#EF4444" },
  { id: "critic", name: "Critic", color: "#8B5CF6" },
  { id: "refiner", name: "Refiner", color: "#EC4899" },
  { id: "validator", name: "Validator", color: "#06B6D4" },
  { id: "orchestrator", name: "Orchestrator", color: "#84CC16" },
];

const MOCK_SLA_DATA = ROLES.map(role => ({
  role: role.name,
  availability: 99.2 + Math.random() * 0.6,
  latency: 120 + Math.floor(Math.random() * 80),
  successRate: 98.5 + Math.random() * 1.3,
  throughput: 45 + Math.floor(Math.random() * 30),
  errorRate: 0.1 + Math.random() * 0.3,
}));

export default function SLAMonitoringPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const { projectId } = useProjectStore();

  const { data: runStats } = trpc.analytics.getRunStats?.useQuery?.() ?? { data: null };
  const { data: qualityStats } = trpc.analytics.getQualityStats?.useQuery?.() ?? { data: null };

  return (
    <div>
      <PageHeader
        title="元编排 8 角色 SLA 监控"
        description="实时监控 8 个核心角色的 SLA 指标：可用性、延迟、成功率、吞吐量等"
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatsCard title="总体可用性" value="99.87%" icon={<Target className="h-5 w-5 text-green-500" />} color="text-green-600" />
        <StatsCard title="平均延迟" value="180ms" icon={<Clock className="h-5 w-5 text-blue-500" />} color="text-blue-600" />
        <StatsCard title="总体成功率" value="99.2%" icon={<CheckCircle className="h-5 w-5 text-green-500" />} color="text-green-600" />
        <StatsCard title="活跃角色数" value="8/8" icon={<Activity className="h-5 w-5 text-purple-500" />} color="text-purple-600" />
      </div>

      <div className="mb-6 flex gap-2">
        {["1h", "6h", "24h", "7d", "30d"].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`rounded-lg px-3 py-1.5 text-sm ${timeRange === range ? "bg-gc text-white" : "border hover:bg-gray-50"}`}
          >
            {range}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Target className="h-4 w-4" /> SLA 雷达图</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={MOCK_SLA_DATA}>
              <PolarGrid />
              <PolarAngleAxis dataKey="role" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[95, 100]} tickCount={6} />
              <Radar
                name="可用性"
                dataKey="availability"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 延迟性能对比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={MOCK_SLA_DATA}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="latency" fill="#F59E0B" name="延迟 (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4" /> 角色 SLA 详细指标</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-xs font-semibold text-gray-500">角色</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500">可用性</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500">延迟</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500">成功率</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500">吞吐量</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500">错误率</th>
                <th className="text-center py-2 text-xs font-semibold text-gray-500">状态</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SLA_DATA.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ROLES[idx].color }}></div>
                      <span className="text-sm">{row.role}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{row.availability.toFixed(2)}%</span>
                      <span className={`text-xs ${row.availability > 99.5 ? 'text-green-600' : row.availability > 99.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {row.availability > 99.5 ? '达标' : row.availability > 99.0 ? '临界' : '未达标'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center text-sm">{row.latency}ms</td>
                  <td className="py-3 text-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{row.successRate.toFixed(2)}%</span>
                      <span className={`text-xs ${row.successRate > 99.0 ? 'text-green-600' : row.successRate > 98.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {row.successRate > 99.0 ? '优秀' : row.successRate > 98.0 ? '良好' : '需优化'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center text-sm">{row.throughput}/min</td>
                  <td className="py-3 text-center">
                    <span className={`text-xs ${row.errorRate < 0.2 ? 'text-green-600' : row.errorRate < 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {row.errorRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <StatusBadge status={row.availability > 99.0 && row.successRate > 98.0 ? "SUCCESS" : "FAILED"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">告警统计</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">严重告警</span>
              <span className="text-sm font-bold text-red-500">2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">一般告警</span>
              <span className="text-sm font-bold text-yellow-500">5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">已解决</span>
              <span className="text-sm font-bold text-green-500">24</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">性能趋势</h3>
          <div className="text-sm text-gray-600">
            <p className="mb-1">• 整体性能较上周提升 3.2%</p>
            <p className="mb-1">• 关键角色可用性稳定在 99.9%</p>
            <p>• 平均响应时间降低 15%</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">健康度评估</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">系统健康度</span>
              <span className="text-sm font-bold text-green-600">98.7%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: "98.7%" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}