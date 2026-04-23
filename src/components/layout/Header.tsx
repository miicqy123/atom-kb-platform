"use client";

import { Search, Bell, ChevronDown } from "lucide-react";
import { ProjectSwitcher } from "./ProjectSwitcher";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <ProjectSwitcher />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input placeholder="全局搜索（Raw / Atoms / QA / Blueprint）" className="h-9 w-80 rounded-lg border bg-gray-50 pl-9 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
        </button>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-sm font-medium">管</div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </header>
  );
}