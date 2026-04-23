"use client";

import { useState } from "react";
import { ChevronDown, FolderKanban } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";

export function ProjectSwitcher() {
  const { currentProject, projects, setCurrentProject } = useProjectStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
        <FolderKanban className="h-4 w-4 text-brand" />
        <span className="font-medium">{currentProject?.name ?? "选择 Project"}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border bg-white py-1 shadow-lg">
          {projects.map((p) => (
            <button key={p.id} onClick={() => { setCurrentProject(p); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100">
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}