"use client";
import { useState } from 'react';
import { PageHeader } from "@/components/ui/PageHeader";
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';

export default function QASearchPage() {
  const [query, setQuery] = useState('');
  const { projectId } = useProjectStore();
  const [mode, setMode] = useState<'qa' | 'atom' | 'hybrid'>('qa');

  // QA 关键词搜索
  const { data: qaResults, refetch: searchQA, isFetching: qaLoading } =
    trpc.qaPair.getAll.useQuery(
      { search: query, projectId: projectId ?? "", limit: 10 },
      { enabled: false }
    );

  // 向量语义搜索（原子块）
  const { data: vectorResults, refetch: searchVector, isFetching: vectorLoading } =
    trpc.vector.search.useQuery(
      { query, projectId, topK: 5 },
      { enabled: false }
    );

  // 混合检索
  const { data: hybridResults, refetch: searchHybrid, isFetching: hybridLoading } =
    trpc.vector.hybridSearch.useQuery(
      { query, projectId, topK: 10 },
      { enabled: false }
    );

  const handleSearch = () => {
    if (mode === 'qa') searchQA();
    else if (mode === 'atom') searchVector();
    else searchHybrid();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="知识检索" description="关键词搜 QA 对 / 语义搜原子块 / 混合检索" />

      {/* 搜索栏 */}
      <div className="flex gap-3 mt-6">
        <select
          value={mode}
          onChange={e => setMode(e.target.value as any)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="qa">QA 关键词</option>
          <option value="atom">向量语义</option>
          <option value="hybrid">混合检索（BM25 + 向量）</option>
        </select>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder={
            mode === 'qa' ? '输入关键词搜索问答对…' :
            mode === 'atom' ? '输入语义描述搜索原子块…' :
            '输入查询进行混合检索（BM25 + 向量）…'
          }
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || qaLoading || vectorLoading || hybridLoading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
        >
          {qaLoading || vectorLoading || hybridLoading ? '搜索中…' : '搜索'}
        </button>
      </div>

      {/* QA 结果 */}
      {mode === 'qa' && qaResults && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-500">{qaResults.items?.length || 0} 条结果</p>
          {qaResults.items?.map((qa: any) => (
            <div key={qa.id} className="border rounded-xl p-5 bg-white">
              <p className="font-medium text-sm mb-2">❓ {qa.question}</p>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-5">{qa.answer}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{qa.difficulty}</span>
                {qa.tags?.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 向量结果 */}
      {mode === 'atom' && vectorResults && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-500">{vectorResults.length} 条语义匹配结果</p>
          {vectorResults.map((r: any) => (
            <div key={r.id} className="border rounded-xl p-5 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-mono">
                  相似度 {(r.score * 100).toFixed(1)}%
                </span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {r.payload?.layer} 层
                </span>
                <span className="text-xs text-gray-400">
                  {r.payload?.slotMappings?.[0]}
                </span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{r.payload?.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 混合检索结果 */}
      {mode === 'hybrid' && hybridResults && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-500">{hybridResults.length} 条混合检索结果</p>
          {hybridResults.map((r: any) => (
            <div key={r.id} className="border rounded-xl p-5 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  r.source === 'both' ? 'bg-green-100 text-green-700' :
                  r.source === 'vector' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {r.source === 'both' ? '双路命中' : r.source === 'vector' ? '向量' : 'BM25'}
                </span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  {r.atom?.layer} · {r.atom?.slotMappings?.[0]}
                </span>
                <span className="text-xs text-gray-400 font-mono">RRF {r.score.toFixed(4)}</span>
              </div>
              <p className="text-sm font-medium">{r.atom?.title}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-3">{r.atom?.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}