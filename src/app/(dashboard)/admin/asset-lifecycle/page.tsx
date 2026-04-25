"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { formatDateTime } from "@/lib/utils";
import { Plus, Edit, Trash2, Database, FileText, Image, Video, Archive, Upload, Download, ExternalLink, Clock, CheckCircle, AlertTriangle, Shield } from "lucide-react";

const ASSET_TYPES = [
  { id: "DOCUMENT", name: "文档", icon: <FileText className="h-4 w-4" /> },
  { id: "DATASET", name: "数据集", icon: <Image className="h-4 w-4" /> },
  { id: "IMAGE", name: "图片", icon: <Image className="h-4 w-4" /> },
  { id: "VIDEO", name: "视频", icon: <Video className="h-4 w-4" /> },
  { id: "MODEL", name: "模型", icon: <Database className="h-4 w-4" /> },
  { id: "OTHER", name: "其他", icon: <Archive className="h-4 w-4" /> },
];

const ASSET_STATUSES = [
  { id: "DRAFT", name: "草稿", color: "bg-gray-100 text-gray-800" },
  { id: "REVIEW", name: "审核中", color: "bg-yellow-100 text-yellow-800" },
  { id: "APPROVED", name: "已批准", color: "bg-green-100 text-green-800" },
  { id: "REJECTED", name: "已拒绝", color: "bg-red-100 text-red-800" },
  { id: "ARCHIVED", name: "已归档", color: "bg-blue-100 text-blue-800" },
];

// 模拟资产数据
const generateMockAssets = () => {
  const assets = [];
  for (let i = 1; i <= 25; i++) {
    const randomType = ASSET_TYPES[Math.floor(Math.random() * ASSET_TYPES.length)];
    const randomStatus = ASSET_STATUSES[Math.floor(Math.random() * ASSET_STATUSES.length)];

    assets.push({
      id: `asset_${i}`,
      name: `${randomType.name}_Sample_${i}.${randomType.id.toLowerCase().substring(0, 3)}`,
      type: randomType.id,
      size: `${(Math.random() * 50).toFixed(1)}MB`,
      version: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`,
      status: randomStatus.id,
      creator: `user_${i}`,
      project: `proj_${Math.floor(Math.random() * 5) + 1}`,
      tags: ["sample", "test", "demo"],
      uploadDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
      lastAccess: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000),
      lifecycleStage: ["Creation", "Review", "Approval", "Distribution", "Maintenance", "Archive"][Math.floor(Math.random() * 6)],
      expiryDate: new Date(Date.now() + Math.floor(Math.random() * 365) * 86400000)
    });
  }
  return assets;
};

export default function AssetLifecycleManagementPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("assets");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", type: "DOCUMENT", project: "proj_1", description: "" });

  const allAssets = generateMockAssets();

  // 过滤逻辑
  const filteredAssets = allAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || asset.type === filterType;
    const matchesStatus = filterStatus === "ALL" || asset.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const assetColumns: Column<any>[] = [
    { key: "name", label: "资产名称", render: (a) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
          {ASSET_TYPES.find(t => t.id === a.type)?.icon}
        </div>
        <div>
          <div className="font-medium">{a.name}</div>
          <div className="text-xs text-gray-500">#{a.id} • {a.size}</div>
        </div>
      </div>
    )},
    { key: "type", label: "类型", render: (a) => (
      <Badge variant="outline" className="capitalize">
        {ASSET_TYPES.find(t => t.id === a.type)?.name}
      </Badge>
    )},
    { key: "version", label: "版本", render: (a) => <span className="font-mono text-sm">{a.version}</span> },
    { key: "status", label: "状态", render: (a) => {
      const statusInfo = ASSET_STATUSES.find(s => s.id === a.status);
      return (
        <Badge variant={a.status === "APPROVED" ? "default" : a.status === "REVIEW" ? "secondary" : "destructive"}>
          {statusInfo?.name || a.status}
        </Badge>
      );
    }},
    { key: "lifecycleStage", label: "生命周期", render: (a) => (
      <Badge variant="outline">{a.lifecycleStage}</Badge>
    )},
    { key: "creator", label: "创建者", render: (a) => <span className="text-sm">{a.creator}</span> },
    { key: "uploadDate", label: "上传时间", render: (a) => <span className="text-xs text-gray-500">{formatDateTime(a.uploadDate)}</span> },
    { key: "expiryDate", label: "过期日期", render: (a) => <span className="text-xs text-gray-500">{formatDateTime(a.expiryDate)}</span> },
    { key: "actions", label: "操作", render: (a) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ];

  const handleSubmit = () => {
    console.log("Uploading asset:", newAsset);
    setNewAsset({ name: "", type: "DOCUMENT", project: "proj_1", description: "" });
    setShowUploadDialog(false);
  };

  // 统计数据
  const totalAssets = allAssets.length;
  const approvedAssets = allAssets.filter(a => a.status === "APPROVED").length;
  const pendingAssets = allAssets.filter(a => a.status === "REVIEW").length;
  const documentAssets = allAssets.filter(a => a.type === "DOCUMENT").length;

  return (
    <div className="p-6">
      <PageHeader
        title="资产生命周期管理"
        description="管理企业数字资产：上传、审核、版本控制和访问权限"
        actions={
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                上传资产
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>上传新资产</DialogTitle>
                <DialogDescription>添加新的数字资产到系统中</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">资产名称</Label>
                  <Input
                    id="name"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                    placeholder="输入资产文件名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>资产类型</Label>
                  <Select value={newAsset.type} onValueChange={(val) => setNewAsset({...newAsset, type: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>关联项目</Label>
                  <Select value={newAsset.project} onValueChange={(val) => setNewAsset({...newAsset, project: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proj_1">Q2 Marketing Campaign</SelectItem>
                      <SelectItem value="proj_2">Customer Segmentation</SelectItem>
                      <SelectItem value="proj_3">Sales Funnel Analysis</SelectItem>
                      <SelectItem value="proj_4">Product Launch Strategy</SelectItem>
                      <SelectItem value="proj_5">UX Research Study</SelectItem>
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
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>取消</Button>
                <Button onClick={handleSubmit}>上传</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">总资产数</h3>
          </div>
          <p className="text-2xl font-bold">{totalAssets}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Upload className="h-3 w-3" /> {Math.floor(totalAssets * 0.2)} 本月新增
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">已批准资产</h3>
          </div>
          <p className="text-2xl font-bold">{approvedAssets}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Shield className="h-3 w-3" /> 合规就绪
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">待审批资产</h3>
          </div>
          <p className="text-2xl font-bold">{pendingAssets}</p>
          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3 w-3" /> 需审核
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">文档类型</h3>
          </div>
          <p className="text-2xl font-bold">{documentAssets}</p>
          <p className="text-xs text-gray-500">主要资产类型</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Input
            placeholder="搜索资产..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="类型筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部类型</SelectItem>
            {ASSET_TYPES.map(type => (
              <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部状态</SelectItem>
            {ASSET_STATUSES.map(status => (
              <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assets">资产库</TabsTrigger>
          <TabsTrigger value="versions">版本历史</TabsTrigger>
          <TabsTrigger value="lifecycle">生命周期</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-6">
          <DataTable
            columns={assetColumns}
            data={filteredAssets}
            loading={false}
            emptyMessage="没有找到资产"
          />

          <Pagination
            page={page}
            totalPages={Math.ceil(filteredAssets.length / 10)}
            onChange={setPage}
          />
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-lg font-semibold mb-4">版本控制历史</h3>
            <div className="space-y-4">
              {filteredAssets.slice(0, 5).map((asset) => (
                <div key={asset.id} className="border-l-2 border-gray-200 pl-4 py-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-sm text-gray-500">{asset.version} • {ASSET_STATUSES.find(s => s.id === asset.status)?.name} • 更新于 {formatDateTime(asset.uploadDate)}</p>
                    </div>
                    <Badge variant="outline">{ASSET_TYPES.find(t => t.id === asset.type)?.name}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">由 {asset.creator} 上传</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-6">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-lg font-semibold mb-4">资产生命周期阶段</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b">
                    <th className="pb-2">资产</th>
                    <th className="pb-2">创建</th>
                    <th className="pb-2">审查</th>
                    <th className="pb-2">批准</th>
                    <th className="pb-2">分发</th>
                    <th className="pb-2">维护</th>
                    <th className="pb-2">归档</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.slice(0, 5).map((asset) => (
                    <tr key={asset.id} className="border-b border-gray-100">
                      <td className="py-3 font-medium">{asset.name}</td>
                      <td className="py-3">
                        <div className={`w-2 h-2 rounded-full ${asset.lifecycleStage >= "Creation" ? "bg-green-500" : "bg-gray-300"}`}></div>
                      </td>
                      <td className="py-3">
                        <div className={`w-2 h-2 rounded-full ${asset.lifecycleStage >= "Review" ? "bg-green-500" : "bg-gray-300"}`}></div>
                      </td>
                      <td className="py-3">
                        <div className={`w-2 h-2 rounded-full ${asset.lifecycleStage >= "Approval" ? "bg-green-500" : "bg-gray-300"}`}></div>
                      </td>
                      <td className="py-3">
                        <div className={`w-2 h-2 rounded-full ${asset.lifecycleStage >= "Distribution" ? "bg-green-500" : "bg-gray-300"}`}></div>
                      </td>
                      <td className="py-3">
                        <div className={`w-2 h-2 rounded-full ${asset.lifecycleStage >= "Maintenance" ? "bg-green-500" : "bg-gray-300"}`}></div>
                      </td>
                      <td className="py-3">
                        <div className={`w-2 h-2 rounded-full ${asset.lifecycleStage >= "Archive" ? "bg-green-500" : "bg-gray-300"}`}></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}