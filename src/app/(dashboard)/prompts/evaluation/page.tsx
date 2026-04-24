"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useProjectStore } from "@/stores/projectStore";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from "recharts";
import { Trophy, Play, Trash2, Edit } from "lucide-react";

/* ── Mock 数据 ── */
const TREND_DATA = Array.from({ length: 10 }, (_, i) => ({
  run: `v3.${i + 1}`,
  s8: 75 + Math.floor(Math.random() * 20),
  s9: 80 + Math.floor(Math.random() * 15),
}));
const RADAR_DATA = [
  { dim: "红线扫描", current: 98, prev: 95 },
  { dim: "占位符检查", current: 96, prev: 88 },
  { dim: "跳步检查", current: 93, prev: 90 },
  { dim: "结构缺项", current: 88, prev: 82 },
  { dim: "事实证据性", current: 85, prev: 78 },
];
const PASS_RATES = [
  { name: "红线扫描", rate: 100, ok: true },
  { name: "占位符检查", rate: 98, ok: true },
  { name: "跳步检查", rate: 95, ok: true },
  { name: "结构缺项", rate: 90, ok: false },
  { name: "事实证据性", rate: 88, ok: false },
];

export default function EvaluationPage() {
  const { toast } = useToast();
  const { projectId } = useProjectStore();
  const [tab, setTab] = useState<"scores" | "ab">("scores");

  /* A/B 对比 */
  const [bpA, setBpA] = useState("万华-销售v3");
  const [bpB, setBpB] = useState("万华-销售v2");
  const [abInput, setAbInput] = useState("");
  const [abLoading, setAbLoading] = useState(false);
  const [abResult, setAbResult] = useState<{ a: any; b: any } | null>(null);

  const runABTest = async () => {
    if (!abInput) return;
    setAbLoading(true);
    // 模拟两个版本并行运行
    await new Promise(r => setTimeout(r, 1500));
    setAbResult({
      a: {
        output: "灵荃和欧派的核心差异在于三个层面：\n1. 技术底座不同：灵荃采用万华自研MDI生态胶粘剂，实现全链路无醛添加；欧派采用传统脲醛胶。\n2. 环保标准不同：灵荃执行ENF级标准（≤0.025mg/m³），远高于国标E1级。\n3. 供应链透明度：灵荃可追溯到原材料级别的品控体系。",
        s8: 96, s9: 92, status: "SUCCESS",
      },
      b: {
        output: "灵荃的优势主要在于无醛添加技术，采用MDI胶粘剂，比传统产品更环保。",
        s8: 88, s9: 85, status: "SUCCESS",
      },
    });
    setAbLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="评分诊断与 A/B 对比" description="查看 S8/S9 评分趋势，执行蓝图版本对比测试" />

      {/* Tab */}
      <div className="border-b px-6">
        <div className="flex gap-6">
          {([["scores", "评分趋势"], ["ab", "A/B 对比"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`py-3 text-sm font-medium border-b-2 transition ${tab === key ? "border-brand text-brand" : "border-transparent text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {tab === "scores" && (
          <>
            {/* S8/S9 趋势图 */}
            <div className="border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">S8/S9 评分趋势（最近10次运行）</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="run" tick= fontSize: 12  />
                    <YAxis domain={[60, 100]} tick= fontSize: 12  />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="s9" stroke="#1a56db" strokeWidth={2} name="S9 综合" dot= r: 4  />
                    <Line type="monotone" dataKey="s8" stroke="#10b981" strokeWidth={2} name="S8 通过率" dot= r: 4  />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 雷达图 */}
              <div className="border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">评分维度雷达图</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={RADAR_DATA}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dim" tick= fontSize: 11  />
                      <Radar name="当前版本" dataKey="current" stroke="#1a56db" fill="#1a56db" fillOpacity={0.2} />
                      <Radar name="上一版本" dataKey="prev" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 质检通过率 */}
              <div className="border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">质检通过率</h3>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>最近一轮回归测试</span>
                    <span className="font-bold">95%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="h-full bg-green-500 rounded-full" style= width: "95%"  />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">95 / 100 通过</div>
                </div>
                <div className="space-y-2 mt-4">
                  {PASS_RATES.map(p => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-full rounded-full ${p.ok ? "bg-green-500" : "bg-yellow-500"}`}
                            style={{ width: `${p.rate}%` }} />
                        </div>
                        <span className={`font-mono w-10 text-right ${p.ok ? "text-green-600" : "text-yellow-600"}`}>
                          {p.rate}% {p.ok ? "✅" : "⚠️"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "ab" && (
          <>
            {/* A/B 对比控制 */}
            <div className="border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">A/B 对比模式</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">蓝图 A</label>
                  <select value={bpA} onChange={e => setBpA(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                    <option>万华-销售v3</option><option>万华-销售v2</option><option>万华-种草v2</option>
                  </select>
                </div>
                <div className="text-gray-400 font-bold pt-4">vs</div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500">蓝图 B</label>
                  <select value={bpB} onChange={e => setBpB(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                    <option>万华-销售v2</option><option>万华-销售v3</option><option>万华-种草v2</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <input value={abInput} onChange={e => setAbInput(e.target.value)}
                  placeholder="输入测试问题，如：客户问灵荃和欧派比有什么优势？"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <Button onClick={runABTest} disabled={!abInput || abLoading}
                  className="gap-1 bg-brand text-white">
                  <Play className="h-4 w-4" /> {abLoading ? "运行中…" : "对比运行"}
                </Button>
              </div>
            </div>

            {/* A/B 结果 */}
            {abResult && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* A 输出 */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-blue-50 border-b flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-700">{bpA} 输出</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        abResult.a.s9 >= 90 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>S9: {abResult.a.s9}分</span>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">{abResult.a.output}</pre>
                      <div className="mt-3 pt-2 border-t flex gap-3 text-xs text-gray-500">
                        <span>S8: {abResult.a.s8}分</span>
                        <span>S9: {abResult.a.s9}分</span>
                      </div>
                    </div>
                  </div>

                  {/* B 输出 */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-green-50 border-b flex items-center justify-between">
                      <span className="text-xs font-semibold text-green-700">{bpB} 输出</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        abResult.b.s9 >= 90 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>S9: {abResult.b.s9}分</span>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">{abResult.b.output}</pre>
                      <div className="mt-3 pt-2 border-t flex gap-3 text-xs text-gray-500">
                        <span>S8: {abResult.b.s8}分</span>
                        <span>S9: {abResult.b.s9}分</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button onClick={() => toast({ title: `已标记 ${bpA} 为胜出版本 🏆` })}
                    className="gap-2 bg-yellow-500 text-white hover:bg-yellow-600">
                    <Trophy className="h-4 w-4" />
                    标记 {abResult.a.s9 >= abResult.b.s9 ? bpA : bpB} 胜出 🏆
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
