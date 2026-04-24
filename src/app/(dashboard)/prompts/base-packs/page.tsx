"use client";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Edit, Clock, ChevronRight } from "lucide-react";

const SLOT_TREE = [
  { key:"S0", name:"系统人设", subs:["S0.1 角色定义","S0.2 能力边界","S0.3 客户画像"] },
  { key:"S1", name:"品牌认知", subs:["S1.1 品牌故事","S1.2 核心价值","S1.3 创始故事","S1.4 品牌VI"] },
  { key:"S2", name:"行业知识", subs:["S2.1 行业概况","S2.2 市场趋势","S2.3 技术标准"] },
  { key:"S3", name:"输入预检", subs:["S3.1 意图识别","S3.2 实体抽取"] },
  { key:"S4", name:"用户理解", subs:["S4.1 画像匹配","S4.2 需求分析"] },
  { key:"S5", name:"主执行引擎", subs:["S5.1 内容生成","S5.2 话术组装","S5.3 个性化调整"] },
  { key:"S6", name:"路由判断", subs:["S6.1 场景路由","S6.2 能力路由"] },
  { key:"S7", name:"输出格式", subs:["S7.1 结构化输出","S7.2 富文本格式"] },
  { key:"S8", name:"对抗验证", subs:["S8.1 红线扫描","S8.2 事实核查","S8.3 占位符检查"] },
  { key:"S9", name:"质量报告", subs:["S9.1 综合评分","S9.2 维度评分"] },
  { key:"S10", name:"兜底策略", subs:["S10.1 降级回复","S10.2 人工转接"] },
];

export default function BasePacksPage() {
  const { toast } = useToast();
  const [activeSub, setActiveSub] = useState("S1.1 品牌故事");
  const [expanded, setExpanded] = useState<string[]>(["S0","S1"]);
  const [scope, setScope] = useState("enterprise");
  const [templateContent, setTemplateContent] = useState(
`## 品牌故事

{品牌名称}始终坚持以「{核心理念}」为品牌基石，自{创立年份}年创立以来，已服务超过{客户数}家客户。

核心技术优势:
- {优势1}
- {优势2}
- {优势3}

品牌荣誉:
- {荣誉1}
- {荣誉2}`
  );

  const toggle = (key: string) => {
    setExpanded(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // 提取模板变量
  const vars = (templateContent.match(/\{[^}]+\}/g) || []).filter((v, i, a) => a.indexOf(v) === i);

  const { data, refetch } = trpc.basePack.list.useQuery();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="通用底座包管理" description="管理 S0-S10 各槽位的通用提示词模板" />

      <div className="flex flex-1 overflow-hidden">
        {/* ── 左侧：槽位树 ── */}
        <div className="w-56 border-r bg-gray-50/50 overflow-auto flex-shrink-0">
          <div className="py-2">
            {SLOT_TREE.map(slot => (
              <div key={slot.key}>
                <button onClick={() => toggle(slot.key)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-white">
                  <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${expanded.includes(slot.key) ? "rotate-90" : ""}`} />
                  <span className="font-mono text-blue-600">{slot.key}</span>
                  <span>{slot.name}</span>
                </button>
                {expanded.includes(slot.key) && slot.subs.map(sub => (
                  <button key={sub} onClick={() => setActiveSub(sub)}
                    className={`w-full pl-10 pr-4 py-1.5 text-xs text-left transition ${
                      activeSub === sub ? "bg-white text-brand font-medium border-r-2 border-brand" : "text-gray-500 hover:bg-white hover:text-gray-700"
                    }`}>
                    {sub}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── 右侧：编辑器 ── */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">📍 {activeSub} · 通用底座包</h2>
              <div className="text-xs text-gray-500 mt-1">为该槽位提供默认的提示词模板内容</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1 text-xs"><Clock className="h-3.5 w-3.5" /> 版本历史</Button>
              <Button size="sm" className="gap-1 text-xs bg-brand text-white"
                onClick={() => toast({ title: "已保存草稿" })}>
                <Save className="h-3.5 w-3.5" /> 保存草稿
              </Button>
              <Button size="sm" className="gap-1 text-xs bg-green-600 text-white"
                onClick={() => toast({ title: "新版本已发布" })}>
                发布新版本
              </Button>
            </div>
          </div>

          {/* 元信息 */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-gray-500">应用范围</label>
              <div className="flex gap-2 mt-1">
                {[{id:"global",label:"○ 全局"},{id:"enterprise",label:"● 指定企业"},{id:"position",label:"○ 指定岗位"}].map(o => (
                  <button key={o.id} onClick={() => setScope(o.id)}
                    className={`px-3 py-1 rounded-lg border text-xs ${scope===o.id ? "bg-brand/5 border-brand text-brand" : "text-gray-500"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500">适用企业</label>
              <select className="w-full mt-1 border rounded-lg px-3 py-1.5 text-xs">
                <option>万华灵荃</option><option>某教育集团</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500">版本</label>
              <div className="mt-1 text-sm font-mono">v2 (active)</div>
            </div>
          </div>

          {/* Markdown 模板编辑器 */}
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">内容模板 (Markdown)</span>
              <span className="text-[10px] text-gray-400">📏 模板变量: {vars.length} 个</span>
            </div>
            <textarea value={templateContent} onChange={e => setTemplateContent(e.target.value)}
              className="w-full px-4 py-3 text-sm font-mono leading-relaxed min-h-[300px] resize-y focus:outline-none"
              spellCheck={false} />
          </div>

          {/* 模板变量列表 */}
          {vars.length > 0 && (
            <div className="border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2">模板变量 ({vars.length})</h3>
              <div className="flex flex-wrap gap-2">
                {vars.map(v => (
                  <span key={v} className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-mono">{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* 已有底座包列表 */}
          <div className="border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-3">已保存的底座包</h3>
            <div className="space-y-2">
              {(data?.items || []).map((pack: any) => (
                <div key={pack.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-xs font-mono text-blue-600 mr-2">{pack.slotKey}</span>
                    <span className="text-xs">{pack.content?.slice(0, 80)}…</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{pack.scope}</span>
                    <span>v{pack.version}</span>
                  </div>
                </div>
              ))}
              {!(data?.items?.length) && <div className="text-xs text-gray-400 text-center py-4">暂无底座包</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
