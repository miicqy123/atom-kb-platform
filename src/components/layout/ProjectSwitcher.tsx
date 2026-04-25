"use client";
import { useEffect } from "react";
import { useState } from "react";
import { ChevronDown, FolderKanban } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

export function ProjectSwitcher() {
  const { currentProject, projects, setCurrentProject, setProjects } = useProjectStore();
  const [open, setOpen] = useState(false);
  const { data } = trpc.project.list.useQuery(undefined, {
    retry: false,
  });

  // 后端数据到达后同步到 Zustand store
  useEffect(() => {
    if (data && data.length > 0) {
      const mapped = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        workspaceId: p.workspaceId,
      }));
      setProjects(mapped);
      // 如果还没选中项目，自动选中第一个
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
        <span>{currentProject?.name ?? "选择项目"}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border bg-white py-1 shadow-lg">
          {projects.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              暂无项目，请先在企业后台创建
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
                  currentProject?.id === p.id
                    ? "bg-blue-50 text-brand font-medium"
                    : ""
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