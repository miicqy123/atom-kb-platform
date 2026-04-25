"use client";
import { useEffect, useState } from "react";
import { ChevronDown, FolderKanban } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

export function ProjectSwitcher() {
  const { currentProject, projects, setCurrentProject, setProjects } = useProjectStore();
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = trpc.project.list.useQuery(undefined, {
    retry: 1,
  });

  useEffect(() => {
    if (data && data.length > 0) {
      const mapped = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        workspaceId: p.workspaceId,
      }));
      setProjects(mapped);
      if (!currentProject) {
        setCurrentProject(mapped[0]);
      }
    }
  }, [data]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        <FolderKanban className="h-4 w-4 text-brand" />
        <span>{isLoading ? "加载中…" : currentProject?.name ?? "选择项目"}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border bg-white py-1 shadow-lg">
          {error && (
            <p className="px-3 py-2 text-xs text-red-500">
              加载失败: {error.message}
            </p>
          )}
          {projects.length === 0 && !error ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              暂无项目，请访问 /api/dev-seed 初始化
            </p>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setCurrentProject(p);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  currentProject?.id === p.id ? "bg-blue-50 text-brand font-medium" : ""
                }`}
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}