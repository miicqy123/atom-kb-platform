"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, PenTool, Settings2, Shield, Building2, Star, Clock } from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "知识中心", icon: BookOpen, color: "text-kc", basePath: "/knowledge",
    items: [
      { label: "Raw 素材管理", href: "/knowledge/raw" },
      { label: "知识加工工作台", href: "/knowledge/workbench" },
      { label: "原子块浏览器", href: "/knowledge/atoms" },
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
      { label: "多角色元编排", href: "/orchestration/multi-agent" },
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
      { label: "Workspace", href: "/admin/workspaces" },
      { label: "Project 管理", href: "/admin/projects" },
      { label: "用户与角色", href: "/admin/users" },
      { label: "资产生命周期", href: "/admin/lifecycle" },
      { label: "系统配置", href: "/admin/settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r bg-white">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">AK</div>
        <span className="font-semibold text-sm">Atom KB Platform</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <div className={cn("flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider", section.color)}>
              <section.icon className="h-4 w-4" />{section.label}
            </div>
            {section.items.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn("block px-4 py-1.5 pl-10 text-sm transition-colors hover:bg-gray-100",
                  pathname === item.href && "bg-blue-50 text-brand font-medium"
                )}>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t p-3 space-y-1">
        <Link href="#" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800"><Star className="h-3.5 w-3.5" />收藏</Link>
        <Link href="#" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800"><Clock className="h-3.5 w-3.5" />最近访问</Link>
      </div>
    </aside>
  );
}