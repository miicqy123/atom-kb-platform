"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { formatDateTime } from "@/lib/utils";
import { Save, Shield, Cloud, Database, Lock, Bell, Activity, Server, Key, Eye, CheckCircle, AlertTriangle, Clock, Trash2, Plus } from "lucide-react";

export default function SystemConfigurationPage() {
  const [config, setConfig] = useState({
    // Security settings
    enable2FA: true,
    passwordMinLength: 12,
    sessionTimeout: 180,
    loginAttempts: 5,

    // Performance settings
    cacheTTL: 3600,
    apiRateLimit: 1000,
    maxConcurrentRequests: 50,

    // Notification settings
    emailNotifications: true,
    webhookEnabled: true,
    slackIntegration: false,

    // Integration settings
    auditLogging: true,
    backupFrequency: "daily",
    retentionPeriod: 30,
  });

  const handleSave = () => {
    console.log("Saving system configuration:", config);
    // Simulate API call
    alert("系统配置已保存！");
  };

  return (
    <div>
      <PageHeader
        title="系统配置"
        description="全局系统参数、安全设置和集成配置"
        actions={
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            保存配置
          </Button>
        }
      />

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="performance">性能配置</TabsTrigger>
          <TabsTrigger value="notifications">通知设置</TabsTrigger>
          <TabsTrigger value="integrations">系统集成</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  身份验证设置
                </CardTitle>
                <CardDescription>配置用户身份验证和会话管理</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>双因素认证 (2FA)</Label>
                    <p className="text-xs text-gray-500">强制所有用户使用 2FA</p>
                  </div>
                  <Switch
                    checked={config.enable2FA}
                    onCheckedChange={(checked) => setConfig({...config, enable2FA: checked})}
                  />
                </div>

                <div>
                  <Label htmlFor="passwordMinLength">密码最小长度</Label>
                  <Select value={config.passwordMinLength.toString()} onValueChange={(val) => setConfig({...config, passwordMinLength: parseInt(val)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8 字符</SelectItem>
                      <SelectItem value="10">10 字符</SelectItem>
                      <SelectItem value="12">12 字符</SelectItem>
                      <SelectItem value="16">16 字符</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">会话超时 (分钟)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={config.sessionTimeout}
                    onChange={(e) => setConfig({...config, sessionTimeout: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="loginAttempts">最大登录尝试次数</Label>
                  <Input
                    id="loginAttempts"
                    type="number"
                    value={config.loginAttempts}
                    onChange={(e) => setConfig({...config, loginAttempts: parseInt(e.target.value) || 0})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  安全策略
                </CardTitle>
                <CardDescription>配置系统安全和合规策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>加密协议</Label>
                  <div className="flex items-center justify-between mt-2">
                    <span>TLS 1.3</span>
                    <Badge variant="success">推荐</Badge>
                  </div>
                </div>

                <div>
                  <Label>安全头设置</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span>HSTS</span>
                      <Badge variant="success">启用</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>XSS Protection</span>
                      <Badge variant="success">启用</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Content Security Policy</span>
                      <Badge variant="success">启用</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>审计日志</Label>
                    <p className="text-xs text-gray-500">记录所有系统操作</p>
                  </div>
                  <Switch
                    checked={config.auditLogging}
                    onCheckedChange={(checked) => setConfig({...config, auditLogging: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  缓存设置
                </CardTitle>
                <CardDescription>配置系统缓存策略和TTL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cacheTTL">缓存TTL (秒)</Label>
                  <Input
                    id="cacheTTL"
                    type="number"
                    value={config.cacheTTL}
                    onChange={(e) => setConfig({...config, cacheTTL: parseInt(e.target.value) || 0})}
                  />
                  <p className="text-xs text-gray-500 mt-1">默认 1小时 (3600秒)</p>
                </div>

                <div>
                  <Label>缓存引擎</Label>
                  <Select defaultValue="redis">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="redis">Redis</SelectItem>
                      <SelectItem value="memcached">Memcached</SelectItem>
                      <SelectItem value="builtin">内置缓存</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>缓存压缩</Label>
                  <div className="flex items-center justify-between mt-2">
                    <span>启用数据压缩</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-purple-500" />
                  请求限制
                </CardTitle>
                <CardDescription>配置API速率限制和并发请求</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="apiRateLimit">API速率限制 (每分钟)</Label>
                  <Input
                    id="apiRateLimit"
                    type="number"
                    value={config.apiRateLimit}
                    onChange={(e) => setConfig({...config, apiRateLimit: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="maxConcurrentRequests">最大并发请求数</Label>
                  <Input
                    id="maxConcurrentRequests"
                    type="number"
                    value={config.maxConcurrentRequests}
                    onChange={(e) => setConfig({...config, maxConcurrentRequests: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label>请求队列大小</Label>
                  <Input type="number" defaultValue={1000} />
                </div>

                <div>
                  <Label>连接池大小</Label>
                  <Input type="number" defaultValue={20} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  通知渠道
                </CardTitle>
                <CardDescription>配置系统通知和告警渠道</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>邮件通知</Label>
                    <p className="text-xs text-gray-500">发送关键系统通知</p>
                  </div>
                  <Switch
                    checked={config.emailNotifications}
                    onCheckedChange={(checked) => setConfig({...config, emailNotifications: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Webhook通知</Label>
                    <p className="text-xs text-gray-500">向外部系统推送事件</p>
                  </div>
                  <Switch
                    checked={config.webhookEnabled}
                    onCheckedChange={(checked) => setConfig({...config, webhookEnabled: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Slack集成</Label>
                    <p className="text-xs text-gray-500">在Slack频道发送通知</p>
                  </div>
                  <Switch
                    checked={config.slackIntegration}
                    onCheckedChange={(checked) => setConfig({...config, slackIntegration: checked})}
                  />
                </div>

                <div>
                  <Label>通知模板</Label>
                  <Select defaultValue="default">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">默认模板</SelectItem>
                      <SelectItem value="custom">自定义模板</SelectItem>
                      <SelectItem value="enterprise">企业模板</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  告警设置
                </CardTitle>
                <CardDescription>配置系统健康和性能告警</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>CPU使用率告警</Label>
                  <Input type="number" defaultValue={80} placeholder="%阈值" />
                </div>

                <div>
                  <Label>内存使用率告警</Label>
                  <Input type="number" defaultValue={85} placeholder="%阈值" />
                </div>

                <div>
                  <Label>磁盘空间告警</Label>
                  <Input type="number" defaultValue={90} placeholder="%阈值" />
                </div>

                <div>
                  <Label>响应时间告警</Label>
                  <Input type="number" defaultValue={5000} placeholder="毫秒" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  外部服务
                </CardTitle>
                <CardDescription>配置第三方服务集成</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>数据库连接池</Label>
                  <Input type="text" defaultValue="postgresql://localhost:5432/enterprise_db" placeholder="数据库连接字符串" />
                </div>

                <div>
                  <Label>消息队列</Label>
                  <Input type="text" defaultValue="amqp://localhost:5672" placeholder="消息队列连接字符串" />
                </div>

                <div>
                  <Label>对象存储</Label>
                  <Input type="text" defaultValue="https://s3.amazonaws.com/enterprise-bucket" placeholder="S3/MinIO端点" />
                </div>

                <div>
                  <Label>搜索引擎</Label>
                  <Input type="text" defaultValue="http://localhost:9200" placeholder="Elasticsearch端点" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-500" />
                  数据备份
                </CardTitle>
                <CardDescription>配置系统数据备份策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>备份频率</Label>
                  <Select value={config.backupFrequency} onValueChange={(val) => setConfig({...config, backupFrequency: val as any})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">每小时</SelectItem>
                      <SelectItem value="daily">每日</SelectItem>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>保留周期 (天)</Label>
                  <Input
                    type="number"
                    value={config.retentionPeriod}
                    onChange={(e) => setConfig({...config, retentionPeriod: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label>备份位置</Label>
                  <Select defaultValue="cloud">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">本地服务器</SelectItem>
                      <SelectItem value="cloud">云存储</SelectItem>
                      <SelectItem value="hybrid">混合存储</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>自动清理</Label>
                    <p className="text-xs text-gray-500">过期备份自动删除</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-gray-500" />
                API 密钥管理
              </CardTitle>
              <CardDescription>管理系统API访问密钥</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Default Service Key</h4>
                    <p className="text-sm text-gray-500">sk-************abcd</p>
                    <p className="text-xs text-gray-400">创建于 {formatDateTime(new Date(Date.now() - 86400000 * 30))}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      查看
                    </Button>
                    <Button variant="outline" size="sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      激活
                    </Button>
                    <Button variant="outline" size="sm">
                      <Clock className="h-4 w-4 mr-1" />
                      过期
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Analytics Service Key</h4>
                    <p className="text-sm text-gray-500">ak-************xyz1</p>
                    <p className="text-xs text-gray-400">创建于 {formatDateTime(new Date(Date.now() - 86400000 * 15))}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      查看
                    </Button>
                    <Button variant="outline" size="sm">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      禁用
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="mt-4 w-full">
                <Plus className="h-4 w-4 mr-2" />
                创建新API密钥
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}