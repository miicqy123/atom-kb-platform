"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { formatDateTime } from "@/lib/utils";
import { Plus, Edit, Trash2, Users, Building2, CreditCard, Calendar, Globe, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TenantManagementPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", domain: "", plan: "STARTER" as const });
  const [editingTenant, setEditingTenant] = useState<any>(null);

  const utils = trpc.useUtils();

  // 获取租户列表
  const { data: tenants, isLoading, refetch } = trpc.tenant.list.useQuery();

  // 创建租户
  const createTenant = trpc.tenant.create.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "租户创建成功",
      });
      utils.tenant.list.invalidate();
      refetch();
      setNewTenant({ name: "", domain: "", plan: "STARTER" });
      setShowCreateDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "创建租户时出错",
        variant: "destructive",
      });
    }
  });

  // 更新租户
  const updateTenant = trpc.tenant.update.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "租户更新成功",
      });
      utils.tenant.list.invalidate();
      refetch();
      setEditingTenant(null);
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "更新租户时出错",
        variant: "destructive",
      });
    }
  });

  // 删除租户
  const deleteTenant = trpc.tenant.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "租户删除成功",
      });
      utils.tenant.list.invalidate();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "删除租户时出错",
        variant: "destructive",
      });
    }
  });

  const columns: Column<any>[] = [
    { key: "name", label: "租户名称", render: (t) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-oc/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-oc" />
        </div>
        <div>
          <div className="font-medium">{t.name}</div>
          <div className="text-xs text-gray-500">{t.domain}</div>
        </div>
      </div>
    )},
    { key: "status", label: "状态", render: (t) => (
      <Badge variant={t.status === "ACTIVE" ? "default" : t.status === "SUSPENDED" ? "destructive" : "secondary"}>
        {t.status === "ACTIVE" ? "活跃" : t.status === "SUSPENDED" ? "暂停" : "试用"}
      </Badge>
    )},
    { key: "plan", label: "套餐", render: (t) => (
      <Badge variant={t.plan === "ENTERPRISE" ? "default" : t.plan === "PROFESSIONAL" ? "secondary" : "outline"}>
        {t.plan}
      </Badge>
    )},
    { key: "users", label: "用户数", render: (t) => <span className="text-sm">{t._count?.users || 0}</span> },
    { key: "projects", label: "项目数", render: (t) => <span className="text-sm">{t._count?.workspaces || 0}</span> },
    { key: "createdAt", label: "创建时间", render: (t) => <span className="text-xs text-gray-500">{formatDateTime(t.createdAt)}</span> },
    { key: "actions", label: "操作", render: (t) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingTenant(t);
            setShowEditDialog(true);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm(`确定要删除租户 "${t.name}" 吗？此操作无法撤消。`)) {
              deleteTenant.mutate({ id: t.id });
            }
          }}
          disabled={deleteTenant.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  const handleSubmit = () => {
    createTenant.mutate({
      name: newTenant.name,
      domain: newTenant.domain,
      plan: newTenant.plan as any,
      status: "TRIAL"
    });
  };

  const handleUpdate = () => {
    if (editingTenant) {
      updateTenant.mutate({
        id: editingTenant.id,
        name: editingTenant.name,
        domain: editingTenant.domain,
        plan: editingTenant.plan,
        status: editingTenant.status
      });
    }
  };

  // 计算统计信息
  const activeTenants = tenants?.filter(t => t.status === "ACTIVE").length || 0;
  const suspendedTenants = tenants?.filter(t => t.status === "SUSPENDED").length || 0;
  const totalTenants = tenants?.length || 0;

  return (
    <div>
      <PageHeader
        title="租户管理"
        description="管理企业级租户账户、配额和套餐订阅"
        actions={
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建租户
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建租户</DialogTitle>
                <DialogDescription>创建新的企业级租户账户</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">租户名称</Label>
                  <Input
                    id="name"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                    placeholder="输入租户名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">自定义域名</Label>
                  <Input
                    id="domain"
                    value={newTenant.domain}
                    onChange={(e) => setNewTenant({...newTenant, domain: e.target.value})}
                    placeholder="例如：company.tenant-platform.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>套餐计划</Label>
                  <Select value={newTenant.plan} onValueChange={(val) => setNewTenant({...newTenant, plan: val as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRIAL">试用版</SelectItem>
                      <SelectItem value="STARTER">入门版</SelectItem>
                      <SelectItem value="PROFESSIONAL">专业版</SelectItem>
                      <SelectItem value="ENTERPRISE">企业版</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createTenant.isPending}
                >
                  {createTenant.isPending ? '创建中...' : '创建租户'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">总租户数</h3>
          </div>
          <p className="text-2xl font-bold">{totalTenants}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Users className="h-3 w-3" /> {tenants?.filter(t => new Date(t.createdAt) > new Date(Date.now() - 7 * 86400 * 1000)).length || 0} 新增本周
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">活跃租户</h3>
          </div>
          <p className="text-2xl font-bold">{activeTenants}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <CreditCard className="h-3 w-3" /> {(activeTenants / Math.max(totalTenants, 1) * 100).toFixed(0)}% 收费
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold">暂停租户</h3>
          </div>
          <p className="text-2xl font-bold">{suspendedTenants}</p>
          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" /> 待处理
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">总收入</h3>
          </div>
          <p className="text-2xl font-bold">¥0</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" /> 月度统计
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tenants || []}
        loading={isLoading}
        emptyMessage="没有找到租户"
      />

      <Pagination
        page={page}
        totalPages={Math.ceil((tenants?.length || 0) / 10)}
        onChange={setPage}
      />

      {/* 编辑租户对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑租户</DialogTitle>
            <DialogDescription>修改租户账户信息</DialogDescription>
          </DialogHeader>
          {editingTenant && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">租户名称</Label>
                <Input
                  id="edit-name"
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})}
                  placeholder="输入租户名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-domain">自定义域名</Label>
                <Input
                  id="edit-domain"
                  value={editingTenant.domain}
                  onChange={(e) => setEditingTenant({...editingTenant, domain: e.target.value})}
                  placeholder="例如：company.tenant-platform.com"
                />
              </div>
              <div className="space-y-2">
                <Label>套餐计划</Label>
                <Select
                  value={editingTenant.plan}
                  onValueChange={(val) => setEditingTenant({...editingTenant, plan: val as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRIAL">试用版</SelectItem>
                    <SelectItem value="STARTER">入门版</SelectItem>
                    <SelectItem value="PROFESSIONAL">专业版</SelectItem>
                    <SelectItem value="ENTERPRISE">企业版</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={editingTenant.status}
                  onValueChange={(val) => setEditingTenant({...editingTenant, status: val as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">活跃</SelectItem>
                    <SelectItem value="SUSPENDED">暂停</SelectItem>
                    <SelectItem value="TRIAL">试用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button
              onClick={handleUpdate}
              disabled={updateTenant.isPending}
            >
              {updateTenant.isPending ? '更新中...' : '更新租户'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}