// src/components/layout/ProjectSwitcher.tsx
"use client";
import { trpc } from '@/lib/trpc';
import { useProjectStore } from '@/stores/projectStore';

export function ProjectSwitcher() {
  const { projectId, projectName, setProject } = useProjectStore();
  const { data: userData } = trpc.user.getCurrent.useQuery();
  const workspaceId = userData?.workspaces?.[0]?.workspaceId || '';

  const { data } = trpc.project.list.useQuery(
    { workspaceId, limit: 50 },
    { enabled: !!workspaceId }
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">项目：</span>
      <select
        value={projectId}
        onChange={e => {
          const selected = data?.items?.find(p => p.id === e.target.value);
          if (selected) setProject(selected.id, selected.name, workspaceId);
        }}
        className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-[180px] truncate"
      >
        <option value="">选择项目</option>
        {data?.items?.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {projectName && (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded truncate max-w-[100px]">
          {projectName}
        </span>
      )}
    </div>
  );
}