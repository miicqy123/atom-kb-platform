import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "草稿", className: "bg-gray-100 text-gray-600" },
  TESTING: { label: "测试中", className: "bg-blue-100 text-blue-700" },
  ACTIVE: { label: "生效中", className: "bg-green-100 text-green-700" },
  ARCHIVED: { label: "已归档", className: "bg-yellow-100 text-yellow-700" },
  CONFIGURING: { label: "配置中", className: "bg-gray-100 text-gray-600" },
  ONLINE: { label: "已上线", className: "bg-green-100 text-green-700" },
  DEPRECATED: { label: "已废弃", className: "bg-red-100 text-red-600" },
  PENDING: { label: "待处理", className: "bg-yellow-100 text-yellow-700" },
  CONVERTING: { label: "转换中", className: "bg-blue-100 text-blue-700" },
  CONVERTED: { label: "已转换", className: "bg-green-100 text-green-700" },
  FAILED: { label: "失败", className: "bg-red-100 text-red-600" },
  RUNNING: { label: "运行中", className: "bg-blue-100 text-blue-700" },
  SUCCESS: { label: "成功", className: "bg-green-100 text-green-700" },
  DEGRADED: { label: "降级", className: "bg-orange-100 text-orange-700" },
  HUMAN_TAKEOVER: { label: "人工接管", className: "bg-purple-100 text-purple-700" },
  REVIEW: { label: "审核中", className: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "已审核", className: "bg-green-100 text-green-700" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>;
}