"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, PenTool, Settings2, Shield, Building2, Star, Clock } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";

const NAV_SECTIONS = [
  {
    label: "知识中心", icon: BookOpen, color: "text-kc", basePath: "/knowledge",
    items: [
      { label: "Raw 素材管理", href: "/knowledge/raw" },
      { label: "知识加工工作台", href: "/knowledge/workbench" },
      { label: "原子块浏览器", href: "/knowledge/atoms" },
      { label: "模块管理", href: "/modules" },
      { label: "QA 数据集", href: "/knowledge/qa-pairs" },
      { label: "分类树与标签", href: "/knowledge/taxonomy" },
      { label: "映射视图", href: "/knowledge/mappings" },
      { label: "智能问答", href: "/knowledge/qa-search" },
    ],
  },
  {
    label: "提示词工厂", icon: PenTool, color: "text-pf", basePath: "/prompts",
    items: [
      { label: "蓝图库", href: "/prompts/blueprints" },
      { label: "任务管理", href: "/tasks" },
      { label: "评分诊断", href: "/prompts/evaluation" },
      { label: "底座包管理", href: "/prompts/base-packs" },
    ],
  },
  {
    label: "编排中心", icon: Settings2, color: "text-oc", basePath: "/orchestration",
    items: [
      { label: "Agent 列表", href: "/orchestration/agents" },
      { label: "Workflow 模板", href: "/orchestration/workflows" },
      { label: "运行记录", href: "/orchestration/runs" },
      { label: "HITL 审核队列", href: "/orchestration/review" },
    ],
  },
  {
    label: "治理中心", icon: Shield, color: "text-gc", basePath: "/governance",
    items: [
      { label: "可观测性大盘", href: "/governance/dashboard" },
      { label: "SLA 监控", href: "/governance/sla" },
      { label: "审计日志", href: "/governance/audit" },
      { label: "模型网关", href: "/governance/gateway" },
    ],
  },
  {
    label: "企业后台", icon: Building2, color: "text-admin", basePath: "/admin",
    items: [
      { label: "租户管理", href: "/admin/tenants" },
      { label: "Project 管理", href: "/admin/projects" },
      { label: "用户与角色", href: "/admin/users" },
      { label: "资产生命周期", href: "/admin/asset-lifecycle" },
      { label: "系统配置", href: "/admin/system-config" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentProject } = useProjectStore();

  return (
    <aside className="w-56 border-r bg-white flex flex-col h-full">
      <Link href="/" className="flex items-center gap-2 px-4 py-4 border-b hover:bg-gray-50">
        <span className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center text-xs font-bold">AK</span>
        <span className="font-semibold text-sm">Atom KB Platform</span>
      </Link>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <div className={cn("flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider", section.color)}>
              <section.icon className="h-4 w-4" />
              {section.label}
            </div>
            {section.items.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn(
                  "block px-4 py-1.5 pl-10 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-brand/5 text-brand font-medium border-r-2 border-brand"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Star className="h-3.5 w-3.5" /> 收藏
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" /> 最近访问
        </div>
        {currentProject?.id && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-[10px] text-gray-400 uppercase">Project</div>
            <div className="text-xs font-medium text-gray-700 truncate">{currentProject.id}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
