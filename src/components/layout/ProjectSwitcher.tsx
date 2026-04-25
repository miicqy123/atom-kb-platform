"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, FolderKanban, Plus, Loader2 } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

export function ProjectSwitcher() {
  const { currentProject, setCurrentProject, setProjects } = useProjectStore();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ 修复1: 移除 onSuccess，改用 useEffect 处理副作用
  const { data: projects, isLoading, refetch } = trpc.project.list.useQuery(undefined);

  useEffect(() => {
    if (projects && projects.length > 0) {
      setProjects(projects.map((p: any) => ({ id: p.id, name: p.name, workspaceId: p.workspaceId })));
      // 如果还没选中项目，自动选第一个
      if (!currentProject) {
        setCurrentProject({ id: projects[0].id, name: projects[0].name, workspaceId: projects[0].workspaceId });
      }
    }
  }, [projects]);

  // 创建项目
  const createProject = trpc.project.create.useMutation({
    onSuccess: (newProject) => {
      // ✅ useMutation 的 onSuccess 在 v5 中仍然支持
      setCurrentProject({ id: newProject.id, name: newProject.name, workspaceId: newProject.workspaceId });
      setNewName("");
      setShowCreate(false);
      refetch();
    },
  });

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }

    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
      >
        <FolderKanban className="h-4 w-4 text-blue-600" />
        <span>{currentProject?.name ?? "选择 Project"}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border bg-white py-1 shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : (
            <>
              {(projects ?? []).length === 0 && !showCreate && (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  暂无项目，请先创建
                </div>
              )}
              <div className="max-h-60 overflow-y-auto">
                {(projects ?? []).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentProject({ id: p.id, name: p.name, workspaceId: p.workspaceId });
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                      currentProject?.id === p.id ? "bg-blue-50 text-blue-600 font-medium" : ""
                    }`}
                  >
                    <FolderKanban className="h-3.5 w-3.5" />
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="border-t mt-1 pt-1">
            {showCreate ? (
              <div className="px-3 py-2 space-y-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="输入项目名称…"
                  className="w-full rounded border px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) {
                      createProject.mutate({ name: newName.trim() });
                    }
                    if (e.key === "Escape") {
                      setShowCreate(false);
                      setNewName("");
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (newName.trim()) createProject.mutate({ name: newName.trim() }); }}
                    disabled={!newName.trim() || createProject.isPending}
                    className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {/*✅ 修复2: isLoading → isPending*/}
                    {createProject.isPending ? "创建中…" : "创建"}
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setNewName(""); }}
                    className="rounded border px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
                {createProject.isError && (
                  <p className="text-xs text-red-500">{createProject.error.message}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                新建项目
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}