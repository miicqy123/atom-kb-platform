"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Search, Play, Settings2, Trash2, MoreVertical, FileText, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const MODE_STYLE: Record<string, { label: string; cls: string }> = {
  DAG: { label: "DAG 流图", cls: "bg-blue-100 text-blue-700" },
  REACT: { label: "ReAct", cls: "bg-purple-100 text-purple-700" },
  ROLE_COLLABORATION: { label: "角色协作", cls: "bg-orange-100 text-orange-700" },
  STATEFUL_GRAPH: { label: "有状态图", cls: "bg-green-100 text-green-700" },
};

const STATUS_OPTIONS = [
{ value: "", label: "全部状态" },
{ value: "DRAFT", label: "草稿" },
{ value: "CONFIGURING", label: "配置中" },
{ value: "REVIEW", label: "审核中" },
{ value: "APPROVED", label: "已审核" },
{ value: "TESTING", label: "测试中" },
{ value: "ONLINE", label: "已上线" },
{ value: "ARCHIVED", label: "已归档" },
{ value: "DEPRECATED", label: "已废弃" },
];

export default function BlueprintsPage() {
  // ✅ 修复#1: 使用 currentProject 而非 projectId
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id ?? "";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBpName, setNewBpName] = useState("");
  const [newBpDesc, setNewBpDesc] = useState("");
  const [newBpMode, setNewBpMode] = useState("DAG");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const { toast } = useToast();

  const utils = trpc.useUtils();
  const limit = 20;

  // ✅ 修复#11: 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error } = trpc.blueprint.getAll.useQuery(
    {
      projectId,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      limit,
      offset: (page - 1) * limit,
    },
    { enabled: !!projectId }
  );

  // ✅ 修复#9: 创建蓝图弹窗
  const createMut = trpc.blueprint.create.useMutation({
    onSuccess: () => {
      toast({ title: "蓝图已创建" });
      utils.blueprint.getAll.invalidate();
      setShowCreateDialog(false);
      setNewBpName("");
      setNewBpDesc("");
      setNewBpMode("DAG");
    },
    onError: (e) => toast({ title: "创建失败", description: e.message, variant: "destructive" }),
  });

  // ✅ 修复#12: 删除功能
  const deleteMut = trpc.blueprint.delete.useMutation({
    onSuccess: () => {
      toast({ title: "蓝图已删除" });
      utils.blueprint.getAll.invalidate();
    },
    onError: (e) => toast({ title: "删除失败", description: e.message, variant: "destructive" }),
  });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0;

  return (
    <div className="space-y-6 p-6">
      {/*✅ 修复#15: 面包屑*/}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        提示词工厂
        <ChevronRight className="h-3.5 w-3.5" />
        蓝图管理
      </nav>

      <PageHeader
        title="蓝图管理"
        description="管理提示词蓝图：配置槽位、装配原子块、版本控制与质检"
        actions={
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!projectId}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            新建蓝图
          </Button>
        }
      />

      {/*未选 Project 提示*/}
      {!projectId && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          请先在顶部「选择 Project」中创建或选择一个项目
        </div>
      )}

      {/*筛选栏*/}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索蓝图名称…"
            className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border px-3 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/*✅ 修复#8: 错误状态*/}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          加载失败：{error?.message || "未知错误"}
        </div>
      )}

      {/*卡片网格*/}
      <div className="min-h-[300px]">
        {isLoading ? (
          // ✅ 修复#16: 骨架屏
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-white p-5 space-y-3">
                <div className="h-5 w-2/3 rounded bg-gray-200" />
                <div className="h-4 w-1/2 rounded bg-gray-100" />
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-8 w-full rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : (data?.items ?? []).length === 0 ? (
          // ✅ 修复#10: 空状态
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">暂无蓝图</p>
            <p className="text-sm mt-1">
              {projectId ? "点击「新建蓝图」开始创建" : "请先选择一个项目"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.items ?? []).map((bp: any) => (
              // ✅ 修复#14: 卡片本身不用 Link 包裹，内部按钮各自导航
              <div
                key={bp.id}
                className="group relative rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/*标题行*/}
                <div className="flex items-start justify-between">
                  <Link
                    href={`/prompts/blueprints/${bp.id}/slots`}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
                      📋 {bp.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <StatusBadge status={bp.status} />
                    {/*✅ 修复#12/#13: 操作菜单*/}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === bp.id ? null : bp.id); }}
                        className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                      {menuOpenId === bp.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border bg-white py-1 shadow-lg">
                          <Link
                            href={`/prompts/blueprints/${bp.id}/slots`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                          >
                            <Settings2 className="h-3.5 w-3.5" /> 编辑
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm(`确定删除蓝图「${bp.name}」？`)) {
                                deleteMut.mutate({ id: bp.id });
                              }
                              setMenuOpenId(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/*描述*/}
                {bp.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{bp.description}</p>
                )}
                {/*元信息*/}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {bp.position && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      岗位: {bp.position}
                    </span>
                  )}
                  {bp.taskName && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      任务: {bp.taskName}
                    </span>
                  )}
                  {/*✅ 修复#4: 大写 key 匹配*/}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${MODE_STYLE[bp.workflowMode]?.cls || "bg-gray-100 text-gray-600"}`}>
                    {MODE_STYLE[bp.workflowMode]?.label || bp.workflowMode}
                  </span>
                </div>
                {/*✅ 修复#5: 用真实数据替代 qualityPassRate*/}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t">
                  📎 {bp._count?.atoms ?? 0} 个原子块
                  🔧 {bp.slotConfigs?.length ?? 0} 个槽位
                  v{bp.version ?? 1}
                </div>
                {/*操作按钮*/}
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/prompts/blueprints/${bp.id}/slots`}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> 配置槽位
                  </Link>
                  <Link
                    href={`/prompts/blueprints/${bp.id}/slots?tab=test`}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Play className="h-3.5 w-3.5" /> 测试
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/*✅ 修复#17: 无数据时不显示分页*/}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      {/*✅ 修复#9: 新建蓝图弹窗*/}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">新建蓝图</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">蓝图名称 *</label>
                <input
                  value={newBpName}
                  onChange={(e) => setNewBpName(e.target.value)}
                  placeholder="例如：客户经理-贷前调查报告"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newBpDesc}
                  onChange={(e) => setNewBpDesc(e.target.value)}
                  placeholder="蓝图用途描述…"
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工作流模式</label>
                <select
                  value={newBpMode}
                  onChange={(e) => setNewBpMode(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="DAG">DAG 流图</option>
                  <option value="REACT">ReAct</option>
                  <option value="ROLE_COLLABORATION">角色协作</option>
                  <option value="STATEFUL_GRAPH">有状态图</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => { setShowCreateDialog(false); setNewBpName(""); setNewBpDesc(""); }}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (newBpName.trim()) {
                    createMut.mutate({
                      name: newBpName.trim(),
                      projectId,
                      description: newBpDesc.trim() || undefined,
                      workflowMode: newBpMode as any,
                    });
                  }
                }}
                disabled={!newBpName.trim() || createMut.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMut.isPending ? "创建中…" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}