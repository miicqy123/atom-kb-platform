"use client";
import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/ui/PageHeader";
import { Upload, FileText, Database, Settings, Search, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { trpc } from '@/lib/trpc';
import { useToast } from "@/hooks/use-toast";
import UploadDialog from '@/components/knowledge/UploadDialog';

export default function RawMaterialsPage() {
  const { toast } = useToast();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('test-project');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data: userData } = trpc.user.getCurrent.useQuery();

  const { data: projectsData, isLoading: projectsLoading } = trpc.project.list.useQuery({
    workspaceId: userData?.workspaces?.[0]?.workspaceId || 'default-workspace-id',
    limit: 100
  }, {
    enabled: !!userData
  });

  const {
    data: rawData,
    isLoading: rawLoading,
    refetch
  } = trpc.raw.getAll.useQuery({
    projectId: selectedProjectId,
    search: searchTerm,
    limit: 100
  }, {
    enabled: !!selectedProjectId
  });

  const { data: statsData } = trpc.raw.getStats.useQuery({
    projectId: selectedProjectId
  }, {
    enabled: !!selectedProjectId
  });

  const deleteMutation = trpc.raw.delete.useMutation({
    onSuccess: () => {
      toast({ title: "删除成功", description: "素材已成功删除" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message || "删除素材时出现错误", variant: "destructive" });
    },
  });

  // ── 新增：生产线触发 ──────────────────────────────────────────
  const processMutation = trpc.pipeline.processRaw.useMutation({
    onSuccess: (data) => {
      toast({ title: `处理完成，生成 ${data.atomsCreated} 个原子块` });
      refetch();
    },
    onError: (e) => toast({ title: '处理失败', description: e.message, variant: 'destructive' }),
  });
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (projectsData?.items && projectsData.items.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsData.items[0].id);
    }
  }, [projectsData, selectedProjectId]);

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这个素材吗？此操作不可撤销。")) {
      deleteMutation.mutate({ id });
    }
  };

  const totalFiles = Number(statsData?.total || 0);
  const convertedFiles = Number(statsData?.byStatus?.find((s: any) => s.conversionStatus === 'CONVERTED')?._count || 0);
  const pendingFiles = Number(statsData?.byStatus?.find((s: any) => s.conversionStatus === 'PENDING')?._count || 0);
  const processingFiles = Number(statsData?.byStatus?.find((s: any) => s.conversionStatus === 'CONVERTING')?._count || 0);

  const filteredFiles = rawData?.items?.filter(file => {
    const matchesSearch = !searchTerm ||
      file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.originalFileName && file.originalFileName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFormat = filterFormat === 'ALL' || file.format === filterFormat;
    const matchesStatus = filterStatus === 'ALL' || file.conversionStatus === filterStatus;
    return matchesSearch && matchesFormat && matchesStatus;
  }) || [];

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'CONVERTED': return '已处理';
      case 'CONVERTING': return '处理中';
      case 'PENDING': return '待处理';
      case 'FAILED': return '失败';
      default: return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case 'CONVERTED': return 'success';
      case 'CONVERTING': return 'processing';
      case 'PENDING': return 'default';
      case 'FAILED': return 'destructive';
      default: return 'default';
    }
  };

  const getFileIcon = (format: string) => {
    switch(format) {
      case 'PDF': return <FileText className="h-5 w-5 text-red-500" />;
      case 'WORD': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'EXCEL': return <FileText className="h-5 w-5 text-green-500" />;
      case 'PPT': return <FileText className="h-5 w-5 text-orange-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw 素材管理"
        description="管理企业上传的原始资料文件，启动格式归一与双轨加工"
        actions={
          <Button
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark"
            onClick={() => setIsUploadDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />上传素材
          </Button>
        }
      />
      <UploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        projectId={selectedProjectId}
      />

      {projectsData?.items && projectsData.items.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>项目选择</CardTitle>
            <CardDescription>请选择要管理素材的项目</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {projectsData.items.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="files">文件管理</TabsTrigger>
          <TabsTrigger value="process">处理状态</TabsTrigger>
          <TabsTrigger value="settings">配置</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总文件数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalFiles}</div>
                <p className="text-xs text-muted-foreground">+18% 上月</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已处理</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(convertedFiles)}</div>
                <p className="text-xs text-muted-foreground">+22% 上月</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">待处理</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(pendingFiles)}</div>
                <p className="text-xs text-muted-foreground">-5 今日</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">成功率</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(totalFiles) > 0 ? Math.round((Number(convertedFiles) / Number(totalFiles)) * 100) + '%' : '0%'}
                </div>
                <p className="text-xs text-muted-foreground">+1.2% 上月</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>最近上传的文件</CardTitle>
              <CardDescription>查看最新上传的原始素材文件</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFiles.slice(0, 5).map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      {getFileIcon(file.format)}
                      <div>
                        <div className="font-medium">{file.title}</div>
                        <div className="text-sm text-gray-500">
                          {file.originalFileName} • 上传于 {new Date(file.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(file.conversionStatus)}>
                        {getStatusDisplay(file.conversionStatus)}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* ── 新增：生产线按钮 ── */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processMutation.mutate({ rawId: file.id, projectId: selectedProjectId })}
                        disabled={processMutation.isPending || file.conversionStatus === 'CONVERTED'}
                      >
                        {processMutation.isPending ? '处理中…' : '▶ 生产线'}
                      </Button>
                      {/* ───────────────────── */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredFiles.length === 0 && !rawLoading && (
                  <div className="text-center py-8 text-gray-500">暂无文件，请点击上传素材</div>
                )}
                {rawLoading && (
                  <div className="text-center py-8 text-gray-500">加载中...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>文件管理</CardTitle>
              <CardDescription>管理您的所有原始素材文件</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="relative max-w-sm w-full">
                  <Input
                    type="text"
                    placeholder="搜索文件..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <select
                    value={filterFormat}
                    onChange={(e) => setFilterFormat(e.target.value)}
                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="ALL">全部类型</option>
                    <option value="PDF">PDF</option>
                    <option value="WORD">Word</option>
                    <option value="EXCEL">Excel</option>
                    <option value="PPT">PowerPoint</option>
                    <option value="AUDIO">音频</option>
                    <option value="VIDEO">视频</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="ALL">全部状态</option>
                    <option value="PENDING">待处理</option>
                    <option value="CONVERTING">处理中</option>
                    <option value="CONVERTED">已处理</option>
                    <option value="FAILED">失败</option>
                  </select>
                </div>
              </div>

              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">文件名</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">格式</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大小</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上传时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getFileIcon(file.format)}
                            <div className="ml-2 font-medium">{file.title}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.format}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.fileSize ? (file.fileSize / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusBadgeVariant(file.conversionStatus)}>
                            {getStatusDisplay(file.conversionStatus)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => alert(`预览功能 - ${file.title}`)}
                            className="mr-2"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          {/* ── 新增：生产线按钮 ── */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => processMutation.mutate({ rawId: file.id, projectId: selectedProjectId })}
                            disabled={processMutation.isPending || file.conversionStatus === 'CONVERTED'}
                            className="mr-2"
                          >
                            {processMutation.isPending ? '处理中…' : '▶ 生产线'}
                          </Button>
                          {/* ───────────────────── */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(file.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredFiles.length === 0 && !rawLoading && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">暂无匹配的文件</td>
                      </tr>
                    )}
                    {rawLoading && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">加载中...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process">
          <Card>
            <CardHeader>
              <CardTitle>处理状态</CardTitle>
              <CardDescription>监控文件处理进度和状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFiles
                  .filter(f => f.conversionStatus !== 'CONVERTED')
                  .map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">格式: {item.format} • 类型: {item.materialType}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(item.conversionStatus)}>
                        {getStatusDisplay(item.conversionStatus)}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>进度</span>
                        <span>
                          {item.conversionStatus === 'CONVERTED' ? '100%' :
                           item.conversionStatus === 'CONVERTING' ? '65%' : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        {(() => {
                          const barWidth = item.conversionStatus === 'CONVERTED' ? '100%'
                            : item.conversionStatus === 'CONVERTING' ? '65%'
                            : '0%';
                          const barColor = item.conversionStatus === 'CONVERTED' ? 'bg-green-500'
                            : item.conversionStatus === 'CONVERTING' ? 'bg-blue-500' : 'bg-yellow-500';
                          return (
                            <div
                              className={`h-2 rounded-full ${barColor}`}
                              style={{ width: barWidth }}
                            ></div>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const etaText = item.conversionStatus === 'CONVERTED' ? '已完成'
                            : item.conversionStatus === 'CONVERTING' ? '预计5分钟'
                            : '即将开始';
                          return `ETA: ${etaText}`;
                        })()}
                      </p>
                    </div>
                  </Card>
                ))}
                {filteredFiles.filter(f => f.conversionStatus !== 'CONVERTED').length === 0 && !rawLoading && (
                  <div className="text-center py-8 text-gray-500">所有文件都已处理完成</div>
                )}
                {rawLoading && (
                  <div className="text-center py-8 text-gray-500">加载中...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>处理配置</CardTitle>
              <CardDescription>配置文件处理的参数和规则</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">处理优先级</label>
                  <select className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand">
                    <option>标准 (默认)</option>
                    <option>高优先级</option>
                    <option>低优先级</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">格式转换选项</label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input type="checkbox" id="convert-pdf" className="rounded" defaultChecked />
                      <label htmlFor="convert-pdf" className="ml-2 text-sm">PDF 文档转换</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="extract-images" className="rounded" defaultChecked />
                      <label htmlFor="extract-images" className="ml-2 text-sm">图像内容提取</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="ocr-text" className="rounded" />
                      <label htmlFor="ocr-text" className="ml-2 text-sm">OCR 文本识别</label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">存储保留策略</label>
                  <select className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand">
                    <option>永久保存</option>
                    <option>保存1年</option>
                    <option>保存6个月</option>
                    <option>保存1个月</option>
                  </select>
                </div>
                <Button className="w-full bg-brand hover:bg-brand-dark text-white">保存配置</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}