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
import { Plus, Edit, Trash2, Package, Archive, FileText, Database, AlertTriangle, CheckCircle, Clock, TrendingUp, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AssetLifecycleManagementPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateAtomDialog, setShowCreateAtomDialog] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: "",
    type: "RAW",
    status: "DRAFT",
    projectId: "",
    description: ""
  });
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [newAtom, setNewAtom] = useState({
    title: "",
    content: "",
    projectId: "",
    layer: "A",
    granularity: "ATOM",
    experienceSource: "E1_COMPANY" as const,
    exposureLevel: "INTERNAL" as const,
    status: "DRAFT" as const
  });

  const utils = trpc.useUtils();

  // 获取项目列表，用于在创建资产时选择
  const { data: projects } = trpc.project.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // 获取资产列表（包括不同类型的资产）
  const { data: rawResponse, isLoading: rawLoading, refetch } = trpc.raw.getAll.useQuery({
    projectId: projects?.items?.[0]?.id || '',
    limit: 10,
    offset: (page - 1) * 10,
  }, {
    enabled: !!projects?.items?.[0]?.id
  });

  // 获取原子块列表
  const { data: atomResponse, isLoading: atomLoading } = trpc.atom.getAll.useQuery({
    projectId: projects?.items?.[0]?.id || '',
    limit: 10,
    offset: (page - 1) * 10,
  }, {
    enabled: !!projects?.items?.[0]?.id
  });

  // 合并 RAW 和 ATOM 数据
  const assets = [
    ...(rawResponse?.items || []).map(item => ({ ...item, type: 'RAW' })),
    ...(atomResponse?.items || []).map(item => ({ ...item, type: 'ATOM' }))
  ];

  const isLoading = rawLoading || atomLoading;
  const totalCount = (rawResponse?.totalCount || 0) + (atomResponse?.totalCount || 0);

  // 创建资产
  const createAsset = trpc.raw.create.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "资产创建成功",
      });
      utils.raw.getAll.invalidate();
      refetch();
      setNewAsset({
        name: "",
        type: "RAW",
        status: "DRAFT",
        projectId: projects?.items?.[0]?.id || '',
        description: ""
      });
      setShowCreateDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "创建资产时出错",
        variant: "destructive",
      });
    }
  });

  // 创建原子块
  const createAtom = trpc.atom.create.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "原子块创建成功",
      });
      utils.atom.getAll.invalidate();
      refetch(); // 因为我们也在同一表格中显示原子块
      setNewAtom({
        title: "",
        content: "",
        projectId: projects?.items?.[0]?.id || '',
        layer: "A",
        granularity: "ATOM",
        experienceSource: "E1_COMPANY",
        exposureLevel: "INTERNAL",
        status: "DRAFT"
      });
      setShowCreateAtomDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "创建原子块时出错",
        variant: "destructive",
      });
    }
  });

  // 更新资产
  const updateAsset = trpc.raw.update.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "资产更新成功",
      });
      utils.raw.getAll.invalidate();
      refetch();
      setEditingAsset(null);
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "更新资产时出错",
        variant: "destructive",
      });
    }
  });

  // 删除资产
  const deleteAsset = trpc.raw.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "资产删除成功",
      });
      utils.raw.getAll.invalidate();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "删除资产时出错",
        variant: "destructive",
      });
    }
  });

  // 删除原子块
  const deleteAtom = trpc.atom.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "原子块删除成功",
      });
      utils.atom.getAll.invalidate();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "删除原子块时出错",
        variant: "destructive",
      });
    }
  });

  // 资产类型映射
  const assetTypeMap: Record<string, { icon: any, color: string }> = {
    RAW: { icon: FileText, color: "text-blue-500" },
    ATOM: { icon: Database, color: "text-green-500" },
    QA: { icon: AlertTriangle, color: "text-yellow-500" },
    BLUEPRINT: { icon: Package, color: "text-purple-500" }
  };

  // 资产状态映射
  const statusMap: Record<string, { label: string, variant: "default"|"secondary"|"destructive"|"outline" }> = {
    DRAFT: { label: "草稿", variant: "secondary" },
    TESTING: { label: "测试中", variant: "outline" },
    ACTIVE: { label: "活跃", variant: "default" },
    ARCHIVED: { label: "归档", variant: "destructive" }
  };

  const columns: Column<any>[] = [
    { key: "name", label: "资产名称", render: (a) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-oc/10 flex items-center justify-center">
          {React.createElement(assetTypeMap[a.type]?.icon || FileText, { className: `h-5 w-5 ${assetTypeMap[a.type]?.color || 'text-gray-500'}` })}
        </div>
        <div>
          <div className="font-medium">{a.title || a.name}</div>
          <div className="text-xs text-gray-500">ID: {a.id}{a.type === 'ATOM' ? ' (原子块)' : ''}</div>
        </div>
      </div>
    )},
    { key: "type", label: "类型", render: (a) => (
      <Badge variant="outline">
        {a.type === "RAW" ? "素材" :
         a.type === "ATOM" ? "原子块" :
         a.type === "QA" ? "问答对" :
         a.type === "BLUEPRINT" ? "蓝图" : a.type}
      </Badge>
    )},
    { key: "status", label: "状态", render: (a) => (
      <Badge variant={statusMap[a.status]?.variant || "outline"}>
        {statusMap[a.status]?.label || a.status}
      </Badge>
    )},
    { key: "project", label: "项目", render: (a) => (
      <span className="text-sm">
        {projects?.items?.find(p => p.id === a.projectId)?.name || a.projectId}
      </span>
    )},
    { key: "usageCount", label: "使用次数", render: (a) => (
      <div className="flex items-center gap-1">
        <TrendingUp className="h-4 w-4 text-gray-400" />
        <span className="text-sm">{a.usageCount || 0}</span>
      </div>
    )},
    { key: "qualityScore", label: "质量分", render: (a) => (
      <div className="flex items-center gap-1">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-sm">{a.qualityScore ? `${a.qualityScore}%` : "-"}</span>
      </div>
    )},
    { key: "updatedAt", label: "更新时间", render: (a) => <span className="text-xs text-gray-500">{formatDateTime(a.updatedAt)}</span> },
    { key: "actions", label: "操作", render: (a) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Archive className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingAsset(a);
            setShowEditDialog(true);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm(`确定要删除${a.type === 'ATOM' ? '原子块' : '资产'} "${a.title || a.name}" 吗？此操作无法撤消。`)) {
              if (a.type === 'RAW') {
                deleteAsset.mutate({ id: a.id });
              } else if (a.type === 'ATOM') {
                // 如果需要删除原子块，这里可以调用适当的 mutation
                toast({
                  title: "提示",
                  description: "原子块删除功能需进一步实现",
                  variant: "destructive",
                });
              }
            }
          }}
          disabled={deleteAsset.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  const handleSubmit = () => {
    if (!newAsset.name) {
      toast({
        title: "错误",
        description: "资产名称不能为空",
        variant: "destructive",
      });
      return;
    }

    if (!newAsset.projectId) {
      toast({
        title: "错误",
        description: "请选择项目",
        variant: "destructive",
      });
      return;
    }

    if (newAsset.type === 'RAW') {
      createAsset.mutate({
        title: newAsset.name,
        projectId: newAsset.projectId,
        format: 'PDF',
        materialType: 'OTHER',
        experienceSource: 'E1_COMPANY'
      });
    } else if (newAsset.type === 'ATOM') {
      // 对于原子块，我们需要打开一个新的对话框来收集额外的信息
      setShowCreateDialog(false);
      setShowCreateAtomDialog(true);
    } else {
      // 对于其他类型如QA、BLUEPRINT，可以在这里添加相应的逻辑
      toast({
        title: "提示",
        description: `暂时不支持创建 ${newAsset.type} 类型的资产`,
        variant: "destructive",
      });
    }
  };

  const handleUpdate = () => {
    if (editingAsset) {
      if (editingAsset.type === 'RAW') {
        updateAsset.mutate({
          id: editingAsset.id,
          title: editingAsset.title || editingAsset.name,
        });
      } else if (editingAsset.type === 'ATOM') {
        // 如果需要更新原子块，这里也可以添加逻辑
        toast({
          title: "提示",
          description: "原子块更新功能",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateAtom = () => {
    if (!newAtom.title.trim()) {
      toast({
        title: "错误",
        description: "原子块标题不能为空",
        variant: "destructive",
      });
      return;
    }

    if (!newAtom.content.trim()) {
      toast({
        title: "错误",
        description: "原子块内容不能为空",
        variant: "destructive",
      });
      return;
    }

    if (!newAtom.projectId) {
      toast({
        title: "错误",
        description: "请选择项目",
        variant: "destructive",
      });
      return;
    }

    createAtom.mutate({
      title: newAtom.title,
      content: newAtom.content,
      projectId: newAtom.projectId,
      layer: newAtom.layer as "A" | "B" | "C" | "D",
      granularity: newAtom.granularity as "ATOM" | "MODULE" | "PACK",
      experienceSource: newAtom.experienceSource as "E1_COMPANY" | "E2_INDUSTRY" | "E3_CROSS_INDUSTRY",
      exposureLevel: newAtom.exposureLevel as "INTERNAL" | "EXTERNAL" | "NEEDS_APPROVAL" | "STRICTLY_FORBIDDEN",
      status: newAtom.status as "DRAFT" | "TESTING" | "ACTIVE" | "ARCHIVED",
    });
  };

  // 计算统计信息
  const totalAssets = assets.length;
  const draftAssets = assets.filter(a => (a as any).status === 'DRAFT').length;
  const activeAssets = assets.filter(a => (a as any).status === 'ACTIVE').length;
  const archivedAssets = assets.filter(a => (a as any).status === 'ARCHIVED').length;
  const rawAssets = assets.filter(a => a.type === 'RAW').length;
  const atomAssets = assets.filter(a => a.type === 'ATOM').length;

  return (
    <div>
      <PageHeader
        title="资产生命周期管理"
        description="统一管理知识资产的创建、审批、发布、归档等全生命周期流程"
        actions={
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建资产
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建资产</DialogTitle>
                <DialogDescription>创建新的知识资产</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">资产名称</Label>
                  <Input
                    id="name"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                    placeholder="输入资产名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>资产类型</Label>
                  <Select value={newAsset.type} onValueChange={(val) => setNewAsset({...newAsset, type: val as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RAW">素材 (Raw)</SelectItem>
                      <SelectItem value="ATOM">原子块 (Atom)</SelectItem>
                      <SelectItem value="QA">问答对 (Q&A)</SelectItem>
                      <SelectItem value="BLUEPRINT">蓝图 (Blueprint)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>初始状态</Label>
                  <Select value={newAsset.status} onValueChange={(val) => setNewAsset({...newAsset, status: val as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">草稿</SelectItem>
                      <SelectItem value="TESTING">测试中</SelectItem>
                      <SelectItem value="ACTIVE">活跃</SelectItem>
                      <SelectItem value="ARCHIVED">归档</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>所属项目</Label>
                  <Select
                    value={newAsset.projectId}
                    onValueChange={(val) => setNewAsset({...newAsset, projectId: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择项目" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.items?.map(project => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={newAsset.description}
                    onChange={(e) => setNewAsset({...newAsset, description: e.target.value})}
                    placeholder="简要描述资产用途"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createAsset.isPending}
                >
                  {createAsset.isPending ? '创建中...' : '创建资产'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">总资数量</h3>
          </div>
          <p className="text-2xl font-bold">{totalAssets}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3" /> {assets.filter(a => new Date(a.updatedAt) > new Date(Date.now() - 7 * 86400 * 1000)).length} 新增本周
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">活跃资产</h3>
          </div>
          <p className="text-2xl font-bold">{activeAssets}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <CheckCircle className="h-3 w-3" /> {Math.round((activeAssets / Math.max(totalAssets, 1)) * 100)}% 上线率
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">草稿资产</h3>
          </div>
          <p className="text-2xl font-bold">{draftAssets}</p>
          <p className="text-xs text-gray-500">待处理</p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">归档资产</h3>
          </div>
          <p className="text-2xl font-bold">{archivedAssets}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" /> 存档管理
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={assets}
        loading={isLoading}
        emptyMessage="没有找到资产"
      />

      <Pagination
        page={page}
        totalPages={Math.ceil(totalCount / 10)}
        onChange={setPage}
      />

      {/* 编辑资产对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑资产</DialogTitle>
            <DialogDescription>修改资产信息</DialogDescription>
          </DialogHeader>
          {editingAsset && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">资产名称</Label>
                <Input
                  id="edit-name"
                  value={editingAsset.title || editingAsset.name || ""}
                  onChange={(e) => setEditingAsset({...editingAsset, title: e.target.value})}
                  placeholder="输入资产名称"
                />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={editingAsset.status || "DRAFT"}
                  onValueChange={(val) => setEditingAsset({...editingAsset, status: val as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                    <SelectItem value="TESTING">测试中</SelectItem>
                    <SelectItem value="ACTIVE">活跃</SelectItem>
                    <SelectItem value="ARCHIVED">归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Input
                  id="edit-description"
                  value={editingAsset.description || ""}
                  onChange={(e) => setEditingAsset({...editingAsset, description: e.target.value})}
                  placeholder="简要描述资产用途"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button
              onClick={handleUpdate}
              disabled={updateAsset.isPending}
            >
              {updateAsset.isPending ? '更新中...' : '更新资产'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建原子块对话框 */}
      <Dialog open={showCreateAtomDialog} onOpenChange={setShowCreateAtomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建原子块</DialogTitle>
            <DialogDescription>创建新的原子级知识块</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="atom-title">原子块标题</Label>
              <Input
                id="atom-title"
                value={newAtom.title}
                onChange={(e) => setNewAtom({...newAtom, title: e.target.value})}
                placeholder="输入原子块标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atom-content">内容</Label>
              <textarea
                id="atom-content"
                value={newAtom.content}
                onChange={(e) => setNewAtom({...newAtom, content: e.target.value})}
                placeholder="输入原子块内容"
                className="w-full min-h-[120px] p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-oc"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>层级</Label>
                <Select value={newAtom.layer} onValueChange={(val) => setNewAtom({...newAtom, layer: val as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A层 - 基础概念</SelectItem>
                    <SelectItem value="B">B层 - 业务知识</SelectItem>
                    <SelectItem value="C">C层 - 实践技能</SelectItem>
                    <SelectItem value="D">D层 - 经验总结</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>粒度</Label>
                <Select value={newAtom.granularity} onValueChange={(val) => setNewAtom({...newAtom, granularity: val as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATOM">原子级</SelectItem>
                    <SelectItem value="MODULE">模块级</SelectItem>
                    <SelectItem value="PACK">包级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>来源</Label>
                <Select value={newAtom.experienceSource} onValueChange={(val) => setNewAtom({...newAtom, experienceSource: val as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E1_COMPANY">公司内部</SelectItem>
                    <SelectItem value="E2_INDUSTRY">行业经验</SelectItem>
                    <SelectItem value="E3_CROSS_INDUSTRY">跨行业</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={newAtom.status} onValueChange={(val) => setNewAtom({...newAtom, status: val as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                    <SelectItem value="TESTING">测试中</SelectItem>
                    <SelectItem value="ACTIVE">活跃</SelectItem>
                    <SelectItem value="ARCHIVED">归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>所属项目</Label>
              <Select
                value={newAtom.projectId}
                onValueChange={(val) => setNewAtom({...newAtom, projectId: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.items?.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateAtomDialog(false)}>取消</Button>
            <Button
              onClick={handleCreateAtom}
              disabled={createAtom.isPending}
            >
              {createAtom.isPending ? '创建中...' : '创建原子块'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// React需要被导入才能使用React.createElement
import React from 'react';