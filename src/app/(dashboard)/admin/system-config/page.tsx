"use client";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Plus, Trash2, Edit, Check, Settings, Database, Cpu, Activity, Server, Eye, Play, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

/* ── 左侧配置分类 ── */
const CATEGORIES = [
  { id: "tags", label: "标签体系", icon: Settings },
  { id: "knowledge-engine", label: "知识加工引擎", icon: Cpu },
  { id: "assembly-engine", label: "装配引擎", icon: Database },
  { id: "runtime", label: "运行时", icon: Activity },
  { id: "vector", label: "向量层", icon: Server },
  { id: "observability", label: "可观测性", icon: Eye },
];

/* ── 标签体系数据 ── */
const DIMENSIONS = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  name: [
    "品牌定位","品牌故事","产品卖点","技术参数","工艺流程",
    "原料溯源","价值主张","对标竞品","客户画像","场景痛点",
    "服务承诺","售后保障","安装指导","维护保养","环保认证",
    "行业标准","法规合规","价格策略","促销活动","渠道政策",
    "培训体系","团队管理","绩效考核","客户案例","市场分析",
    "竞争情报","供应链","质量控制","创新研发","合规声明"
  ][i] || `维度${i + 1}`,
}));

const LAYERS = [
  { id: "A", name: "A 认知层", color: "#6366f1", desc: "品牌认知、行业知识等基础信息" },
  { id: "B", name: "B 技能层", color: "#06b6d4", desc: "话术技能、沟通方法等实操内容" },
  { id: "C", name: "C 风格红线层", color: "#f97316", desc: "品牌调性、违禁词、红线规则" },
  { id: "D", name: "D 系统合规层", color: "#8b5cf6", desc: "法规合规、系统指令、兜底策略" },
];

const SLOTS = [
  { key: "S0", name: "系统人设", subs: ["S0.1 角色定义","S0.2 能力边界","S0.3 客户画像"] },
  { key: "S1", name: "品牌认知", subs: ["S1.1 品牌故事","S1.2 核心价值","S1.3 创始故事","S1.4 品牌VI"] },
  { key: "S2", name: "行业知识", subs: ["S2.1 行业概况","S2.2 市场趋势","S2.3 技术标准"] },
  { key: "S3", name: "输入预检", subs: ["S3.1 意图识别","S3.2 实体抽取"] },
  { key: "S4", name: "用户理解", subs: ["S4.1 画像匹配","S4.2 需求分析"] },
  { key: "S5", name: "主执行引擎", subs: ["S5.1 内容生成","S5.2 话术组装","S5.3 个性化调整"] },
  { key: "S6", name: "路由判断", subs: ["S6.1 场景路由","S6.2 能力路由"] },
  { key: "S7", name: "输出格式", subs: ["S7.1 结构化输出","S7.2 富文本格式"] },
  { key: "S8", name: "对抗验证", subs: ["S8.1 红线扫描","S8.2 事实核查","S8.3 占位符检查"] },
  { key: "S9", name: "质量报告", subs: ["S9.1 综合评分","S9.2 维度评分"] },
  { key: "S10", name: "兜底策略", subs: ["S10.1 降级回复","S10.2 人工转接"] },
];

const SCENE_TAGS = {
  岗位: ["销售岗","客服岗","运营岗","技术支持","培训讲师","市场推广","管理层","新媒体运营","直播主播","社群运营","投手","BD"],
  平台: ["小红书","抖音","微信","快手","淘宝","京东","官网","线下"],
  受众: ["宝妈","年轻白领","中老年","装修业主","设计师","经销商","工程客户","高端客户","预算敏感","环保关注","品质追求","健康关注","颜值控","实用主义","KOL"],
  业务线: ["零售","工程","加盟","电商","定制","批发"],
};

const MATERIAL_TYPES = [
  "话术库","FAQ","对话录音","经验萃取","产品文档","培训材料",
  "竞品分析","客户案例","行业报告","政策法规","内部制度","SOP流程","视频脚本","其他"
];

export default function SystemConfigurationPage() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("tags");

  const renderTagSystem = () => (
    <div className="space-y-4">
      {/* 30维度 */}
      <ConfigSection title="30 维度枚举值管理" status={`已配置 ${DIMENSIONS.length}/30 ✅`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DIMENSIONS.map(d => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs group">
              <span><span className="text-gray-400 font-mono mr-1">D{String(d.id).padStart(2,"0")}</span> {d.name}</span>
              <button className="opacity-0 group-hover:opacity-100 transition"><Edit className="h-3 w-3 text-gray-400" /></button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2 gap-1 text-xs"><Plus className="h-3 w-3" /> 添加维度</Button>
      </ConfigSection>

      {/* ABCD 层级 */}
      <ConfigSection title="A/B/C/D 层级定义" status="已配置 4/4 ✅">
        <div className="space-y-2">
          {LAYERS.map(l => (
            <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: l.color }}>{l.id}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{l.name}</div>
                <div className="text-xs text-gray-500">{l.desc}</div>
              </div>
              <button><Edit className="h-4 w-4 text-gray-400" /></button>
            </div>
          ))}
        </div>
      </ConfigSection>

      {/* S0-S10 槽位 */}
      <ConfigSection title="S0–S10 槽位枚举值" status={`已配置 ${SLOTS.reduce((s,sl)=>s+sl.subs.length,0)} 项 ✅`}>
        <div className="space-y-2">
          {SLOTS.map(slot => (
            <details key={slot.key} className="group border rounded-lg">
              <summary className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50">
                <span className="text-sm font-medium"><span className="font-mono text-blue-600 mr-2">{slot.key}</span>{slot.name}</span>
                <span className="text-xs text-gray-400">{slot.subs.length} 子槽位</span>
              </summary>
              <div className="px-3 pb-2 space-y-1">
                {slot.subs.map((sub, i) => (
                  <div key={i} className="flex items-center justify-between pl-6 py-1 text-xs text-gray-600 group/item">
                    <span>{sub}</span>
                    <div className="flex gap-1 opacity-0 group-hover/item:opacity-100">
                      <button><Edit className="h-3 w-3 text-gray-400" /></button>
                      <button><Trash2 className="h-3 w-3 text-red-400" /></button>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="text-xs gap-1 ml-6"><Plus className="h-3 w-3" /> 添加子槽位</Button>
              </div>
            </details>
          ))}
        </div>
      </ConfigSection>

      {/* 场景标签 */}
      {Object.entries(SCENE_TAGS).map(([cat, tags]) => (
        <ConfigSection key={cat} title={`场景标签（${cat}）`} status={`已配置 ${tags.length} 个`}>
          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <span key={t} className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 group flex items-center gap-1">
                {t}
                <button className="opacity-0 group-hover:opacity-100"><Trash2 className="h-2.5 w-2.5 text-red-400" /></button>
              </span>
            ))}
            <button className="px-2.5 py-1 border border-dashed rounded-full text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400">+ 添加</button>
          </div>
        </ConfigSection>
      ))}

      {/* 材料类型 */}
      <ConfigSection title="材料类型枚举值" status={`已配置 ${MATERIAL_TYPES.length}/14 ✅`}>
        <div className="flex flex-wrap gap-2">
          {MATERIAL_TYPES.map(t => (
            <span key={t} className="px-2.5 py-1 bg-blue-50 rounded-full text-xs text-blue-700">{t}</span>
          ))}
        </div>
      </ConfigSection>
    </div>
  );

  const renderPlaceholder = (title: string) => (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      {title} 配置面板（待实现）
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="系统配置" description="管理标签体系、引擎参数和系统设置"
        actions={<Button onClick={() => toast({ title: "配置已保存" })} className="bg-brand text-white gap-2"><Check className="h-4 w-4" /> 保存配置</Button>}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧分类 */}
        <div className="w-48 border-r bg-gray-50/50 py-2 flex-shrink-0">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                activeCategory === cat.id ? "bg-white text-brand font-medium border-r-2 border-brand" : "text-gray-600 hover:bg-white"
              }`}>
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 overflow-auto p-6">
          {activeCategory === "tags" && renderTagSystem()}
          {activeCategory === "knowledge-engine" && <KnowledgeEnginePanel />}
          {activeCategory === "assembly-engine" && renderPlaceholder("装配引擎")}
          {activeCategory === "runtime" && renderPlaceholder("运行时")}
          {activeCategory === "vector" && renderPlaceholder("向量层")}
          {activeCategory === "observability" && renderPlaceholder("可观测性")}
        </div>
      </div>
    </div>
  );
}

/* ── 知识加工引擎面板 ── */
const TASK_TYPE_LABELS: Record<string, string> = {
  PDF_EXTRACT: "PDF 提取",
  IMAGE_OCR: "图片 OCR",
  SCAN_PDF_OCR: "扫描件 OCR",
};

const PROVIDER_OPTIONS = [
  { value: "OPENAI", label: "OpenAI Vision" },
  { value: "QWEN", label: "通义千问 VL" },
  { value: "LOCAL_PDFJS", label: "本地 pdfjs（仅 PDF）" },
  { value: "CUSTOM", label: "自定义 API" },
];

function KnowledgeEnginePanel() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: configs = [], isLoading } = trpc.documentParseConfig.list.useQuery({});
  const upsertMutation = trpc.documentParseConfig.upsert.useMutation({
    onSuccess: () => { utils.documentParseConfig.list.invalidate(); },
  });
  const deleteMutation = trpc.documentParseConfig.delete.useMutation({
    onSuccess: () => { utils.documentParseConfig.list.invalidate(); },
  });
  const testMutation = trpc.documentParseConfig.testConnection.useMutation({});

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<{
    taskType: "PDF_EXTRACT" | "IMAGE_OCR" | "SCAN_PDF_OCR";
    providerType: "OPENAI" | "QWEN" | "LOCAL_PDFJS" | "CUSTOM";
    modelName: string;
    apiEndpoint: string;
    apiKey: string;
    priority: number;
    monthlyLimit: number;
    enabled: boolean;
  }>({
    taskType: "PDF_EXTRACT",
    providerType: "OPENAI",
    modelName: "gpt-4o-mini",
    apiEndpoint: "",
    apiKey: "",
    priority: 0,
    monthlyLimit: 0,
    enabled: true,
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const openCreate = () => {
    setEditingId(undefined);
    setForm({ taskType: "PDF_EXTRACT", providerType: "OPENAI", modelName: "gpt-4o-mini", apiEndpoint: "", apiKey: "", priority: 0, monthlyLimit: 0, enabled: true });
    setTestResult(null);
    setShowForm(true);
  };

  const openEdit = (cfg: any) => {
    setEditingId(cfg.id);
    setForm({
      taskType: cfg.taskType,
      providerType: cfg.providerType,
      modelName: cfg.modelName,
      apiEndpoint: cfg.apiEndpoint || "",
      apiKey: cfg.apiKey || "",
      priority: cfg.priority,
      monthlyLimit: cfg.monthlyLimit,
      enabled: cfg.enabled,
    });
    setTestResult(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({ id: editingId, ...form });
      toast({ title: "保存成功" });
      setShowForm(false);
    } catch { toast({ title: "保存失败", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "已删除" });
    } catch { toast({ title: "删除失败", variant: "destructive" }); }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      const res = await testMutation.mutateAsync({
        providerType: form.providerType,
        modelName: form.modelName,
        apiEndpoint: form.apiEndpoint || undefined,
        apiKey: form.apiKey || undefined,
      });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    }
  };

  const grouped = configs.reduce<Record<string, any[]>>((acc, cfg) => {
    (acc[cfg.taskType] = acc[cfg.taskType] || []).push(cfg);
    return acc;
  }, {});

  if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">管理文档解析的 AI 模型配置，按任务类型分组。</div>
        <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" /> 添加模型</Button>
      </div>

      {Object.entries(TASK_TYPE_LABELS).map(([taskType, label]) => {
        const items = grouped[taskType] || [];
        return (
          <ConfigSection key={taskType} title={label} status={`${items.length} 个模型`}>
            {items.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">暂无配置</div>
            ) : (
              <div className="space-y-2">
                {items.map((cfg) => (
                  <div key={cfg.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800">{cfg.providerType}</span>
                        <span className="text-xs text-gray-500 truncate">{cfg.modelName}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        优先级 {cfg.priority} · 月用量 {cfg.monthlyUsed}/{cfg.monthlyLimit || "∞"}
                      </div>
                    </div>
                    <button onClick={() => openEdit(cfg)} className="text-gray-400 hover:text-gray-600"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(cfg.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </ConfigSection>
        );
      })}

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-sm font-semibold">{editingId ? "编辑模型" : "添加模型"}</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">任务类型</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.taskType}
                    onChange={e => setForm(f => ({ ...f, taskType: e.target.value as any }))}>
                    {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">提供商</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.providerType}
                    onChange={e => setForm(f => ({ ...f, providerType: e.target.value as any }))}>
                    {PROVIDER_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">模型名称</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.modelName}
                  onChange={e => setForm(f => ({ ...f, modelName: e.target.value }))} placeholder="gpt-4o-mini" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">API 端点（可选）</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.apiEndpoint}
                  onChange={e => setForm(f => ({ ...f, apiEndpoint: e.target.value }))} placeholder="https://api.openai.com/v1" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">API Key（可选）</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" type="password" value={form.apiKey}
                  onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="sk-..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">优先级</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" type="number" value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">月限额</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" type="number" value={form.monthlyLimit}
                    onChange={e => setForm(f => ({ ...f, monthlyLimit: +e.target.value }))} placeholder="0=不限" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">启用</label>
                  <div className="flex items-center h-full">
                    <input type="checkbox" className="w-4 h-4" checked={form.enabled}
                      onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
                  </div>
                </div>
              </div>

              {/* 测试连接 */}
              <div className="border-t pt-4">
                <Button variant="outline" size="sm" onClick={handleTest} className="gap-1" disabled={testMutation.isPending}>
                  <Play className="h-3 w-3" /> 测试连接
                </Button>
                {testMutation.isPending && <span className="text-xs text-gray-400 ml-2">测试中...</span>}
                {testResult && (
                  <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>取消</Button>
              <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 配置块手风琴组件 ── */
function ConfigSection({ title, status, children }: { title: string; status: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition">
        <div className="flex items-center gap-2">
          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-xs text-green-600 font-medium">{status}</span>
      </button>
      {open && <div className="p-4 border-t">{children}</div>}
    </div>
  );
}
