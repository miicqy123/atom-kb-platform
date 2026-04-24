"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { formatDateTime } from "@/lib/utils";
import { Activity, Eye, Edit, Trash2, Filter, Download, Clock, User, Server, Lock } from "lucide-react";

const ACTION_TYPES = ["ALL", "CREATE", "READ", "UPDATE", "DELETE", "EXECUTE", "AUTH_FAIL"];
const RESOURCE_TYPES = ["ALL", "USER", "PROJECT", "WORKFLOW", "BLUEPRINT", "CONFIG", "INTEGRATION", "POLICY", "ATOM", "QA_PAIR", "RAW_MATERIAL"];
const STATUS_OPTIONS = ["ALL", "SUCCESS", "FAILURE"];

export default function AuditLogPage() {
  const { projectId } = useProjectStore();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // 使用真实的审计日志数据
  const { data, isLoading } = trpc.auditLog.list.useQuery({
    page,
    ...(actionFilter !== "ALL" && { entityType: actionFilter }),
    ...(resourceFilter !== "ALL" && { entityType: resourceFilter }),
    // 我们可以进一步扩展过滤选项
  });

  const columns: Column<any>[] = [
    { key: "createdAt", label: "时间", render: (e) => <span className="text-xs">{formatDateTime(new Date(e.createdAt))}</span> },
    { key: "userId", label: "用户", render: (e) => <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-400" /><span className="text-xs">{e.user?.name || e.userId}</span></div> },
    { key: "action", label: "操作", render: (e) => (
      <Badge variant={e.action === "CREATE" ? "default" : e.action === "READ" ? "secondary" : e.action === "UPDATE" ? "outline" : e.action === "DELETE" ? "destructive" : e.action === "AUTH_FAIL" ? "destructive" : "default"}>
        {e.action}
      </Badge>
    )},
    { key: "entityType", label: "资源类型", render: (e) => <span className="text-xs font-mono text-purple-600">{e.entityType}</span> },
    { key: "entityId", label: "资源ID", render: (e) => e.entityId ? <span className="font-mono text-xs text-gray-500">{e.entityId.substring(0, 8)}…</span> : <span className="text-xs text-gray-400">-</span> },
    { key: "changeSummary", label: "详情", render: (e) => <span className="text-xs max-w-xs truncate" title={e.changeSummary}>{e.changeSummary}</span> },
    { key: "ipAddress", label: "IP地址", render: (e) => e.ipAddress ? <span className="text-xs font-mono">{e.ipAddress}</span> : <span className="text-xs text-gray-400">-</span> },
    { key: "status", label: "状态", render: (e) => <Badge variant={e.status === "SUCCESS" ? "success" : "destructive"}>{e.status}</Badge> },
  ];

  // 模拟统计数据
  const mockStats = {
    totalEvents: 12847,
    securityEvents: 24,
    activeUsers: 36,
    todayVisits: 1456,
  };

  return (
    <div>
      <PageHeader
        title="审计日志"
        description="记录所有系统操作、访问和变更的完整审计轨迹"
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              <Download className="h-4 w-4" />导出
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">总事件数</h3>
          </div>
          <p className="text-2xl font-bold">{mockStats.totalEvents.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" /> +12% vs last week
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">安全事件</h3>
          </div>
          <p className="text-2xl font-bold">{mockStats.securityEvents}</p>
          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <Server className="h-3 w-3" /> 3 failures
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">活跃用户</h3>
          </div>
          <p className="text-2xl font-bold">{mockStats.activeUsers}</p>
          <p className="text-xs text-gray-500">from 24 unique IPs</p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">今日访问</h3>
          </div>
          <p className="text-2xl font-bold">{mockStats.todayVisits.toLocaleString()}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Edit className="h-3 w-3" /> 89% successful
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-6">
          <SearchInput
            placeholder="搜索用户、操作、资源或IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="col-span-2">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {ACTION_TYPES.map(type => (
              <option key={type} value={type}>{type === "ALL" ? "所有操作" : type}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <select
            value={resourceFilter}
            onChange={e => setResourceFilter(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {RESOURCE_TYPES.map(type => (
              <option key={type} value={type}>{type === "ALL" ? "所有资源" : type}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>{status === "ALL" ? "所有状态" : status}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyMessage="没有找到匹配的审计日志"
      />

      <Pagination
        page={page}
        totalPages={Math.ceil((data?.total ?? 0) / 50)}
        onChange={setPage}
      />
    </div>
  );
}