"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, ChevronDown, User as UserIcon, Settings, LogOut } from "lucide-react";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export function Header() {
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <ProjectSwitcher />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="全局搜索（Raw / Atoms / QA / Blueprint）"
            className="h-9 min-w-[300px] rounded-lg border bg-gray-50 pl-9 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hidden sm:block">
            ⌘K
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 relative" ref={notificationDropdownRef}>
        <div className="relative">
          <button
            className="relative rounded-lg p-2 hover:bg-gray-100"
            onClick={() => setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen)}
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadNotifications > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadNotifications}
              </Badge>
            )}
          </button>

          {isNotificationsDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 p-0">
              <div className="p-4">
                <h3 className="font-semibold mb-2">通知</h3>
                {unreadNotifications > 0 ? (
                  <div className="space-y-2">
                    <div className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <p className="font-medium">新的评估记录待处理</p>
                      <p className="text-xs text-gray-500">2分钟前</p>
                    </div>
                    <div className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <p className="font-medium">工作流运行完成</p>
                      <p className="text-xs text-gray-500">1小时前</p>
                    </div>
                    <div className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <p className="font-medium">系统更新通知</p>
                      <p className="text-xs text-gray-500">今天</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">暂无通知</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userDropdownRef}>
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 cursor-pointer"
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
          >
            <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-sm font-medium">管</div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50 p-0">
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand text-sm font-medium">管</div>
                  <div>
                    <p className="font-medium">管理员</p>
                    <Badge variant="secondary" className="mt-1">超级管理员</Badge>
                  </div>
                </div>
              </div>
              <div className="p-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded">
                  <UserIcon className="h-4 w-4" />
                  个人设置
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded">
                  <Settings className="h-4 w-4" />
                  系统设置
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded text-red-600">
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}