'use client';
import { ClassificationBadge } from '@/components/shared/ClassificationBadge';

const FORMAT_ICONS: Record<string, string> = {
  MARKDOWN: '📝', PDF: '📕', DOCX: '📘', TXT: '📄', HTML: '🌐', CSV: '📊',
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: { label: '待处理', color: 'bg-gray-100 text-gray-600', icon: '⏳' },
  UPLOADED: { label: '已上传', color: 'bg-blue-100 text-blue-700', icon: '📥' },
  ATOM_PROCESSING: { label: '原子化中', color: 'bg-amber-50 text-amber-700', icon: '⚙️' },
  QA_PROCESSING: { label: 'QA生成中', color: 'bg-purple-50 text-purple-700', icon: '🔗' },
  DUAL_PROCESSING: { label: '全量加工中', color: 'bg-blue-50 text-blue-700', icon: '🚀' },
  ATOM_DONE: { label: '原子完成', color: 'bg-green-100 text-green-700', icon: '✅' },
  QA_DONE: { label: 'QA完成', color: 'bg-green-100 text-green-700', icon: '✅' },
  DUAL_DONE: { label: '全量完成', color: 'bg-green-100 text-green-700', icon: '✅' },
  FAILED: { label: '失败', color: 'bg-red-100 text-red-700', icon: '❌' },
};

interface RawItem {
  id: string;
  originalFileName: string | null;
  format: string;
  materialType: string;
  experienceSource: string | null;
  conversionStatus: string;
  processingMode: string | null;
  atomPipelineStatus: string | null;
  qaPipelineStatus: string | null;
  atomCount: number | null;
  qaCount: number | null;
  wordCount: number | null;
  createdAt: string;
}

interface Props {
  raw: RawItem;
  isSelected: boolean;
  onClick: () => void;
}

export function RawFileCard({ raw, isSelected, onClick }: Props) {
  const status = STATUS_MAP[raw.conversionStatus] || STATUS_MAP.PENDING;
  const formatIcon = FORMAT_ICONS[raw.format] || '📄';
  const isProcessing = raw.conversionStatus?.includes('PROCESSING');

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50/50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${isProcessing ? 'animate-pulse' : ''}`}
    >
      {/* 头部：图标 + 文件名 + 状态 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{formatIcon}</span>
          <span className="text-sm font-medium truncate">
            {raw.originalFileName || `素材 ${raw.id.slice(0, 6)}`}
          </span>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
          {status.icon} {status.label}
        </span>
      </div>

      {/* 分类标签 */}
      <div className="mt-2">
        <ClassificationBadge experienceSource={raw.experienceSource} compact />
      </div>

      {/* 底部统计 */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-400">
        {raw.wordCount != null && <span>📏 {raw.wordCount}字</span>}
        {raw.atomCount != null && raw.atomCount > 0 && <span>🧱 {raw.atomCount}块</span>}
        {raw.qaCount != null && raw.qaCount > 0 && <span>❓ {raw.qaCount}对</span>}
        {raw.processingMode && (
          <span className="ml-auto text-gray-300">
            {raw.processingMode === 'ATOM_ONLY' ? '原子' : raw.processingMode === 'QA_ONLY' ? 'QA' : '全量'}
          </span>
        )}
      </div>
    </button>
  );
}
