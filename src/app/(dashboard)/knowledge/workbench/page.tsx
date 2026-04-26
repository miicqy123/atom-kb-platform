'use client';
import { useState } from 'react';
import { RawFileCard } from '@/components/workbench/RawFileCard';
import { WorkbenchDrawer } from '@/components/workbench/WorkbenchDrawer';
import { WorkbenchDrawerContent } from '@/components/workbench/WorkbenchDrawerContent';
import { trpc } from '@/lib/trpc';
import { Upload, Search } from 'lucide-react';

export default function WorkbenchPage() {
  // TODO: 从 context/URL 获取 projectId
  const projectId = 'default';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [selectedRawId, setSelectedRawId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.raw.list.useQuery({
    projectId,
    search: search || undefined,
    status: statusFilter || undefined,
    experienceSource: sourceFilter || undefined,
  });

  const selectedRaw = data?.items.find(r => r.id === selectedRawId);

  return (
    <div className="p-6 space-y-4">
      {/* ── 顶部 Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">知识加工工作台</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? `${data.total} 个素材文件` : '加载中...'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          <Upload size={14} />
          导入素材
        </button>
      </div>

      {/* ── 筛选栏 ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文件名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg bg-white"
        >
          <option value="">全部状态</option>
          <option value="PENDING">待处理</option>
          <option value="UPLOADED">已上传</option>
          <option value="ATOM_DONE">原子完成</option>
          <option value="QA_DONE">QA完成</option>
          <option value="DUAL_DONE">全量完成</option>
          <option value="FAILED">失败</option>
        </select>

        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg bg-white"
        >
          <option value="">全部来源</option>
          <option value="E1_COMPANY">企业经验</option>
          <option value="E2_INDUSTRY">行业经验</option>
          <option value="E3_BOOK">书本经验</option>
        </select>
      </div>

      {/* ── 文件卡片网格 ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-4xl mb-3">📭</span>
          <span className="text-sm">暂无素材文件</span>
          <span className="text-xs mt-1">点击右上角「导入素材」开始</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data?.items.map(raw => (
            <RawFileCard
              key={raw.id}
              raw={raw as any}
              isSelected={selectedRawId === raw.id}
              onClick={() => setSelectedRawId(raw.id)}
            />
          ))}
        </div>
      )}

      {/* ── 侧滑抽屉 ── */}
      <WorkbenchDrawer
        isOpen={!!selectedRawId}
        onClose={() => setSelectedRawId(null)}
        title={selectedRaw?.originalFileName || '素材加工'}
      >
        {selectedRawId && (
          <WorkbenchDrawerContent
            rawId={selectedRawId}
            projectId={projectId}
            fileName={selectedRaw?.originalFileName || ''}
            experienceSource={selectedRaw?.experienceSource || null}
          />
        )}
      </WorkbenchDrawer>
    </div>
  );
}
