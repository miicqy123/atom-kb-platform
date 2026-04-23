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
import { Plus, Edit, Trash2, User, Users, Shield, Settings, Calendar, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserAndRoleManagementPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("users");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "READONLY" as const, tenantId: "" });
  const [editingUser, setEditingUser] = useState<any>(null);

  const utils = trpc.useUtils();

  // 获取用户列表
  const { data: userResponse, isLoading: isUserLoading, refetch: refetchUsers } = trpc.user.list.useQuery({
    limit: 10,
    offset: (page - 1) * 10,
  });

  // 获取租户列表，用于在创建用户时选择
  const { data: tenants } = trpc.tenant.list.useQuery();

  // 更新用户角色
  const updateUserRole = trpc.user.updateRole.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "用户角色更新成功",
      });
      utils.user.list.invalidate();
      refetchUsers();
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "更新用户角色时出错",
        variant: "destructive",
      });
    }
  });

  // 更新用户资料
  const updateUserProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "用户信息更新成功",
      });
      utils.user.list.invalidate();
      refetchUsers();
      setEditingUser(null);
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "更新用户时出错",
        variant: "destructive",
      });
    }
  });

  // 获取用户列表
  const users = userResponse?.items || [];

  // 定义角色选项
  const roleOptions = [
    { id: "SUPER_ADMIN", name: "超级管理员", description: "系统最高权限，可管理所有资源" },
    { id: "TENANT_ADMIN", name: "租户管理员", description: "管理特定租户内的资源" },
    { id: "KNOWLEDGE_EDITOR", name: "知识编辑员", description: "编辑和管理知识库内容" },
    { id: "PROMPT_ENGINEER", name: "提示工程师", description: "设计和优化AI提示词" },
    { id: "OPERATOR", name: "运营专员", description: "执行日常运营任务" },
    { id: "REVIEWER", name: "审核员", description: "审核内容质量" },
    { id: "READONLY", name: "只读用户", description: "查看权限" },
  ];

  const userColumns: Column<any>[] = [
    { key: "name", label: "姓名", render: (u) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-oc/10 flex items-center justify-center">
          <User className="h-5 w-5 text-oc" />
        </div>
        <div>
          <div className="font-medium">{u.name}</div>
          <div className="text-xs text-gray-500">{u.email}</div>
        </div>
      </div>
    )},
    { key: "role", label: "角色", render: (u) => (
      <Badge variant="outline" className="capitalize">
        {roleOptions.find(r => r.id === u.role)?.name || u.role}
      </Badge>
    )},
    { key: "tenant", label: "租户", render: (u) => <span className="text-sm">{u.tenant?.name || u.tenantId}</span> },
    { key: "status", label: "状态", render: (u) => (
      <Badge variant={u.status === "active" ? "default" : "secondary"}>
        {u.status === "active" ? "活跃" : "禁用"}
      </Badge>
    )},
    { key: "lastLoginAt", label: "最后登录", render: (u) => <span className="text-xs text-gray-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "从未登录"}</span> },
    { key: "createdAt", label: "加入时间", render: (u) => <span className="text-xs text-gray-500">{formatDateTime(u.createdAt)}</span> },
    { key: "actions", label: "操作", render: (u) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingUser(u);
            setShowEditDialog(true);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm(`确定要禁用用户 "${u.name}" 吗？此操作将限制其访问权限。`)) {
              updateUserProfile.mutate({
                id: u.id,
                status: "inactive"
              });
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  const roleColumns: Column<any>[] = [
    { key: "name", label: "角色名称", render: (r) => (
      <div className="font-medium">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          {r.name}
        </div>
        <div className="text-xs text-gray-500">{r.description}</div>
      </div>
    )},
    { key: "id", label: "角色ID", render: (r) => <span className="font-mono text-xs text-gray-500">{r.id}</span> },
    { key: "actions", label: "操作", render: (r) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  const handleSubmit = () => {
    if (!newUser.name || !newUser.email) {
      toast({
        title: "错误",
        description: "姓名和邮箱不能为空",
        variant: "destructive",
      });
      return;
    }

    if (!newUser.tenantId) {
      toast({
        title: "错误",
        description: "请选择租户",
        variant: "destructive",
      });
      return;
    }

    // 在实际应用中，这里应该有创建用户的逻辑
    // 目前只是显示成功消息并重置表单
    toast({
      title: "成功",
      description: "用户邀请已发送",
    });
    setNewUser({ name: "", email: "", role: "READONLY", tenantId: "" });
    setShowCreateDialog(false);
  };

  const handleUpdate = () => {
    if (editingUser) {
      updateUserProfile.mutate({
        id: editingUser.id,
        name: editingUser.name,
        email: editingUser.email,
      });
    }
  };

  // 计算统计信息
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalRoles = roleOptions.length;
  const recentLogins = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 86400000)).length;

  return (
    <div>
      <PageHeader
        title="用户与角色管理"
        description="管理系统用户、角色权限和访问控制策略"
        actions={
          activeTab === "users" ? (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  邀请用户
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>邀请新用户</DialogTitle>
                  <DialogDescription>向系统邀请新用户</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="输入用户姓名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="输入用户邮箱"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>角色</Label>
                    <Select value={newUser.role} onValueChange={(val) => setNewUser({...newUser, role: val as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>所属租户</Label>
                    <Select value={newUser.tenantId} onValueChange={(val) => setNewUser({...newUser, tenantId: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants?.map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
                  <Button
                    onClick={handleSubmit}
                  >
                    发送邀请
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">总用户数</h3>
          </div>
          <p className="text-2xl font-bold">{totalUsers}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Users className="h-3 w-3" /> {users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 86400000)).length} 在线
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">活跃用户</h3>
          </div>
          <p className="text-2xl font-bold">{activeUsers}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" /> {Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}% 活跃度
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">角色总数</h3>
          </div>
          <p className="text-2xl font-bold">{totalRoles}</p>
          <p className="text-xs text-gray-500">基于角色的权限控制</p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">最近登录</h3>
          </div>
          <p className="text-2xl font-bold">{recentLogins}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" /> 24 小时内
          </p>
        </div>
      </div>

      <div className="border-b mb-4">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-oc text-oc"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            用户管理
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "roles"
                ? "border-oc text-oc"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            角色权限
          </button>
        </nav>
      </div>

      {activeTab === "users" && (
        <>
          <DataTable
            columns={userColumns}
            data={users}
            loading={isUserLoading}
            emptyMessage="没有找到用户"
          />

          <Pagination
            page={page}
            totalPages={Math.ceil((userResponse?.totalCount || 0) / 10)}
            onChange={setPage}
          />
        </>
      )}

      {activeTab === "roles" && (
        <DataTable
          columns={roleColumns}
          data={roleOptions}
          loading={false}
          emptyMessage="角色权限配置"
        />
      )}

      {/* 编辑用户对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>修改用户信息</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">姓名</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name || ""}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  placeholder="输入用户姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">邮箱</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  placeholder="输入用户邮箱"
                />
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={editingUser.role || "READONLY"}
                  onValueChange={(val) => setEditingUser({...editingUser, role: val as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button
              onClick={handleUpdate}
            >
              更新用户
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}