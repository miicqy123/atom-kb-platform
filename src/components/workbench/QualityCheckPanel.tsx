'use client';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ClassificationBadge } from '../shared/ClassificationBadge';

interface Props {
  rawId: string;
}

type TabType = 'atom' | 'qa';
type ReviewFilter = 'all' | 'DRAFT' | 'PUBLISHED' | 'REJECTED';

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '待审', color: 'bg-yellow-100 text-yellow-800' },
  PUBLISHED: { label: '已通过', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: '已驳回', color: 'bg-red-100 text-red-800' },
};

export function QualityCheckPanel({ rawId }: Props) {
  const [tab, setTab] = useState<TabType>('atom');
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: atomStats, refetch: refetchAtom } = trpc.qualityCheck.getAtomQualityStats.useQuery(
    { rawId },
    { enabled: tab === 'atom' }
  );
  const { data: qaStats, refetch: refetchQA } = trpc.qualityCheck.getQAQualityStats.useQuery(
    { rawId },
    { enabled: tab === 'qa' }
  );

  const batchUpdate = trpc.qualityCheck.batchUpdateStatus.useMutation({
    onSuccess: () => {
      setSelectedIds([]);
      if (tab === 'atom') refetchAtom();
      else refetchQA();
    },
  });

  const singleUpdate = trpc.qualityCheck.updateItemStatus.useMutation({
    onSuccess: () => {
      if (tab === 'atom') refetchAtom();
      else refetchQA();
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBatch = (status: 'PUBLISHED' | 'REJECTED') => {
    if (selectedIds.length === 0) return;
    batchUpdate.mutate({ type: tab, ids: selectedIds, status });
  };

  // ── 原子块质检视图 ──
  const renderAtomTab = () => {
    if (!atomStats) return <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>;

    const filteredAtoms = filter === 'all'
      ? atomStats.atoms
      : atomStats.atoms.filter(a => a.status === filter);

    return (
      <div className="space-y-4">
        {/* 统计概览卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">🧱 总计</div>
            <div className="text-xl font-bold">{atomStats.total}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-gray-500">✅ 分类覆盖率</div>
            <div className="text-xl font-bold text-green-700">{atomStats.classificationRate}%</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="text-xs text-gray-500">⚠️ 过短（&lt;100字）</div>
            <div className="text-xl font-bold text-yellow-700">{atomStats.wordDist.tooShort}</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-gray-500">❌ 缺分类</div>
            <div className="text-xl font-bold text-red-700">{atomStats.missingCategory}</div>
          </div>
        </div>

        {/* 状态分布 */}
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">待审 {atomStats.statusDist.draft}</span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">已通过 {atomStats.statusDist.published}</span>
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">已驳回 {atomStats.statusDist.rejected}</span>
        </div>

        {/* 分类分布 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500 mb-2">📊 分类分布</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(atomStats.categoryDist).map(([cat, count]) => (
              <span key={cat} className="px-2 py-0.5 bg-white border rounded text-xs">
                {cat} <span className="font-bold">{count as number}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 过滤器 + 批量操作 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['all', 'DRAFT', 'PUBLISHED', 'REJECTED'] as ReviewFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelectedIds([]); }}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  filter === f ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? '全部' : STATUS_BADGE[f].label}
              </button>
            ))}
          </div>
          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <span className="text-xs text-gray-400">已选 {selectedIds.length} 条</span>
              <button
                onClick={() => handleBatch('PUBLISHED')}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                ✅ 批量通过
              </button>
              <button
                onClick={() => handleBatch('REJECTED')}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                ❌ 批量驳回
              </button>
            </div>
          )}
        </div>

        {/* 原子块列表 */}
        <div className="border rounded-xl divide-y max-h-[50vh] overflow-y-auto">
          {filteredAtoms.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400">暂无数据</div>
          )}
          {filteredAtoms.map(atom => {
            const badge = STATUS_BADGE[atom.status] || STATUS_BADGE.DRAFT;
            return (
              <div key={atom.id} className="px-4 py-3 hover:bg-gray-50 transition">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(atom.id)}
                    onChange={() => toggleSelect(atom.id)}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{atom.title}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${badge.color}`}>{badge.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{atom.wordCount ?? 0} 字</span>
                      {atom.layer && <span>{atom.layer} 层</span>}
                      <ClassificationBadge
                        category={atom.category}
                        subcategory={atom.subcategory}
                        compact={true}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {atom.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => singleUpdate.mutate({ type: 'atom', id: atom.id, status: 'PUBLISHED' })}
                        className="px-2 py-1 text-[10px] bg-green-50 text-green-700 rounded hover:bg-green-100"
                      >
                        通过
                      </button>
                    )}
                    {atom.status !== 'REJECTED' && (
                      <button
                        onClick={() => singleUpdate.mutate({ type: 'atom', id: atom.id, status: 'REJECTED' })}
                        className="px-2 py-1 text-[10px] bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        驳回
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── QA 质检视图 ──
  const renderQATab = () => {
    if (!qaStats) return <div className="p-8 text-center text-gray-400 text-sm">加载中...</div>;

    const filteredQA = filter === 'all'
      ? qaStats.qaPairs
      : qaStats.qaPairs.filter(q => q.status === filter);

    return (
      <div className="space-y-4">
        {/* 统计概览 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">❓ 总计</div>
            <div className="text-xl font-bold">{qaStats.total}</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="text-xs text-gray-500">⚠️ 答案过短（&lt;200字）</div>
            <div className="text-xl font-bold text-yellow-700">{qaStats.answerWordDist.shortAnswer}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-500">📏 答案正常</div>
            <div className="text-xl font-bold text-blue-700">{qaStats.answerWordDist.normalAnswer}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-xs text-gray-500">📚 答案较长（&gt;800字）</div>
            <div className="text-xl font-bold text-purple-700">{qaStats.answerWordDist.longAnswer}</div>
          </div>
        </div>

        {/* 难度分布 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500 mb-2">🎯 难度分布</div>
          <div className="flex gap-2">
            {Object.entries(qaStats.difficultyDist).map(([diff, count]) => (
              <span key={diff} className="px-2 py-0.5 bg-white border rounded text-xs">
                {diff} <span className="font-bold">{count as number}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 过滤器 + 批量操作（与原子块相同） */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['all', 'DRAFT', 'PUBLISHED', 'REJECTED'] as ReviewFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelectedIds([]); }}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  filter === f ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? '全部' : STATUS_BADGE[f].label}
              </button>
            ))}
          </div>
          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <span className="text-xs text-gray-400">已选 {selectedIds.length} 条</span>
              <button
                onClick={() => handleBatch('PUBLISHED')}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                ✅ 批量通过
              </button>
              <button
                onClick={() => handleBatch('REJECTED')}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                ❌ 批量驳回
              </button>
            </div>
          )}
        </div>

        {/* QA 列表 */}
        <div className="border rounded-xl divide-y max-h-[50vh] overflow-y-auto">
          {filteredQA.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400">暂无数据</div>
          )}
          {filteredQA.map(qa => {
            const badge = STATUS_BADGE[qa.status] || STATUS_BADGE.DRAFT;
            return (
              <div key={qa.id} className="px-4 py-3 hover:bg-gray-50 transition">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(qa.id)}
                    onChange={() => toggleSelect(qa.id)}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Q: {qa.question}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${badge.color}`}>{badge.label}</span>
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2 mb-1">
                      A: {qa.answer.slice(0, 150)}...
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{qa.answerWordCount ?? 0} 字</span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded">{qa.difficulty || '?'}</span>
                      {qa.tags && (qa.tags as string[]).slice(0, 3).map(t => (
                        <span key={t} className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {qa.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => singleUpdate.mutate({ type: 'qa', id: qa.id, status: 'PUBLISHED' })}
                        className="px-2 py-1 text-[10px] bg-green-50 text-green-700 rounded hover:bg-green-100"
                      >
                        通过
                      </button>
                    )}
                    {qa.status !== 'REJECTED' && (
                      <button
                        onClick={() => singleUpdate.mutate({ type: 'qa', id: qa.id, status: 'REJECTED' })}
                        className="px-2 py-1 text-[10px] bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        驳回
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <span className="font-semibold text-sm">质量检查</span>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => { setTab('atom'); setFilter('all'); setSelectedIds([]); }}
          className={`flex-1 px-3 py-1.5 text-xs rounded-md transition ${
            tab === 'atom' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🧱 原子块质检
        </button>
        <button
          onClick={() => { setTab('qa'); setFilter('all'); setSelectedIds([]); }}
          className={`flex-1 px-3 py-1.5 text-xs rounded-md transition ${
            tab === 'qa' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ❓ QA 对质检
        </button>
      </div>

      {tab === 'atom' ? renderAtomTab() : renderQATab()}
    </div>
  );
}
