"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
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
import { Plus, Edit, Trash2, Users, Folder, Settings, CheckCircle, Clock, AlertTriangle, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WorkspaceManagementPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: "", description: "", type: "TEAM" as const, visibility: "PRIVATE" as const });
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);

  const utils = trpc.useUtils();

  // 获取工作区列表
  const { data: workspaceResponse, isLoading, refetch } = trpc.workspace.list.useQuery({
    limit: 10,
    offset: (page - 1) * 10,
  });

  // 获取所有租户，用于在创建工作区时选择
  const { data: tenants } = trpc.tenant.list.useQuery();

  // 创建工作区
  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "工作区创建成功",
      });
      utils.workspace.list.invalidate();
      refetch();
      setNewWorkspace({ name: "", description: "", type: "TEAM", visibility: "PRIVATE" });
      setShowCreateDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "创建工作区时出错",
        variant: "destructive",
      });
    }
  });

  // 更新工作区
  const updateWorkspace = trpc.workspace.update.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "工作区更新成功",
      });
      utils.workspace.list.invalidate();
      refetch();
      setEditingWorkspace(null);
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "更新工作区时出错",
        variant: "destructive",
      });
    }
  });

  // 删除工作区
  const deleteWorkspace = trpc.workspace.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "工作区删除成功",
      });
      utils.workspace.list.invalidate();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "删除工作区时出错",
        variant: "destructive",
      });
    }
  });

  const columns: Column<any>[] = [
    { key: "name", label: "工作区名称", render: (w) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-oc/10 flex items-center justify-center">
          <Folder className="h-5 w-5 text-oc" />
        </div>
        <div>
          <div className="font-medium">{w.name}</div>
          <div className="text-xs text-gray-500">{w.description}</div>
        </div>
      </div>
    )},
    { key: "owner", label: "拥有者", render: (w) => (
      <div className="text-sm">
        <div>{w.owner?.name}</div>
        <div className="text-xs text-gray-500">{w.owner?.email}</div>
      </div>
    )},
    { key: "type", label: "类型", render: (w) => (
      <Badge variant={w.type === "PERSONAL" ? "outline" : w.type === "TEAM" ? "default" : "secondary"}>
        {w.type === "PERSONAL" ? "个人" : w.type === "TEAM" ? "团队" : "企业"}
      </Badge>
    )},
    { key: "members", label: "成员", render: (w) => <span className="text-sm">{w._count?.members || 0}</span> },
    { key: "projects", label: "项目", render: (w) => <span className="text-sm">{w._count?.projects || 0}</span> },
    { key: "visibility", label: "可见性", render: (w) => (
      <Badge variant={w.visibility === "PRIVATE" ? "outline" : w.visibility === "TEAM" ? "default" : "secondary"}>
        {w.visibility === "PRIVATE" ? "私有" : w.visibility === "TEAM" ? "团队" : "公开"}
      </Badge>
    )},
    { key: "updatedAt", label: "更新时间", render: (w) => <span className="text-xs text-gray-500">{formatDateTime(w.updatedAt)}</span> },
    { key: "actions", label: "操作", render: (w) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingWorkspace(w);
            setShowEditDialog(true);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm(`确定要删除工作区 "${w.name}" 吗？此操作无法撤消。`)) {
              deleteWorkspace.mutate({ id: w.id });
            }
          }}
          disabled={deleteWorkspace.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  const handleSubmit = () => {
    createWorkspace.mutate({
      name: newWorkspace.name,
      description: newWorkspace.description,
      type: newWorkspace.type,
      visibility: newWorkspace.visibility
    });
  };

  const handleUpdate = () => {
    if (editingWorkspace) {
      updateWorkspace.mutate({
        id: editingWorkspace.id,
        name: editingWorkspace.name,
        description: editingWorkspace.description,
        type: editingWorkspace.type,
        visibility: editingWorkspace.visibility
      });
    }
  };

  // 计算统计信息
  const workspaces = workspaceResponse?.items || [];
  const activeWorkspaces = workspaces.filter(w => w.visibility === "PRIVATE" || w.visibility === "TEAM").length;
  const totalWorkspaces = workspaces.length;
  const totalProjects = workspaces.reduce((sum, ws) => sum + (ws._count?.projects || 0), 0);
  const totalMembers = workspaces.reduce((sum, ws) => sum + (ws._count?.members || 0), 0);

  return (
    <div>
      <PageHeader
        title="Workspace 管理"
        description="管理组织内团队空间、成员权限和资源分配"
        actions={
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建 Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建 Workspace</DialogTitle>
                <DialogDescription>创建新的团队工作区</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">工作区名称</Label>
                  <Input
                    id="name"
                    value={newWorkspace.name}
                    onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                    placeholder="输入工作区名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={newWorkspace.description}
                    onChange={(e) => setNewWorkspace({...newWorkspace, description: e.target.value})}
                    placeholder="工作区描述"
                  />
                </div>
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select value={newWorkspace.type} onValueChange={(val) => setNewWorkspace({...newWorkspace, type: val as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERSONAL">个人</SelectItem>
                      <SelectItem value="TEAM">团队</SelectItem>
                      <SelectItem value="ENTERPRISE">企业</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>可见性</Label>
                  <Select value={newWorkspace.visibility} onValueChange={(val) => setNewWorkspace({...newWorkspace, visibility: val as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIVATE">私有</SelectItem>
                      <SelectItem value="TEAM">团队</SelectItem>
                      <SelectItem value="PUBLIC">公开</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createWorkspace.isPending}
                >
                  {createWorkspace.isPending ? '创建中...' : '创建工作区'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Folder className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">总工作区</h3>
          </div>
          <p className="text-2xl font-bold">{totalWorkspaces}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Users className="h-3 w-3" /> {totalMembers} 总成员
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">活跃工作区</h3>
          </div>
          <p className="text-2xl font-bold">{activeWorkspaces}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Settings className="h-3 w-3" /> 100% 功能完整
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">共享工作区</h3>
          </div>
          <p className="text-2xl font-bold">{workspaces.filter(w => w.visibility !== "PRIVATE").length}</p>
          <p className="text-xs text-gray-500">跨团队协作</p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">项目总数</h3>
          </div>
          <p className="text-2xl font-bold">{totalProjects}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Folder className="h-3 w-3" /> 平均 {totalWorkspaces > 0 ? (totalProjects / totalWorkspaces).toFixed(1) : 0}/工作区
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={workspaces}
        loading={isLoading}
        emptyMessage="没有找到工作区"
      />

      <Pagination
        page={page}
        totalPages={Math.ceil((workspaceResponse?.totalCount || 0) / 10)}
        onChange={setPage}
      />

      {/* 编辑工作区对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑工作区</DialogTitle>
            <DialogDescription>修改工作区信息</DialogDescription>
          </DialogHeader>
          {editingWorkspace && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">工作区名称</Label>
                <Input
                  id="edit-name"
                  value={editingWorkspace.name || ""}
                  onChange={(e) => setEditingWorkspace({...editingWorkspace, name: e.target.value})}
                  placeholder="输入工作区名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Input
                  id="edit-description"
                  value={editingWorkspace.description || ""}
                  onChange={(e) => setEditingWorkspace({...editingWorkspace, description: e.target.value})}
                  placeholder="工作区描述"
                />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <Select
                  value={editingWorkspace.type}
                  onValueChange={(val) => setEditingWorkspace({...editingWorkspace, type: val as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERSONAL">个人</SelectItem>
                    <SelectItem value="TEAM">团队</SelectItem>
                    <SelectItem value="ENTERPRISE">企业</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>可见性</Label>
                <Select
                  value={editingWorkspace.visibility}
                  onValueChange={(val) => setEditingWorkspace({...editingWorkspace, visibility: val as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">私有</SelectItem>
                    <SelectItem value="TEAM">团队</SelectItem>
                    <SelectItem value="PUBLIC">公开</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button
              onClick={handleUpdate}
              disabled={updateWorkspace.isPending}
            >
              {updateWorkspace.isPending ? '更新中...' : '更新工作区'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}