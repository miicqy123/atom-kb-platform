'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { trpc } from '@/lib/trpc';
import { TASK_TYPE_OPTIONS, PLATFORM_OPTIONS, AUDIENCE_OPTIONS, TASK_TYPE_MAP, PLATFORM_MAP, AUDIENCE_MAP } from '@/lib/taskMaps';

interface RouteTestPanelProps {
  projectId: string;
  preset?: { taskType: string; platform?: string; audience?: string } | null;
}

export default function RouteTestPanel({ projectId, preset }: RouteTestPanelProps) {
  const [testTaskType, setTestTaskType] = useState('');
  const [testPlatform, setTestPlatform] = useState('');
  const [testAudience, setTestAudience] = useState('');
  const [hasTested, setHasTested] = useState(false);

  // 接收预设值
  useEffect(() => {
    if (preset) {
      setTestTaskType(preset.taskType);
      setTestPlatform(preset.platform ?? '');
      setTestAudience(preset.audience ?? '');
    }
  }, [preset]);

  const matchQuery = trpc.pack.matchByRoute.useQuery({
    projectId,
    taskType: testTaskType,
    platform: testPlatform || undefined,
    audience: testAudience || undefined,
  }, { enabled: false });

  const handleTest = () => {
    if (!testTaskType) return;
    matchQuery.refetch().then(() => setHasTested(true));
  };

  const matchedPacks = matchQuery.data ?? [];

  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="text-sm font-medium mb-3">🧪 路由测试</h3>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">任务类型</label>
          <select
            value={testTaskType}
            onChange={e => setTestTaskType(e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">请选择</option>
            {TASK_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">平台</label>
          <select
            value={testPlatform}
            onChange={e => setTestPlatform(e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">不限</option>
            {PLATFORM_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">受众</label>
          <select
            value={testAudience}
            onChange={e => setTestAudience(e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">不限</option>
            {AUDIENCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={handleTest} disabled={!testTaskType || matchQuery.isFetching} className="w-full">
            {matchQuery.isFetching ? '匹配中...' : '测试匹配'}
          </Button>
        </div>
      </div>

      {/* 结果 */}
      {hasTested && (
        <div className="border rounded-lg p-3">
          {matchQuery.error ? (
            <p className="text-xs text-red-500">查询出错：{matchQuery.error.message}</p>
          ) : matchedPacks.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              <p className="text-2xl mb-1">🤷</p>
              <p className="text-xs">未匹配到场景包</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">匹配结果（{matchedPacks.length}）：</p>
              {matchedPacks.map(pack => {
                const totalAtoms = pack.modules.reduce(
                  (sum, pm) => sum + pm.module.atoms.length, 0
                );
                return (
                  <div key={pack.id} className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span>✅</span>
                    <span className="font-medium text-green-800">{pack.name}</span>
                    <span className="text-xs text-green-600">
                      → 共 {pack.modules.length} 个模块，{totalAtoms} 个原子块
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
