"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Plus, Edit, Trash2, Globe, RotateCcw, Save, X, CheckCircle, AlertTriangle, Server, Zap, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ModelGatewayConfigPage() {
  const { toast } = useToast();
  const { projectId } = useProjectStore();
  const [activeTab, setActiveTab] = useState("routing");
  const [editingRule, setEditingRule] = useState<any>(null);
  const [newRule, setNewRule] = useState({ name: "", providerId: "openai", modelIds: [], weight: 50, priority: 1, enabled: true });
  const [newEndpoint, setNewEndpoint] = useState({ providerId: "openai", region: "", endpointUrl: "", apiKey: "" });
  const [newApiKey, setNewApiKey] = useState({ name: "", projectId: "", rateLimit: 60, callerType: "EXTERNAL" as const });

  const utils = trpc.useUtils();

  // 获取API Keys
  const { data: apiKeys, refetch: refetchApiKeys } = trpc.gateway.listApiKeys.useQuery();

  // 获取模型提供商
  const { data: providers } = trpc.modelGateway.getProviders.useQuery();

  // 获取路由规则
  const { data: routingRules, refetch: refetchRoutingRules } = trpc.modelGateway.getRoutingRules.useQuery({
    projectId: projectId
  });

  // 获取端点
  const { data: endpoints } = trpc.modelGateway.getEndpoints.useQuery();

  // 获取指定提供商的模型
  const { data: modelsByProvider } = trpc.modelGateway.getModelsByProvider.useQuery({
    providerId: newRule.providerId
  }, {
    enabled: !!newRule.providerId
  });

  // Mutation for creating routing rule
  const createRuleMutation = trpc.modelGateway.createRoutingRule.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "路由规则已创建",
      });
      utils.modelGateway.getRoutingRules.invalidate();
      refetchRoutingRules();
      setNewRule({ name: "", providerId: "openai", modelIds: [], weight: 50, priority: 1, enabled: true });
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "创建路由规则时出错",
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting routing rule
  const deleteRuleMutation = trpc.modelGateway.deleteRoutingRule.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "路由规则已删除",
      });
      utils.modelGateway.getRoutingRules.invalidate();
      refetchRoutingRules();
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "删除路由规则时出错",
        variant: "destructive",
      });
    }
  });

  // Mutation for creating endpoint
  const createEndpointMutation = trpc.modelGateway.createEndpoint.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "端点已创建",
      });
      utils.modelGateway.getEndpoints.invalidate();
      setNewEndpoint({ providerId: "openai", region: "", endpointUrl: "", apiKey: "" });
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "创建端点时出错",
        variant: "destructive",
      });
    }
  });

  // Mutation for testing endpoint
  const testEndpointMutation = trpc.modelGateway.testEndpoint.useMutation({
    onSuccess: (data) => {
      toast({
        title: "测试成功",
        description: `端点连接正常，延迟: ${data.latency}ms`,
      });
    },
    onError: (error) => {
      toast({
        title: "测试失败",
        description: error.message || "端点连接测试失败",
        variant: "destructive",
      });
    }
  });

  // Mutation for creating API key
  const createApiKeyMutation = trpc.gateway.createApiKey.useMutation({
    onSuccess: (d) => {
      toast({ title: `API Key 已创建：${d.name}`, description: `Key: ${d.key.substring(0, 12)}...` });
      refetchApiKeys();

      // Copy to clipboard
      navigator.clipboard.writeText(d.key).then(() => {
        toast({ title: "已复制", description: "API Key 已复制到剪贴板" });
      });
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "创建API Key时出错",
        variant: "destructive",
      });
    },
  });

  // Mutation for revoking API key
  const revokeApiKeyMutation = trpc.gateway.revokeApiKey.useMutation({
    onSuccess: () => {
      toast({
        title: "成功",
        description: "API Key 已撤销",
      });
      utils.gateway.listApiKeys.invalidate();
      refetchApiKeys();
    },
    onError: (error) => {
      toast({
        title: "错误",
        description: error.message || "撤销API Key时出错",
        variant: "destructive",
      });
    }
  });

  const handleSubmitRule = () => {
    createRuleMutation.mutate({
      name: newRule.name,
      providerId: newRule.providerId,
      modelIds: newRule.modelIds,
      weight: newRule.weight,
      priority: newRule.priority,
      enabled: newRule.enabled,
      projectId: projectId
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm("确定要删除此路由规则吗？")) {
      deleteRuleMutation.mutate({ id: ruleId });
    }
  };

  const handleTestEndpoint = (endpointId: string) => {
    testEndpointMutation.mutate({ id: endpointId });
  };

  const handleCreateEndpoint = () => {
    createEndpointMutation.mutate({
      providerId: newEndpoint.providerId,
      region: newEndpoint.region,
      endpointUrl: newEndpoint.endpointUrl,
      apiKey: newEndpoint.apiKey
    });
  };

  return (
    <div>
      <PageHeader
        title="模型网关配置"
        description="统一管理模型提供商接入、路由规则和负载均衡策略"
        actions={
          <Button>
            <Save className="h-4 w-4 mr-2" />
            保存配置
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="providers">模型提供商</TabsTrigger>
          <TabsTrigger value="routing">路由规则</TabsTrigger>
          <TabsTrigger value="endpoints">端点管理</TabsTrigger>
          <TabsTrigger value="balancing">负载均衡</TabsTrigger>
          <TabsTrigger value="apikeys">API 密钥</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers?.map(provider => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    {provider.name}
                  </CardTitle>
                  <CardDescription>{provider.models?.length || 0} 模型可用</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">支持的模型:</h4>
                    <div className="flex flex-wrap gap-1">
                      {provider.models?.map(model => (
                        <Badge key={model.id} variant="secondary" className="text-xs">
                          {model.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      配置
                    </Button>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="routing" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">路由规则</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新建规则
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新建路由规则</DialogTitle>
                  <DialogDescription>定义模型请求的路由逻辑</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="ruleName">规则名称</Label>
                    <Input
                      id="ruleName"
                      value={newRule.name}
                      onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                      placeholder="例如：高优先级模型"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>提供商</Label>
                    <Select value={newRule.providerId} onValueChange={(val) => setNewRule({...newRule, providerId: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providers?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>模型</Label>
                    <Select onValueChange={(val) => setNewRule({
                      ...newRule,
                      modelIds: [...newRule.modelIds, val]
                    })}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelsByProvider?.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {newRule.modelIds.map((modelId, idx) => {
                        const model = modelsByProvider?.find(m => m.id === modelId);
                        return (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {model?.name}
                            <button
                              className="ml-1 text-xs"
                              onClick={() => setNewRule({
                                ...newRule,
                                modelIds: newRule.modelIds.filter(id => id !== modelId)
                              })}
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>权重: {newRule.weight}%</Label>
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      value={newRule.weight}
                      onChange={(e) => setNewRule({...newRule, weight: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>优先级</Label>
                    <Input
                      type="number"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({...newRule, priority: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enabled"
                      checked={newRule.enabled}
                      onCheckedChange={(checked) => setNewRule({...newRule, enabled: checked})}
                    />
                    <Label htmlFor="enabled">启用规则</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewRule({ name: "", providerId: "openai", modelIds: [], weight: 50, priority: 1, enabled: true })}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmitRule}
                    disabled={createRuleMutation.isPending}
                  >
                    {createRuleMutation.isPending ? '保存中...' : '保存'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则名称</TableHead>
                <TableHead>提供商</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>权重</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routingRules?.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{providers?.find(p => p.id === rule.providerId)?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.modelConnections?.map(mc => (
                        <Badge key={mc.modelId} variant="secondary" className="text-xs">
                          {mc.model?.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{rule.weight}%</TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>
                    {rule.enabled ? (
                      <Badge variant="success">启用</Badge>
                    ) : (
                      <Badge variant="outline">禁用</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deleteRuleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="endpoints" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">端点管理</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加端点
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加新端点</DialogTitle>
                  <DialogDescription>配置模型提供商的API端点信息</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>提供商</Label>
                    <Select value={newEndpoint.providerId} onValueChange={(val) => setNewEndpoint({...newEndpoint, providerId: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providers?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">区域</Label>
                    <Input
                      id="region"
                      value={newEndpoint.region}
                      onChange={(e) => setNewEndpoint({...newEndpoint, region: e.target.value})}
                      placeholder="例如：us-east-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">端点URL</Label>
                    <Input
                      id="endpoint"
                      value={newEndpoint.endpointUrl}
                      onChange={(e) => setNewEndpoint({...newEndpoint, endpointUrl: e.target.value})}
                      placeholder="https://api.provider.com/v1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API密钥</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={newEndpoint.apiKey}
                      onChange={(e) => setNewEndpoint({...newEndpoint, apiKey: e.target.value})}
                      placeholder="输入API密钥"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">取消</Button>
                  <Button
                    onClick={handleCreateEndpoint}
                    disabled={createEndpointMutation.isPending}
                  >
                    {createEndpointMutation.isPending ? '保存中...' : '保存'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>提供商</TableHead>
                <TableHead>区域</TableHead>
                <TableHead>端点</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints?.map(endpoint => (
                <TableRow key={endpoint.id}>
                  <TableCell>
                    <Badge variant="outline">{providers?.find(p => p.id === endpoint.providerId)?.name}</Badge>
                  </TableCell>
                  <TableCell>{endpoint.region}</TableCell>
                  <TableCell className="font-mono text-xs">{endpoint.endpointUrl}</TableCell>
                  <TableCell>
                    {endpoint.status === "ACTIVE" ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> 活跃
                      </Badge>
                    ) : endpoint.status === "DEGRADED" ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> 降级
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <X className="h-3 w-3" /> 不活跃
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestEndpoint(endpoint.id)}
                        disabled={testEndpointMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="balancing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>负载均衡策略</CardTitle>
              <CardDescription>配置模型请求的分发算法和故障转移机制</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>分发算法</Label>
                    <Select defaultValue="weighted-round-robin">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round-robin">轮询</SelectItem>
                        <SelectItem value="weighted-round-robin">加权轮询</SelectItem>
                        <SelectItem value="least-connections">最少连接</SelectItem>
                        <SelectItem value="response-time">响应时间</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>故障检测阈值</Label>
                    <Select defaultValue="3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1次失败</SelectItem>
                        <SelectItem value="2">2次失败</SelectItem>
                        <SelectItem value="3">3次失败</SelectItem>
                        <SelectItem value="5">5次失败</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="failover" defaultChecked />
                    <Label htmlFor="failover">启用故障转移</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="health-check" defaultChecked />
                    <Label htmlFor="health-check">启用健康检查</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="circuit-breaker" defaultChecked />
                    <Label htmlFor="circuit-breaker">启用熔断器</Label>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-md font-semibold mb-2">当前负载分布</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">OpenAI (primary)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: "65%" }}></div>
                        </div>
                        <span className="text-xs">65%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Anthropic (secondary)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: "25%" }}></div>
                        </div>
                        <span className="text-xs">25%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Mistral (fallback)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-600 h-2 rounded-full" style={{ width: "10%" }}></div>
                        </div>
                        <span className="text-xs">10%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apikeys" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">API 密钥管理</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  创建 API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建新的 API Key</DialogTitle>
                  <DialogDescription>为项目生成用于访问 API 的认证密钥</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyName">密钥名称</Label>
                    <Input
                      id="apiKeyName"
                      value={newApiKey.name}
                      onChange={(e) => setNewApiKey({...newApiKey, name: e.target.value})}
                      placeholder="例如：生产环境应用"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyProject">项目</Label>
                    <Select value={newApiKey.projectId} onValueChange={(val) => setNewApiKey({...newApiKey, projectId: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择项目" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* 这里应该有项目列表，但为了简化，我们暂时保留此占位符 */}
                        <SelectItem value={projectId}>{projectId}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rateLimit">速率限制 (每分钟)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      value={newApiKey.rateLimit}
                      onChange={(e) => setNewApiKey({...newApiKey, rateLimit: parseInt(e.target.value) || 60})}
                      min="1"
                      max="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>调用者类型</Label>
                    <Select value={newApiKey.callerType} onValueChange={(val) => setNewApiKey({...newApiKey, callerType: val as any})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL">内部</SelectItem>
                        <SelectItem value="EXTERNAL">外部</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewApiKey({ name: "", projectId: projectId, rateLimit: 60, callerType: "EXTERNAL" })}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={() => createApiKeyMutation.mutate({
                      name: newApiKey.name,
                      projectId: newApiKey.projectId || projectId,
                      rateLimit: newApiKey.rateLimit,
                      callerType: newApiKey.callerType
                    })}
                    disabled={createApiKeyMutation.isPending}
                  >
                    {createApiKeyMutation.isPending ? '创建中...' : '创建'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>项目</TableHead>
                <TableHead>速率限制</TableHead>
                <TableHead>调用者类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys?.map(key => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {key.key.substring(0, 12)}...
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 p-1 h-auto"
                      onClick={() => {
                        navigator.clipboard.writeText(key.key);
                        toast({ title: "已复制", description: "API Key 已复制到剪贴板" });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TableCell>
                  <TableCell>{key.projectId}</TableCell>
                  <TableCell>{key.rateLimit}/分钟</TableCell>
                  <TableCell>
                    <Badge variant={(key.callerType as any) === 'INTERNAL' ? 'default' : 'outline'}>
                      {key.callerType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {key.isActive ? (
                      <Badge variant="default">激活</Badge>
                    ) : (
                      <Badge variant="outline">已停用</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!key.isActive ? (
                        <Button variant="outline" size="sm" disabled>
                          已撤销
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeApiKeyMutation.mutate({ id: key.id })}
                          disabled={revokeApiKeyMutation.isPending}
                        >
                          撤销
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}