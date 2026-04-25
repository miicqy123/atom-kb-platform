'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Edit, Trash2 } from 'lucide-react';
import { CATEGORY_LABEL_MAP } from '@/lib/categoryMaps';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-200',
  TESTING: 'bg-blue-100 text-blue-600 border-blue-200',
  ACTIVE: 'bg-green-100 text-green-600 border-green-200',
  ARCHIVED: 'bg-orange-100 text-orange-600 border-orange-200',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿', TESTING: '测试中', ACTIVE: '已激活', ARCHIVED: '已归档',
};

interface ModuleAtom {
  atom: { id: string; title: string; category?: string | null };
}

interface ModuleItem {
  id: string;
  name: string;
  description?: string | null;
  applicableScenes: string[];
  status: string;
  atoms: ModuleAtom[];
}

interface ModuleCardProps {
  module: ModuleItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ModuleCard({ module, onEdit, onDelete }: ModuleCardProps) {
  const displayAtoms = module.atoms.slice(0, 5);
  const remaining = module.atoms.length - 5;

  return (
    <div className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow flex flex-col">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🧩</span>
          <h3 className="font-medium text-sm truncate">{module.name}</h3>
        </div>
        <Badge variant="outline" className={STATUS_COLORS[module.status] || 'bg-gray-100'}>
          {STATUS_LABELS[module.status] || module.status}
        </Badge>
      </div>

      {/* 描述 */}
      {module.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{module.description}</p>
      )}

      {/* 原子块列表 */}
      <div className="flex-1 mb-3">
        <p className="text-[10px] text-gray-400 mb-1.5">
          包含 {module.atoms.length} 个原子块：
        </p>
        <div className="space-y-1">
          {displayAtoms.map((ma, i) => (
            <div key={ma.atom.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="text-gray-300">{i + 1}.</span>
              <span className="truncate flex-1">{ma.atom.title}</span>
              {ma.atom.category && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
                  {CATEGORY_LABEL_MAP[ma.atom.category] || ma.atom.category}
                </Badge>
              )}
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-[10px] text-gray-400 pl-4">+{remaining} 更多</p>
          )}
          {module.atoms.length === 0 && (
            <p className="text-[10px] text-gray-300 italic">暂无原子块</p>
          )}
        </div>
      </div>

      {/* 适用场景 */}
      {module.applicableScenes && module.applicableScenes.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-gray-400 mb-1">适用：</p>
          <div className="flex flex-wrap gap-1">
            {module.applicableScenes.map(s => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 操作 */}
      <div className="flex items-center gap-2 pt-3 border-t">
        <Button variant="outline" size="sm" onClick={() => onEdit(module.id)} className="flex-1">
          <Edit className="h-3 w-3 mr-1" /> 编辑
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(module.id)}>
          <Trash2 className="h-3 w-3 text-red-500" />
        </Button>
      </div>
    </div>
  );
}
