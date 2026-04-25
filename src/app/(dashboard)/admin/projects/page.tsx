"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Search, Users, FileText, Database as DbIcon, BarChart3, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Mock Project 详情 ── */
const MOCK_DETAIL = {
  name: "万华灵荃3.0",
  stats: {
    raw: { total: 83, weekNew: 8 },
    atoms: { total: 952, A: 380, B: 420, C: 100, D: 52 },
    qa: { total: 456, beginner: 180, intermediate: 190, advanced: 86 },
    blueprints: { total: 12, online: 8, configuring: 3, testing: 1 },
  },
  matrix: [
    { dim: "维度1", A: 12, B: 8, C: 3, D: 2 },
    { dim: "维度2", A: 23, B: 5, C: 1, D: 0 },
    { dim: "维度3", A: 18, B: 15, C: 4, D: 3 },
    { dim: "维度4", A: 6, B: 22, C: 0, D: 5 },
    { dim: "维度5", A: 3, B: 11, C: 0, D: 2 },
    { dim: "维度30", A: 2, B: 0, C: 8, D: 12 },
  ],
  runs: { total: 3456, successRate: 94.2, tokenUsed: 2340000, tokenQuota: 5000000 },
  members: [
    { name: "杰", role: "Prompt工程师" },
    { name: "小明", role: "知识编辑" },
    { name: "小红", role: "审核人" },
    { name: "小李", role: "运营/投手" },
  ],
};

export default function ProjectManagementPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>("p1");

  const { data: projects, isLoading } = trpc.project.list.useQuery();
  const d = MOCK_DETAIL;

  const tokenPct = Math.round(d.runs.tokenUsed / d.runs.tokenQuota * 100);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Project 管理" description="管理项目、查看资产概览和运行统计"
        actions={<Button className="gap-2 bg-brand text-white"><Plus className="h-4 w-4" /> 新建 Project</Button>}
      />

      {/* 项目列表 */}
      <div className="px-6 py-3 border-b">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索项目…"
              className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm" />
          </div>
          <div className="flex gap-2">
            {(projects?.items ?? [{ id: "p1", name: "万华灵荃3.0", status: "ACTIVE" }, { id: "p2", name: "某教育项目", status: "ACTIVE" }]).map((p: any) => (
              <button key={p.id} onClick={() => setSelectedProject(p.id)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  selectedProject === p.id ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 详情 */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <h2 className="text-lg font-bold">▾ Project 详情: {d.name}</h2>

        {/* ── 资产概览 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-xl p-4 bg-white">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><FileText className="h-4 w-4" /> Raw 素材</div>
            <div className="text-2xl font-bold">{d.stats.raw.total} 份</div>
            <div className="text-xs text-green-600 mt-1">↑{d.stats.raw.weekNew} 本周</div>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><DbIcon className="h-4 w-4" /> Atoms</div>
            <div className="text-2xl font-bold">{d.stats.atoms.total} 条</div>
            <div className="grid grid-cols-2 gap-1 text-[10px] mt-1">
              <span style={{ color: "#6366f1" }}>A:{d.stats.atoms.A}</span>
              <span style={{ color: "#06b6d4" }}>B:{d.stats.atoms.B}</span>
              <span style={{ color: "#f97316" }}>C:{d.stats.atoms.C}</span>
              <span style={{ color: "#8b5cf6" }}>D:{d.stats.atoms.D}</span>
            </div>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <div className="text-xs text-gray-500 mb-1">❓ QA Pairs</div>
            <div className="text-2xl font-bold">{d.stats.qa.total} 组</div>
            <div className="text-[10px] mt-1 space-x-2">
              <span>⭐入门:{d.stats.qa.beginner}</span>
              <span>⭐⭐进阶:{d.stats.qa.intermediate}</span>
              <span>⭐⭐⭐专业:{d.stats.qa.advanced}</span>
            </div>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <div className="text-xs text-gray-500 mb-1">📋 蓝图</div>
            <div className="text-2xl font-bold">{d.stats.blueprints.total} 条</div>
            <div className="text-[10px] mt-1 space-x-2">
              <span className="text-green-600">🟢上线:{d.stats.blueprints.online}</span>
              <span className="text-blue-600">🔵配置:{d.stats.blueprints.configuring}</span>
              <span className="text-yellow-600">🟡测试:{d.stats.blueprints.testing}</span>
            </div>
          </div>
        </div>

        {/* ── 维度覆盖率矩阵 ── */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold">维度覆盖率矩阵（简化版）</h3>
            <div className="text-xs text-gray-500">覆盖率: 82% · 空缺格: 22/120</div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-2 text-left">维度</th>
                <th className="px-4 py-2 text-center" style={{ color: "#6366f1" }}>🅰️A</th>
                <th className="px-4 py-2 text-center" style={{ color: "#06b6d4" }}>🅱️B</th>
                <th className="px-4 py-2 text-center" style={{ color: "#f97316" }}>🅲C</th>
                <th className="px-4 py-2 text-center" style={{ color: "#8b5cf6" }}>🅳D</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.matrix.map(row => (
                <tr key={row.dim} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs font-medium">{row.dim}</td>
                  {[row.A, row.B, row.C, row.D].map((v, i) => (
                    <td key={i} className="px-4 py-2 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-mono ${
                        v === 0 ? "bg-red-100 text-red-600 font-bold" : "text-gray-700"
                      }`}>
                        {v === 0 ? "🔴0" : v}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t bg-yellow-50 text-xs text-yellow-700">
            💡 建议优先补充: D层维度2, C层维度4/5, B层维度30
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── 运行统计 ── */}
          <div className="border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 运行统计</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">总 WorkflowRun</span><span className="font-bold">{d.runs.total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">成功率</span><span className="font-bold text-green-600">{d.runs.successRate}%</span></div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">月 Token 消耗</span>
                  <span className="font-mono">{(d.runs.tokenUsed / 1e6).toFixed(2)}M / {(d.runs.tokenQuota / 1e6).toFixed(0)}M</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`h-full rounded-full ${tokenPct > 80 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${tokenPct}%` }} />
                </div>
                <div className="text-right text-[10px] text-gray-400 mt-0.5">{tokenPct}%</div>
              </div>
            </div>
          </div>

          {/* ── 项目成员 ── */}
          <div className="border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> 项目成员</h3>
            <div className="space-y-2">
              {d.members.map(m => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center text-xs font-bold text-brand">
                      {m.name[0]}
                    </div>
                    <span className="font-medium">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                    <button className="text-xs text-gray-400 hover:text-gray-600">编辑角色▾</button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3 gap-1 text-xs">
              <Plus className="h-3 w-3" /> 添加成员
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
