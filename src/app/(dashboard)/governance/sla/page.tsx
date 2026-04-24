"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

const ROLES = [
  {
    id: "agent-organizer", name: "Agent Organizer",
    metrics: [
      { label: "蓝图匹配率", value: "96.8%", target: ">95%", ok: true },
      { label: "组建延迟", value: "380ms", target: "<500ms", ok: true },
    ],
    spark: "▁▂▃▄▅▆▇",
  },
  {
    id: "context-manager", name: "Context Manager",
    metrics: [
      { label: "检索延迟", value: "68ms", target: "<100ms", ok: true },
      { label: "缓存命中率", value: "88%", target: ">85%", ok: true },
    ],
    spark: "▁▂▃▃▄▅▆",
  },
  {
    id: "task-distributor", name: "Task Distributor",
    metrics: [
      { label: "分发延迟", value: "145ms", target: "<200ms", ok: true },
      { label: "队列积压", value: "12", target: "<50", ok: true },
    ],
    spark: "▅▄▃▃▂▂▁",
  },
  {
    id: "multi-agent-coord", name: "Multi-Agent Coordinator",
    metrics: [
      { label: "交接成功率", value: "99.7%", target: ">99%", ok: true },
      { label: "数据丢失", value: "0", target: "=0", ok: true },
    ],
    spark: "▆▇▇▇▇▇▇",
  },
  {
    id: "workflow-orchestrator", name: "Workflow Orchestrator",
    metrics: [
      { label: "编排完成率", value: "87%", target: ">85%", ok: true },
      { label: "断点恢复", value: "96%", target: ">95%", ok: true },
    ],
    spark: "▃▄▅▅▆▆▇",
  },
  {
    id: "error-coordinator", name: "Error Coordinator",
    metrics: [
      { label: "自动恢复率", value: "82%", target: ">80%", ok: true },
      { label: "升级响应", value: "3.2min", target: "<5min", ok: true },
    ],
    spark: "▂▃▃▄▅▅▆",
  },
  {
    id: "performance-monitor", name: "Performance Monitor",
    metrics: [
      { label: "采集覆盖", value: "100%", target: "100%", ok: true },
      { label: "告警延迟", value: "18s", target: "<30s", ok: true },
    ],
    spark: "▇▇▇▇▇▇▇",
  },
  {
    id: "knowledge-synthesizer", name: "Knowledge Synthesizer",
    metrics: [
      { label: "沉淀覆盖率", value: "91%", target: ">90%", ok: true },
      { label: "复用率", value: "↑12%", target: "持续提升", ok: true },
    ],
    spark: "▁▂▃▄▅▆▇",
  },
];

export default function SLAMonitoringPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="8 角色 SLA 监控" description="监控系统 8 个核心角色的 SLA 达标情况" />

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ROLES.map((role) => (
            <div key={role.id} className="border rounded-xl bg-white p-5 hover:shadow-md transition-shadow">
              {/* 角色名 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">{role.name}</h3>
                <span className="text-[10px] font-mono text-gray-400">{role.id}</span>
              </div>

              {/* SLA 指标 */}
              <div className="space-y-3">
                {role.metrics.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">{m.label}</div>
                      <div className="text-lg font-bold text-gray-900">{m.value}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400">SLA: {m.target}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {m.ok ? "🟢 达标" : "🔴 未达标"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 迷你趋势图 */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-gray-400">7d 趋势</span>
                <span className="text-lg tracking-widest" style= fontFamily: "monospace" >{role.spark}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
