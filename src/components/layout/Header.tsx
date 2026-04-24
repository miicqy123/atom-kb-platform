"use client";
import { useState } from "react";
import { Search, Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { ProjectSwitcher } from "./ProjectSwitcher";

export function Header() {
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);

  return (
    <header className="h-14 border-b bg-white flex items-center px-4 gap-4 relative z-20">
      <ProjectSwitcher />

      {/* 全局搜索 */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input placeholder="全局搜索… ⌘K"
          className="w-full h-9 rounded-lg border bg-gray-50 pl-9 pr-4 text-sm focus:ring-2 focus:ring-brand focus:outline-none focus:bg-white" />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* 通知铃铛 */}
        <div className="relative">
          <button onClick={() => { setShowNotif(!showNotif); setShowUser(false); }}
            className="relative p-2 rounded-lg hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b text-sm font-semibold">通知</div>
              <div className="px-4 py-6 text-center text-sm text-gray-400">暂无新通知</div>
            </div>
          )}
        </div>

        {/* 用户头像 */}
        <div className="relative">
          <button onClick={() => { setShowUser(!showUser); setShowNotif(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100">
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold">管</div>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>
          {showUser && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b">
                <div className="text-sm font-medium">管理员</div>
                <div className="text-xs text-gray-400">admin@atomkb.com</div>
                <span className="inline-flex mt-1 px-2 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full">超级管理员</span>
              </div>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <Settings className="h-4 w-4" /> 个人设置
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <User className="h-4 w-4" /> 切换角色
              </button>
              <div className="border-t mt-1 pt-1">
                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> 退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
