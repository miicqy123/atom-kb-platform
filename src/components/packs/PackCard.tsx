'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Edit } from 'lucide-react';
import { TASK_TYPE_MAP, PLATFORM_MAP, AUDIENCE_MAP } from '@/lib/taskMaps';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-200',
  TESTING: 'bg-blue-100 text-blue-600 border-blue-200',
  ACTIVE: 'bg-green-100 text-green-600 border-green-200',
  ARCHIVED: 'bg-orange-100 text-orange-600 border-orange-200',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿', TESTING: '测试中', ACTIVE: '已激活', ARCHIVED: '已归档',
};

interface PackModuleItem {
  module: { id: string; name: string; atoms?: Array<{ atomId: string }> };
  order: number;
}

interface PackItem {
  id: string;
  name: string;
  description?: string | null;
  taskTypes: string[];
  platforms: string[];
  audiences: string[];
  status: string;
  modules: PackModuleItem[];
}

interface PackCardProps {
  pack: PackItem;
  onEdit: (id: string) => void;
  onTestRoute: (id: string) => void;
}

export function PackCard({ pack, onEdit, onTestRoute }: PackCardProps) {
  const totalAtoms = pack.modules.reduce((sum, pm) => sum + (pm.module.atoms?.length ?? 0), 0);

  return (
    <div className="rounded-xl border bg-white p-5 hover:shadow-md transition-shadow">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">📦</span>
          <h3 className="font-medium text-sm truncate">{pack.name}</h3>
        </div>
        <Badge variant="outline" className={STATUS_COLORS[pack.status] || 'bg-gray-100'}>
          {STATUS_LABELS[pack.status] || pack.status}
        </Badge>
      </div>

      {pack.description && (
        <p className="text-xs text-gray-500 mb-3">{pack.description}</p>
      )}

      {/* 路由条件 */}
      <div className="mb-3">
        <p className="text-[10px] text-gray-400 mb-1.5">路由条件：</p>
        <div className="space-y-1">
          {pack.taskTypes.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 w-14 shrink-0">任务类型：</span>
              <div className="flex flex-wrap gap-1">
                {pack.taskTypes.map(t => (
                  <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
                    {TASK_TYPE_MAP[t] || t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {pack.platforms.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 w-14 shrink-0">平台：</span>
              <div className="flex flex-wrap gap-1">
                {pack.platforms.map(p => (
                  <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-600 border-green-200">
                    {PLATFORM_MAP[p] || p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {pack.audiences.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 w-14 shrink-0">受众：</span>
              <div className="flex flex-wrap gap-1">
                {pack.audiences.map(a => (
                  <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-600 border-purple-200">
                    {AUDIENCE_MAP[a] || a}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {pack.taskTypes.length === 0 && pack.platforms.length === 0 && pack.audiences.length === 0 && (
            <p className="text-[10px] text-gray-300 italic">未设置路由条件</p>
          )}
        </div>
      </div>

      {/* 包含模块 */}
      <div className="mb-4">
        <p className="text-[10px] text-gray-400 mb-1.5">
          包含 {pack.modules.length} 个模块，共 {totalAtoms} 个原子块：
        </p>
        <div className="space-y-1">
          {pack.modules.map((pm, i) => {
            const atomCount = pm.module.atoms?.length ?? 0;
            return (
              <div key={pm.module.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="text-gray-300">{i + 1}.</span>
                <span className="truncate">{pm.module.name}</span>
                <span className="text-[10px] text-gray-400">({atomCount} 原子块)</span>
              </div>
            );
          })}
          {pack.modules.length === 0 && (
            <p className="text-[10px] text-gray-300 italic">暂无模块</p>
          )}
        </div>
      </div>

      {/* 操作 */}
      <div className="flex items-center gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" onClick={() => onEdit(pack.id)} className="flex-1">
          <Edit className="h-3 w-3 mr-1" /> 编辑
        </Button>
        <Button variant="outline" size="sm" onClick={() => onTestRoute(pack.id)}>
          测试匹配
        </Button>
      </div>
    </div>
  );
}
