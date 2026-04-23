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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { formatDateTime } from "@/lib/utils";
import { Plus, Edit, Trash2, Database, FileText, Image, Video, Archive, Upload, Download, ExternalLink, Clock, CheckCircle, AlertTriangle, Shield } from "lucide-react";

const ASSETS = [
  { id: "asset_1", name: "Q2_Marketing_Report.pdf", type: "DOCUMENT", size: "2.4MB", version: "v2.1", status: "APPROVED", creator: "zhang.san", project: "proj_1", tags: ["report", "marketing", "q2"], uploadDate: new Date(Date.now() - 86400000 * 5), lastAccess: new Date(Date.now() - 86400000 * 2) },
  { id: "asset_2", name: "Customer_Data_Cleaned.csv", type: "DATASET", size: "15.7MB", version: "v1.3", status: "PENDING", creator: "li.si", project: "proj_2", tags: ["data", "customer", "cleaned"], uploadDate: new Date(Date.now() - 86400000 * 10), lastAccess: new Date(Date.now() - 86400000 * 3) },
  { id: "asset_3", name: "Brand_Logo_HighRes.png", type: "IMAGE", size: "1.2MB", version: "v1.0", status: "APPROVED", creator: "wang.wu", project: "proj_3", tags: ["logo", "brand", "image"], uploadDate: new Date(Date.now() - 86400000 * 15), lastAccess: new Date(Date.now() - 86400000 * 1) },
  { id: "asset_4", name: "Product_Demo_Video.mp4", type: "VIDEO", size: "45.2MB", version: "v3.0", status: "APPROVED", creator: "zhao.liu", project: "proj_4", tags: ["demo", "video", "product"], uploadDate: new Date(Date.now() - 86400000 * 8), lastAccess: new Date(Date.now() - 86400000 * 4) },
  { id: "asset_5", name: "Market_Analysis_Model.pkl", type: "MODEL", size: "8.9MB", version: "v1.2", status: "REJECTED", creator: "qian.qi", project: "proj_5", tags: ["model", "analysis", "ml"], uploadDate: new Date(Date.now() - 86400000 * 3), lastAccess: new Date(Date.now() - 86400000 * 2) },
];

const ASSET_TYPES = [
  { id: "DOCUMENT", name: "文档", icon: <FileText className="h-4 w-4" /> },
  { id: "DATASET", name: "数据集", icon: <Database className="h-4 w-4" /> },
  { id: "IMAGE", name: "图片", icon: <Image className="h-4 w-4" /> },
  { id: "VIDEO", name: "视频", icon: <Video className="h-4 w-4" /> },
  { id: "MODEL", name: "模型", icon: <Database className="h-4 w-4" /> },
  { id: "OTHER", name: "其他", icon: <Archive className="h-4 w-4" /> },
];

export default function AssetLifecycleManagementPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("assets");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", type: "DOCUMENT", project: "proj_1", description: "" });

  const assetColumns: Column<any>[] = [
    { key: "name", label: "资产名称", render: (a) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-oc/10 flex items-center justify-center">
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
    { key: "status", label: "状态", render: (a) => (
      <Badge variant={a.status === "APPROVED" ? "default" : a.status === "PENDING" ? "secondary" : "destructive"}>
        {a.status === "APPROVED" ? "已批准" : a.status === "PENDING" ? "待审批" : "已拒绝"}
      </Badge>
    )},
    { key: "creator", label: "创建者", render: (a) => <span className="text-sm capitalize">{a.creator.replace(".", " ")}</span> },
    { key: "project", label: "项目", render: (a) => <Badge variant="secondary">{a.project.replace("proj_", "Project ")}</Badge> },
    { key: "uploadDate", label: "上传时间", render: (a) => <span className="text-xs text-gray-500">{formatDateTime(a.uploadDate)}</span> },
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

  return (
    <div>
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

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold">总资产数</h3>
          </div>
          <p className="text-2xl font-bold">{ASSETS.length}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Upload className="h-3 w-3" /> 5 本周新增
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold">已批准资产</h3>
          </div>
          <p className="text-2xl font-bold">{ASSETS.filter(a => a.status === "APPROVED").length}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <Shield className="h-3 w-3" /> 合规就绪
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">待审批资产</h3>
          </div>
          <p className="text-2xl font-bold">{ASSETS.filter(a => a.status === "PENDING").length}</p>
          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3 w-3" /> 需审核
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">文档类型</h3>
          </div>
          <p className="text-2xl font-bold">{ASSETS.filter(a => a.type === "DOCUMENT").length}</p>
          <p className="text-xs text-gray-500">主要资产类型</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assets">资产库</TabsTrigger>
          <TabsTrigger value="versions">版本历史</TabsTrigger>
          <TabsTrigger value="access">访问控制</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-6">
          <DataTable
            columns={assetColumns}
            data={ASSETS}
            loading={false}
            emptyMessage="没有找到资产"
          />

          <Pagination
            page={page}
            totalPages={Math.ceil(ASSETS.length / 10)}
            onChange={setPage}
          />
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-lg font-semibold mb-4">版本控制历史</h3>
            <div className="space-y-4">
              <div className="border-l-2 border-oc pl-4 py-1">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">Q2_Marketing_Report.pdf</p>
                    <p className="text-sm text-gray-500">v2.1 • 已批准 • 更新于 {formatDateTime(new Date(Date.now() - 86400000 * 2))}</p>
                  </div>
                  <Badge variant="outline">文档</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">由 zhang.san 上传</p>
              </div>
              <div className="border-l-2 border-gray-300 pl-4 py-1">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">Customer_Data_Cleaned.csv</p>
                    <p className="text-sm text-gray-500">v1.3 • 待审批 • 更新于 {formatDateTime(new Date(Date.now() - 86400000 * 3))}</p>
                  </div>
                  <Badge variant="outline">数据集</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">由 li.si 上传</p>
              </div>
              <div className="border-l-2 border-oc pl-4 py-1">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">Brand_Logo_HighRes.png</p>
                    <p className="text-sm text-gray-500">v1.0 • 已批准 • 更新于 {formatDateTime(new Date(Date.now() - 86400000 * 1))}</p>
                  </div>
                  <Badge variant="outline">图片</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">由 wang.wu 上传</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-lg font-semibold mb-4">资产访问控制</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">项目访问权限</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Q2 Marketing Campaign</span>
                    <Badge variant="secondary">只读</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer Segmentation</span>
                    <Badge variant="default">编辑</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales Funnel Analysis</span>
                    <Badge variant="secondary">只读</Badge>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">标签访问控制</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Marketing Assets</span>
                    <Badge variant="default">公开</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Financial Data</span>
                    <Badge variant="destructive">私有</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Internal Reports</span>
                    <Badge variant="secondary">受限</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}