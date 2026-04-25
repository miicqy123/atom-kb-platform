"use client";
import { useEffect, useState, useRef } from "react";
import { ChevronDown, FolderKanban, Plus, Check, Loader2 } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

export function ProjectSwitcher() {
  const { currentProject, projects, setCurrentProject, setProjects } =
    useProjectStore();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, error, refetch } = trpc.project.list.useQuery(
    undefined,
    { retry: 1 }
  );

  const createProject = trpc.project.create.useMutation({
    onSuccess: (created) => {
      refetch();
      setCurrentProject({
        id: created.id,
        name: created.name,
        workspaceId: created.workspaceId,
      });
      setNewName("");
      setNewDesc("");
      setMode("list");
    },
  });

  // 后端数据同步到 Zustand
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

  // 切换到创建模式时自动聚焦输入框
  useEffect(() => {
    if (mode === "create" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setMode("list");
        setNewName("");
        setNewDesc("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject.mutate({
      name: newName.trim(),
      description: newDesc.trim() || undefined,
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => {
          setOpen(!open);
          if (open) {
            setMode("list");
            setNewName("");
            setNewDesc("");
          }
        }}
        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        <FolderKanban className="h-4 w-4 text-brand" />
        <span>
          {isLoading
            ? "加载中…"
            : currentProject?.name ?? "选择项目"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border bg-white shadow-lg animate-fade-in">
          {mode === "list" ? (
            <>
              {/* 项目列表 */}
              <div className="max-h-60 overflow-y-auto py-1">
                {error && (
                  <p className="px-3 py-2 text-xs text-red-500">
                    加载失败：{error.message}
                  </p>
                )}
                {!error && projects.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-gray-400">
                    暂无项目，请点击下方创建
                  </p>
                )}
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentProject(p);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      currentProject?.id === p.id
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-3.5 w-3.5 text-gray-400" />
                      <span
                        className={
                          currentProject?.id === p.id
                            ? "font-medium text-brand"
                            : "text-gray-700"
                        }
                      >
                        {p.name}
                      </span>
                    </div>
                    {currentProject?.id === p.id && (
                      <Check className="h-4 w-4 text-brand" />
                    )}
                  </button>
                ))}
              </div>

              {/* 新建按钮 */}
              <div className="border-t px-2 py-2">
                <button
                  onClick={() => setMode("create")}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" />
                  新建项目
                </button>
              </div>
            </>
          ) : (
            /* 新建项目表单 */
            <div className="p-3 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">
                新建项目
              </h4>
              <div>
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") {
                      setMode("list");
                      setNewName("");
                      setNewDesc("");
                    }
                  }}
                  placeholder="项目名称（必填）"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  placeholder="项目描述（选填）"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              {createProject.error && (
                <p className="text-xs text-red-500">
                  {createProject.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setMode("list");
                    setNewName("");
                    setNewDesc("");
                  }}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={
                    !newName.trim() || createProject.isLoading
                  }
                  className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {createProject.isLoading && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {createProject.isLoading ? "创建中…" : "创建"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}