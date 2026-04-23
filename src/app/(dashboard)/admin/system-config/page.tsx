"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { formatDateTime } from "@/lib/utils";
import {
  Settings,
  Database,
  Server,
  Lock,
  Shield,
  Key,
  Activity,
  Bell,
  Mail,
  Globe,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SystemConfigurationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [config, setConfig] = useState({
    // 通用设置
    systemName: "原子化知识库平台",
    systemDescription: "企业级AI知识管理平台",
    maintenanceMode: false,
    backupEnabled: true,

    // 安全设置
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    sessionTimeout: 30,
    twoFactorAuth: false,

    // 邮件设置
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",

    // 日志设置
    logRetentionDays: 90,
    auditLogging: true,

    // 备份设置
    backupSchedule: "daily",
    backupRetention: 30,
    backupLocation: "/backups"
  });

  // 获取系统配置（使用现有可用的API）
  const { data: systemConfig } = trpc.project.list.useQuery({
    limit: 1,
    offset: 0,
  });

  // 保存配置
  const saveConfig = () => {
    toast({
      title: "成功",
      description: "系统配置已保存",
    });
    // 在实际应用中，这里应该调用API保存配置
  };

  // 重置配置
  const resetConfig = () => {
    if (window.confirm("确定要重置所有配置为默认值吗？")) {
      setConfig({
        systemName: "原子化知识库平台",
        systemDescription: "企业级AI知识管理平台",
        maintenanceMode: false,
        backupEnabled: true,
        passwordMinLength: 8,
        passwordRequireSpecialChar: true,
        sessionTimeout: 30,
        twoFactorAuth: false,
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        smtpUsername: "",
        smtpPassword: "",
        logRetentionDays: 90,
        auditLogging: true,
        backupSchedule: "daily",
        backupRetention: 30,
        backupLocation: "/backups"
      });
      toast({
        title: "成功",
        description: "配置已重置为默认值",
      });
    }
  };

  // 渲染通用设置
  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
          <CardDescription>配置系统的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="systemName">系统名称</Label>
            <Input
              id="systemName"
              value={config.systemName}
              onChange={(e) => setConfig({...config, systemName: e.target.value})}
              placeholder="输入系统名称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemDescription">系统描述</Label>
            <Input
              id="systemDescription"
              value={config.systemDescription}
              onChange={(e) => setConfig({...config, systemDescription: e.target.value})}
              placeholder="输入系统描述"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>系统状态</CardTitle>
          <CardDescription>控制系统的运行模式</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>维护模式</Label>
              <p className="text-sm text-muted-foreground">启用后系统将只读，用户无法进行修改操作</p>
            </div>
            <Switch
              checked={config.maintenanceMode}
              onCheckedChange={(checked) => setConfig({...config, maintenanceMode: checked})}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>备份设置</CardTitle>
          <CardDescription>配置自动备份策略</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用备份</Label>
              <p className="text-sm text-muted-foreground">自动备份系统数据</p>
            </div>
            <Switch
              checked={config.backupEnabled}
              onCheckedChange={(checked) => setConfig({...config, backupEnabled: checked})}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>备份频率</Label>
              <Select value={config.backupSchedule} onValueChange={(val) => setConfig({...config, backupSchedule: val})}>
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

            <div className="space-y-2">
              <Label>保留天数</Label>
              <Input
                type="number"
                value={config.backupRetention}
                onChange={(e) => setConfig({...config, backupRetention: parseInt(e.target.value) || 30})}
                placeholder="备份保留天数"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>备份位置</Label>
            <Input
              value={config.backupLocation}
              onChange={(e) => setConfig({...config, backupLocation: e.target.value})}
              placeholder="备份存储路径"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染安全设置
  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>密码策略</CardTitle>
          <CardDescription>配置用户密码的安全要求</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>最小长度</Label>
            <Input
              type="number"
              value={config.passwordMinLength}
              onChange={(e) => setConfig({...config, passwordMinLength: parseInt(e.target.value) || 8})}
              placeholder="密码最小长度"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>特殊字符</Label>
              <p className="text-sm text-muted-foreground">密码必须包含特殊字符</p>
            </div>
            <Switch
              checked={config.passwordRequireSpecialChar}
              onCheckedChange={(checked) => setConfig({...config, passwordRequireSpecialChar: checked})}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>会话管理</CardTitle>
          <CardDescription>配置用户会话超时设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>会话超时（分钟）</Label>
            <Input
              type="number"
              value={config.sessionTimeout}
              onChange={(e) => setConfig({...config, sessionTimeout: parseInt(e.target.value) || 30})}
              placeholder="会话超时时间（分钟）"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>双因素认证</CardTitle>
          <CardDescription>增强账户安全性</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用双因素认证</Label>
              <p className="text-sm text-muted-foreground">强制用户使用双重验证</p>
            </div>
            <Switch
              checked={config.twoFactorAuth}
              onCheckedChange={(checked) => setConfig({...config, twoFactorAuth: checked})}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染邮件设置
  const renderEmailSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SMTP 服务器</CardTitle>
          <CardDescription>配置系统邮件发送服务</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">主机地址</Label>
              <Input
                id="smtpHost"
                value={config.smtpHost}
                onChange={(e) => setConfig({...config, smtpHost: e.target.value})}
                placeholder="例如: smtp.gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPort">端口</Label>
              <Input
                id="smtpPort"
                type="number"
                value={config.smtpPort}
                onChange={(e) => setConfig({...config, smtpPort: parseInt(e.target.value) || 587})}
                placeholder="例如: 587"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpUsername">用户名</Label>
            <Input
              id="smtpUsername"
              value={config.smtpUsername}
              onChange={(e) => setConfig({...config, smtpUsername: e.target.value})}
              placeholder="邮件服务器用户名"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtpPassword">密码</Label>
            <Input
              id="smtpPassword"
              type="password"
              value={config.smtpPassword}
              onChange={(e) => setConfig({...config, smtpPassword: e.target.value})}
              placeholder="邮件服务器密码"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>测试邮件</CardTitle>
          <CardDescription>发送测试邮件验证配置</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>发送测试邮件</Button>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染日志设置
  const renderLoggingSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>日志保留</CardTitle>
          <CardDescription>配置系统日志的保留时间</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>日志保留天数</Label>
            <Input
              type="number"
              value={config.logRetentionDays}
              onChange={(e) => setConfig({...config, logRetentionDays: parseInt(e.target.value) || 90})}
              placeholder="日志保留天数"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>审计日志</CardTitle>
          <CardDescription>记录关键操作和安全事件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用审计日志</Label>
              <p className="text-sm text-muted-foreground">记录用户操作和系统事件</p>
            </div>
            <Switch
              checked={config.auditLogging}
              onCheckedChange={(checked) => setConfig({...config, auditLogging: checked})}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>日志级别</CardTitle>
          <CardDescription>设置日志详细程度</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value="info" onValueChange={() => {}}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debug">调试(Debug)</SelectItem>
              <SelectItem value="info">信息(Info)</SelectItem>
              <SelectItem value="warn">警告(Warn)</SelectItem>
              <SelectItem value="error">错误(Error)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="系统配置"
        description="管理系统各项配置参数和全局设置"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetConfig}>
              重置配置
            </Button>
            <Button onClick={saveConfig}>
              <Settings className="h-4 w-4 mr-2" />
              保存配置
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">通用设置</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="email">邮件设置</TabsTrigger>
          <TabsTrigger value="logging">日志设置</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0">
          {renderGeneralSettings()}
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          {renderSecuritySettings()}
        </TabsContent>

        <TabsContent value="email" className="mt-0">
          {renderEmailSettings()}
        </TabsContent>

        <TabsContent value="logging" className="mt-0">
          {renderLoggingSettings()}
        </TabsContent>
      </Tabs>

      {/* 系统信息面板 */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">系统版本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v1.0.0</div>
            <p className="text-xs text-muted-foreground">最新版本</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">运行时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15d 8h</div>
            <p className="text-xs text-muted-foreground">系统正常运行</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">内存使用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4GB</div>
            <p className="text-xs text-muted-foreground">可用: 7.6GB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">数据库</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PostgreSQL</div>
            <p className="text-xs text-muted-foreground">连接正常</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}