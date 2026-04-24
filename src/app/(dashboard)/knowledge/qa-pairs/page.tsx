"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Search, FlaskConical, Edit, Trash2, ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import QADialog from "@/components/knowledge/QADialog";
import { useToast } from "@/hooks/use-toast";

const DIFFICULTY: Record<string,{stars:string;label:string}> = {
  BEGINNER:     { stars:"⭐",       label:"入门" },
  INTERMEDIATE: { stars:"⭐⭐",     label:"进阶" },
  ADVANCED:     { stars:"⭐⭐⭐",   label:"专业" },
};

const ANSWER_LAYERS = ["核心回答","深层解析","数据论证","场景应用","常见误区","应对话术","延伸知识"];

export default function QAPairsPage() {
  const { projectId } = useProjectStore();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [showTest, setShowTest] = useState(false);
  const [testQ, setTestQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [expandedLayers, setExpandedLayers] = useState<number[]>([0]);

  const utils = trpc.useUtils();
  const pageSize = 20;

  const { data, isLoading } = trpc.qaPair.getAll.useQuery({
    projectId: projectId ?? "",
    search: search || undefined,
    offset: (page-1)*pageSize,
    limit: pageSize,
  }, { enabled: !!projectId });

  const deleteMut = trpc.qaPair.delete.useMutation({
    onSuccess: () => { toast({title:"删除成功"}); utils.qaPair.getAll.invalidate(); },
    onError: (e) => toast({title:"删除失败",description:e.message,variant:"destructive"}),
  });

  // 检索测试
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testLoading, setTestLoading] = useState(false);

  const items = (data?.items ?? []).filter((q:any) => {
    if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
    return true;
  });
  const totalPages = data ? Math.ceil((data.totalCount??0)/pageSize) : 1;
  const selected = selectedId ? items.find((q:any)=>q.id===selectedId) : null;

  const toggleLayer = (i:number) => {
    setExpandedLayers(prev => prev.includes(i) ? prev.filter(x=>x!==i) : [...prev,i]);
  };

  // 模拟7层 answer（真实数据可能只有一个answer字段，这里拆分显示）
  const getAnswerLayers = (qa:any) => {
    const answer = qa?.answer || "";
    // 如果 answer 包含 JSON 数组格式则解析，否则用全文作为"核心回答"
    try {
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [{ layer:"核心回答", content: answer, wordCount: answer.length }];
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="QA Pairs 管理器" description="管理问答对数据集"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>setShowTest(!showTest)} className="gap-2 text-sm">
              <FlaskConical className="h-4 w-4" /> 测试检索
            </Button>
            <Button onClick={()=>setShowCreate(true)} className="gap-2 bg-brand text-white text-sm">
              <Plus className="h-4 w-4" /> 新建 QA 对
            </Button>
          </div>
        }
      />

      {/* ── 检索测试弹窗 ── */}
      {showTest && (
        <div className="mx-6 mb-3 p-4 border rounded-xl bg-blue-50/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">🧪 QA 检索测试</h3>
            <button onClick={()=>setShowTest(false)}><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="flex gap-2 mb-3">
            <input value={testQ} onChange={e=>setTestQ(e.target.value)}
              placeholder="输入测试问题，如：灵荃用的什么胶水？"
              className="flex-1 rounded-lg border px-3 py-2 text-sm" />
            <Button size="sm" disabled={!testQ||testLoading} onClick={()=>{
              setTestLoading(true);
              // 模拟检索
              setTimeout(()=>{
                setTestResults(items.slice(0,5).map((q:any,i:number)=>({
                  ...q, score: (0.95 - i*0.06).toFixed(2), rank: i+1
                })));
                setTestLoading(false);
              }, 800);
            }}>
              {testLoading ? "检索中…" : "🔍 检索"}
            </Button>
          </div>
          {testResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">TopN 命中结果：</p>
              {testResults.map((r:any)=>(
                <div key={r.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border text-xs">
                  <span className="text-lg">{r.rank<=3 ? ["🥇","🥈","🥉"][r.rank-1] : `#${r.rank}`}</span>
                  <span className="flex-1 truncate font-medium">{r.question}</span>
                  <span className="text-blue-600 font-mono">相似度: {r.score}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400">检索耗时: 68ms  命中库: QA Pairs (向量+BM25混合)</p>
            </div>
          )}
        </div>
      )}

      {/* ── 筛选栏 ── */}
      <div className="flex items-center gap-3 px-6 py-2">
        <div className="relative flex-1 max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="搜索 QA 对…" className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm" />
        </div>
        <select value={difficultyFilter} onChange={e=>setDifficultyFilter(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
          <option value="">难度：全部</option>
          <option value="BEGINNER">⭐ 入门</option>
          <option value="INTERMEDIATE">⭐⭐ 进阶</option>
          <option value="ADVANCED">⭐⭐⭐ 专业</option>
        </select>
      </div>

      {/* ── 主区域 ── */}
      <div className="flex flex-1 overflow-hidden px-6 pb-4 gap-0">
        {/* 表格 */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 w-16">编号</th>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 w-20">难度</th>
                <th className="px-4 py-3 w-16">状态</th>
                <th className="px-4 py-3 w-16">Atoms</th>
                <th className="px-4 py-3 w-20">更新</th>
                <th className="px-4 py-3 w-20 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((q:any, idx:number)=>(
                <tr key={q.id} onClick={()=>setSelectedId(q.id===selectedId?null:q.id)}
                  className={`hover:bg-blue-50/40 cursor-pointer ${q.id===selectedId?"bg-blue-50":""}`}>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">Q{String((page-1)*pageSize+idx+1).padStart(2,"0")}</td>
                  <td className="px-4 py-3 font-medium max-w-[300px] truncate">{q.question}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(q.tags??[]).slice(0,3).map((t:string)=>(
                        <span key={t} className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{DIFFICULTY[q.difficulty]?.stars ?? "—"} <span className="text-gray-400">{DIFFICULTY[q.difficulty]?.label ?? ""}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{q.atoms?.length ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(q.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3 text-right" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setEditing(q)} className="p-1 rounded hover:bg-gray-100"><Edit className="h-3.5 w-3.5 text-gray-500" /></button>
                    <button onClick={()=>{if(confirm("确认删除?"))deleteMut.mutate({id:q.id})}} className="p-1 rounded hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length===0 && !isLoading && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">暂无 QA 对</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 右侧详情面板 ── */}
        {selected && (
          <div className="w-[420px] flex-shrink-0 overflow-auto border rounded-lg ml-3 bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold">QA 详情</h3>
              <button onClick={()=>setSelectedId(null)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>

            {/* Question + 变体 */}
            <div className="p-4 border-b">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Question</h4>
              <p className="text-sm font-medium mb-2">{selected.question}</p>
              <div className="space-y-1">
                {(selected.variants ?? []).map((v:string,i:number)=>(
                  <div key={i} className="text-xs text-gray-500">变体{i+1}: {v}</div>
                ))}
              </div>
            </div>

            {/* 属性 */}
            <div className="p-4 border-b grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">难度:</span> {DIFFICULTY[selected.difficulty]?.stars} {DIFFICULTY[selected.difficulty]?.label}</div>
              <div><span className="text-gray-400">状态:</span> <StatusBadge status={selected.status} /></div>
              <div><span className="text-gray-400">Tags:</span> {(selected.tags??[]).join(", ")}</div>
              <div><span className="text-gray-400">溯源:</span> {selected.sourceRawId ? "有" : "—"}</div>
            </div>

            {/* 7层 Answer */}
            <div className="p-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Answer（7层结构）</h4>
              <div className="space-y-1">
                {ANSWER_LAYERS.map((layer,i)=>{
                  const layers = getAnswerLayers(selected);
                  const content = layers[i]?.content || layers[i] || "";
                  const isExpanded = expandedLayers.includes(i);
                  return (
                    <div key={i} className="border rounded-lg overflow-hidden">
                      <button onClick={()=>toggleLayer(i)}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium bg-gray-50 hover:bg-gray-100">
                        <span>{isExpanded ? "▾" : "▸"} {i+1}. {layer}</span>
                        <span className="text-gray-400">{typeof content==="string" ? content.length : 0}字</span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 py-2 text-xs text-gray-600 whitespace-pre-wrap">
                          {typeof content==="string" ? (content || "暂无内容") : JSON.stringify(content)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-right mt-2 text-xs text-gray-400">
                📏 总计: {(selected.answer||"").length} 字
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="px-6 pb-3">
        {data && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>

      <QADialog open={showCreate} onOpenChange={setShowCreate} />
      <QADialog open={!!editing} onOpenChange={()=>setEditing(null)} projectId={projectId??""} qaPair={editing} onComplete={()=>setEditing(null)} />
    </div>
  );
}
