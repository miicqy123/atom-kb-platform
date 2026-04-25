'use client';

import { Button } from '@/components/ui/Button';

const TASK_TYPE_MAP: Record<string, string> = {
  SHORT_VIDEO: '短视频文案', MOMENTS: '朋友圈文案', SALES_TALK: '销售话术',
  LIVE_TALK: '直播话术', BRAND_STORY: '品牌故事', IMAGE_PROMPT: '做图提示词',
  ANALYSIS: '选题分析', GENERAL: '通用', CUSTOM: '自定义',
};

const PLATFORM_MAP: Record<string, string> = {
  DOUYIN: '抖音', XIAOHONGSHU: '小红书', SHIPINHAO: '视频号',
  WECHAT_MOMENTS: '朋友圈', GENERAL: '通用',
};

const AUDIENCE_MAP: Record<string, string> = {
  BOSS: '企业老板', EXECUTOR: '执行者', CONSUMER: 'C端消费者', GENERAL: '通用',
};

const STATUS_MAP: Record<string, { icon: string; label: string; color: string }> = {
  pending: { icon: '⏳', label: '待处理', color: 'text-gray-500' },
  processing: { icon: '🔄', label: '处理中', color: 'text-blue-500' },
  done: { icon: '✅', label: '完成', color: 'text-green-500' },
  failed: { icon: '❌', label: '失败', color: 'text-red-500' },
};

interface TaskItem {
  id: string;
  description: string;
  type: string;
  platform: string;
  audience: string;
  status: string;
  createdAt: string;
  prompt?: { id: string; score?: number | null; status?: string } | null;
}

interface TaskTableProps {
  items: TaskItem[];
  loading?: boolean;
  onViewDetail: (id: string) => void;
}

export function TaskTable({ items, loading, onViewDetail }: TaskTableProps) {
  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">加载中...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg mb-1">📋</p>
        <p className="text-sm">暂无任务，点击右上角「新建任务」开始</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr className="text-left text-xs text-gray-500">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">任务描述</th>
            <th className="px-4 py-3 font-medium">任务类型</th>
            <th className="px-4 py-3 font-medium">平台</th>
            <th className="px-4 py-3 font-medium">受众</th>
            <th className="px-4 py-3 font-medium">状态</th>
            <th className="px-4 py-3 font-medium">评分</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((task, i) => {
            const st = STATUS_MAP[task.status] || STATUS_MAP.pending;
            return (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                <td className="px-4 py-3 text-xs font-medium max-w-[240px] truncate">{task.description}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{TASK_TYPE_MAP[task.type] || task.type}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{PLATFORM_MAP[task.platform] || task.platform}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{AUDIENCE_MAP[task.audience] || task.audience}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={st.color}>{st.icon} {st.label}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{task.prompt?.score ?? '--'}</td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm" onClick={() => onViewDetail(task.id)}>
                    查看
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
