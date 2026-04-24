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
import { Plus, Edit, Trash2, Folder, BarChart3, Activity, Users, CheckCircle, Clock, AlertTriangle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProjectManagementPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", workspaceId: "", description: "", visibility: "PRIVATE" as const });
  const [editingProject, setEditingProject] = useState<any>(null);

  const utils = trpc.useUtils();

  // 获取工作区列表，用于在创建项目时选择
  const { data: workspaces } = trpc.workspace.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // 获取项目列表
  const { data: projectResponse, isLoading, refetch } = trpc.project.list.useQuery({
    workspaceId: workspaces?.items?.[0]?.id || '', // 使用第一个工作区作为默认值
    limit: 10,
    offset: (page - 1) * 10,
  }, {
    enabled: !!workspaces?.items?.[0]?.id
  });

  // 创建项目
  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "项目创建成功",
      });
      utils.project.list.invalidate();
      refetch();
      setNewProject({ name: "", workspaceId: workspaces?.items?.[0]?.id || '', description: "", visibility: "PRIVATE" });
      setShowCreateDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "创建项目时出错",
        variant: "destructive",
      });
    }
  });

  // 更新项目
  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "项目更新成功",
      });
      utils.project.list.invalidate();
      refetch();
      setEditingProject(null);
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "更新项目时出错",
        variant: "destructive",
      });
    }
  });

  // 删除项目
  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "项目删除成功",
      });
      utils.project.list.invalidate();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "删除项目时出错",
        variant: "destructive",
      });
    }
  });

  const columns: Column<any>[] = [
    { key: "name", label: "项目名称", render: (p) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-oc/10 flex items-center justify-center">
          <Folder className="h-5 w-5 text-oc" />
        </div>
        <div>
          <div className="font-medium">{p.name}</div>
          <div className="text-xs text-gray-500">#{p.id}</div>
        </div>
      </div>
    )},
    { key: "workspaceId", label: "工作区", render: (p) => (
      <Badge variant="outline">
        {workspaces?.items?.find(ws => ws.id === p.workspaceId)?.name || p.workspaceId}
      </Badge>
    )},
    { key: "owner", label: "负责人", render: (p) => <span className="text-sm">{p.owner?.name || p.ownerId}</span> },
    { key: "visibility", label: "可见性", render: (p) => (
      <Badge variant={p.visibility === "PRIVATE" ? "outline" : p.visibility === "TEAM" ? "default" : "secondary"}>
        {p.visibility === "PRIVATE" ? "私有" : p.visibility === "TEAM" ? "团队" : "公开"}
      </Badge>
    )},
    { key: "_count", label: "资产数量", render: (p) => (
      <div className="flex gap-2">
        <Badge variant="outline" className="text-xs">原始: {p._count?.raws || 0}</Badge>
        <Badge variant="outline" className="text-xs">原子: {p._count?.atoms || 0}</Badge>
        <Badge variant="outline" className="text-xs">问答: {p._count?.qaPairs || 0}</Badge>
      </div>
    )},
    { key: "_count.blueprints", label: "蓝图", render: (p) => <span className="text-sm">{p._count?.blueprints || 0}</span> },
    { key: "_count.workflowRuns", label: "运行", render: (p) => <span className="text-sm">{p._count?.workflowRuns || 0}</span> },
    { key: "updatedAt", label: "更新时间", render: (p) => <span className="text-xs text-gray-500">{formatDateTime(p.updatedAt)}</span> },
    { key: "actions", label: "操作", render: (p) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm">
          <Activity className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingProject(p);
            setShowEditDialog(true);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm(`确定要删除项目 "${p.name}" 吗？此操作无法撤消。`)) {
              deleteProject.mutate({ id: p.id });
            }
          }}
          disabled={deleteProject.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  const handleSubmit = () => {
    if (!newProject.workspaceId) {
      toast({
        title: "错误",
        description: "请选择一个工作区",
        variant: "destructive",
      });
      return;
    }

    createProject.mutate({
      name: newProject.name,
      workspaceId: newProject.workspaceId,
      description: newProject.description,
      visibility: newProject.visibility
    });
  };

  const handleUpdate = () => {
    if (editingProject) {
      updateProject.mutate({
        id: editingProject.id,
        name: editingProject.name,
        description: editingProject.description
      });
    }
  };

  // 计算统计信息
  const projects = projectResponse?.items || [];
  const totalProjects = projects.length;
  const totalRawAssets = projects.reduce((sum, p) => sum + (p._count?.raws || 0), 0);
  const totalAtomAssets = projects.reduce((sum, p) => sum + (p._count?.atoms || 0), 0);
  const totalQaAssets = projects.reduce((sum, p) => sum + (p._count?.qaPairs || 0), 0);
  const totalAssets = totalRawAssets + totalAtomAssets + totalQaAssets;
  const totalRuns = projects.reduce((sum, p) => sum + (p._count?.workflowRuns || 0), 0);

  return (
    <div>
      <PageHeader
        title="Project 管理"
        description="管理项目生命周期、资源配置和成员权限"
        actions={
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建项目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建项目</DialogTitle>
                <DialogDescription>创建新的 AI 工作流项目</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">项目名称</Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    placeholder="输入项目名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">项目描述</Label>
                  <Input
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    placeholder="简要描述项目目标"
                  />
                </div>
                <div className="space-y-2">
                  <Label>所属工作区</Label>
                  <Select
                    value={newProject.workspaceId}
                    onValueChange={(val) => setNewProject({...newProject, workspaceId: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择工作区" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces?.items?.map(ws => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>可见性</Label>
                  <Select
                    value={newProject.visibility}
                    onValueChange={(val) => setNewProject({...newProject, visibility: val as any})}
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createProject.isPending}
                >
                  {createProject.isPending ? '创建中...' : '创建项目'}
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
            <h3 className="text-sm font-semibold">总项目数</h3>
          </div>
          <p className="text-2xl font-bold">{totalProjects}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Activity className="h-3 w-3" /> {projects.filter(p => new Date(p.updatedAt) > new Date(Date.now() - 7 * 86400 * 1000)).length} 新增本周
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">总资产数</h3>
          </div>
          <p className="text-2xl font-bold">{totalAssets}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Users className="h-3 w-3" /> {totalRawAssets}原始+{totalAtomAssets}原子+{totalQaAssets}问答
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">总运行次数</h3>
          </div>
          <p className="text-2xl font-bold">{totalRuns}</p>
          <p className="text-xs text-gray-500">工作流执行统计</p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">平均蓝图</h3>
          </div>
          <p className="text-2xl font-bold">{totalProjects > 0 ? Math.round(projects.reduce((sum, p) => sum + (p._count?.blueprints || 0), 0) / totalProjects) : 0}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3 w-3" /> 每项目平均
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        loading={isLoading}
        emptyMessage="没有找到项目"
      />

      <Pagination
        page={page}
        totalPages={Math.ceil((projectResponse?.totalCount || 0) / 10)}
        onChange={setPage}
      />

      {/* 编辑项目对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
            <DialogDescription>修改项目信息</DialogDescription>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">项目名称</Label>
                <Input
                  id="edit-name"
                  value={editingProject.name || ""}
                  onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                  placeholder="输入项目名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">项目描述</Label>
                <Input
                  id="edit-description"
                  value={editingProject.description || ""}
                  onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                  placeholder="简要描述项目目标"
                />
              </div>
              <div className="space-y-2">
                <Label>可见性</Label>
                <Select
                  value={editingProject.visibility}
                  onValueChange={(val) => setEditingProject({...editingProject, visibility: val as any})}
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
              disabled={updateProject.isPending}
            >
              {updateProject.isPending ? '更新中...' : '更新项目'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}