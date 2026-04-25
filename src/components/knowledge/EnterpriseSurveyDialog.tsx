"use client";
import { useState } from "react";
import { X, ChevronDown, ChevronRight, Building2, Package, Target, MessageSquare, ShieldAlert, Palette, Check, ArrowLeft, ArrowRight } from "lucide-react";

interface EnterpriseSurveyDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SurveyData) => void;
  submitting?: boolean;
}

export interface SurveyData {
  // 区块 1: 公司概况
  companyName: string;
  industry: string;
  coreValues: string;
  competitiveAdvantage: string;
  // 区块 2: 产品/服务信息
  productName: string;
  coreSelling: string;
  targetPrice: string;
  differentiation: string;
  // 区块 3: 目标受众
  targetAudience: string;
  ageRange: string;
  region: string;
  painPoints: string;
  // 区块 4: 销售话术/案例
  openingScript: string;
  objectionHandling: string;
  successCases: string;
  // 区块 5: 合规红线
  forbiddenPromises: string;
  regulations: string;
  sensitiveTopics: string;
  mandatoryDisclosures: string;
  // 区块 6: 品牌调性指南
  brandTone: string;
  wordingRules: string;
  visualStyle: string;
  bannedWords: string;
}

const INITIAL_DATA: SurveyData = {
  companyName: "", industry: "", coreValues: "", competitiveAdvantage: "",
  productName: "", coreSelling: "", targetPrice: "", differentiation: "",
  targetAudience: "", ageRange: "", region: "", painPoints: "",
  openingScript: "", objectionHandling: "", successCases: "",
  forbiddenPromises: "", regulations: "", sensitiveTopics: "", mandatoryDisclosures: "",
  brandTone: "", wordingRules: "", visualStyle: "", bannedWords: "",
};

interface Section {
  id: number;
  icon: React.ReactNode;
  title: string;
  fields: { key: keyof SurveyData; label: string; type: "input" | "textarea"; placeholder: string; half?: boolean }[];
}

const SECTIONS: Section[] = [
  {
    id: 1, icon: <Building2 className="w-4 h-4" />, title: "公司概况",
    fields: [
      { key: "companyName", label: "公司名称", type: "input", placeholder: "请输入公司全称", half: true },
      { key: "industry", label: "所属行业", type: "input", placeholder: "如：金融、教育、医疗", half: true },
      { key: "coreValues", label: "核心价值", type: "textarea", placeholder: "公司的核心价值主张和使命" },
      { key: "competitiveAdvantage", label: "竞争优势", type: "textarea", placeholder: "相较竞品的独特优势" },
    ],
  },
  {
    id: 2, icon: <Package className="w-4 h-4" />, title: "产品/服务信息",
    fields: [
      { key: "productName", label: "产品名称", type: "input", placeholder: "主要产品或服务名称", half: true },
      { key: "coreSelling", label: "核心卖点", type: "input", placeholder: "一句话核心卖点", half: true },
      { key: "targetPrice", label: "目标价位", type: "input", placeholder: "价格区间或定价策略", half: true },
      { key: "differentiation", label: "差异化", type: "input", placeholder: "与竞品的关键差异", half: true },
    ],
  },
  {
    id: 3, icon: <Target className="w-4 h-4" />, title: "目标受众",
    fields: [
      { key: "targetAudience", label: "目标客群画像", type: "textarea", placeholder: "描述典型客户特征" },
      { key: "ageRange", label: "年龄范围", type: "input", placeholder: "如：25-45 岁", half: true },
      { key: "region", label: "目标地域", type: "input", placeholder: "如：一二线城市", half: true },
      { key: "painPoints", label: "痛点需求", type: "textarea", placeholder: "客户面临的主要问题和需求" },
    ],
  },
  {
    id: 4, icon: <MessageSquare className="w-4 h-4" />, title: "销售话术/案例",
    fields: [
      { key: "openingScript", label: "典型开场白", type: "textarea", placeholder: "销售开场白示例" },
      { key: "objectionHandling", label: "常见异议处理", type: "textarea", placeholder: "客户常见异议及应对方式" },
      { key: "successCases", label: "成功案例", type: "textarea", placeholder: "典型成功案例描述" },
    ],
  },
  {
    id: 5, icon: <ShieldAlert className="w-4 h-4" />, title: "合规红线",
    fields: [
      { key: "forbiddenPromises", label: "禁止承诺", type: "textarea", placeholder: "不可向客户承诺的内容" },
      { key: "regulations", label: "法规限制", type: "textarea", placeholder: "相关法律法规要求" },
      { key: "sensitiveTopics", label: "敏感话题", type: "textarea", placeholder: "需要回避的话题" },
      { key: "mandatoryDisclosures", label: "必须披露", type: "textarea", placeholder: "必须告知客户的信息" },
    ],
  },
  {
    id: 6, icon: <Palette className="w-4 h-4" />, title: "品牌调性指南",
    fields: [
      { key: "brandTone", label: "品牌语气", type: "textarea", placeholder: "如：专业但亲切、严谨但不刻板" },
      { key: "wordingRules", label: "用词规范", type: "textarea", placeholder: "推荐用词和禁用表达" },
      { key: "visualStyle", label: "视觉风格描述", type: "textarea", placeholder: "品牌视觉调性描述" },
      { key: "bannedWords", label: "禁用词", type: "textarea", placeholder: "严禁在对外沟通中使用的词语" },
    ],
  },
];

export default function EnterpriseSurveyDialog({ open, onClose, onSubmit, submitting }: EnterpriseSurveyDialogProps) {
  const [data, setData] = useState<SurveyData>({ ...INITIAL_DATA });
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([1]));
  const [currentStep, setCurrentStep] = useState(0); // 0 = overview, 1-6 = sections

  if (!open) return null;

  const toggleSection = (id: number) => {
    const next = new Set(expandedSections);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedSections(next);
  };

  const updateField = (key: keyof SurveyData, value: string) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const filledCount = SECTIONS.reduce((acc, s) => {
    const filled = s.fields.filter(f => data[f.key]?.trim()).length;
    return acc + (filled > 0 ? 1 : 0);
  }, 0);

  const handleSubmit = () => {
    if (!data.companyName.trim()) {
      alert("请至少填写公司名称");
      return;
    }
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">企业调研采集表</h2>
              <p className="text-xs text-gray-500">已填写 {filledCount}/6 个区块</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 进度指示 */}
            <div className="flex gap-1">
              {SECTIONS.map(s => {
                const filled = s.fields.some(f => data[f.key]?.trim());
                return (
                  <div key={s.id} className={`w-2 h-2 rounded-full ${filled ? "bg-blue-600" : "bg-gray-200"}`} />
                );
              })}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {SECTIONS.map(section => {
            const isExpanded = expandedSections.has(section.id);
            const filledFields = section.fields.filter(f => data[f.key]?.trim()).length;
            return (
              <div key={section.id} className="border rounded-xl overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className="text-blue-600">{section.icon}</span>
                  <span className="text-sm font-medium">区块 {section.id} · {section.title}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {filledFields}/{section.fields.length} 已填
                  </span>
                  {filledFields === section.fields.length && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </button>

                {/* Section fields */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t bg-gray-50/50">
                    <div className="grid grid-cols-2 gap-3">
                      {section.fields.map(field => (
                        <div key={field.key} className={field.half ? "col-span-1" : "col-span-2"}>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">{field.label}</label>
                          {field.type === "input" ? (
                            <input
                              value={data[field.key]}
                              onChange={e => updateField(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <textarea
                              value={data[field.key]}
                              onChange={e => updateField(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            取消
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">提交后将生成 Markdown 并存入素材库</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !data.companyName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {submitting ? "提交中..." : "提交并保存"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 将调研数据转换为结构化 Markdown */
export function surveyToMarkdown(data: SurveyData): string {
  const lines: string[] = [];
  lines.push(`# ${data.companyName || "企业调研"} — 企业调研报告`);
  lines.push("");
  lines.push(`> 调研时间：${new Date().toLocaleDateString("zh-CN")}`);
  lines.push("");

  // 区块 1
  lines.push("## 一、公司概况");
  lines.push("");
  if (data.companyName) lines.push(`- **公司名称：** ${data.companyName}`);
  if (data.industry) lines.push(`- **所属行业：** ${data.industry}`);
  if (data.coreValues) { lines.push(""); lines.push("### 核心价值"); lines.push(""); lines.push(data.coreValues); }
  if (data.competitiveAdvantage) { lines.push(""); lines.push("### 竞争优势"); lines.push(""); lines.push(data.competitiveAdvantage); }
  lines.push("");

  // 区块 2
  lines.push("## 二、产品/服务信息");
  lines.push("");
  if (data.productName) lines.push(`- **产品名称：** ${data.productName}`);
  if (data.coreSelling) lines.push(`- **核心卖点：** ${data.coreSelling}`);
  if (data.targetPrice) lines.push(`- **目标价位：** ${data.targetPrice}`);
  if (data.differentiation) lines.push(`- **差异化：** ${data.differentiation}`);
  lines.push("");

  // 区块 3
  lines.push("## 三、目标受众");
  lines.push("");
  if (data.targetAudience) lines.push(data.targetAudience);
  if (data.ageRange) lines.push(`\n- **年龄范围：** ${data.ageRange}`);
  if (data.region) lines.push(`- **目标地域：** ${data.region}`);
  if (data.painPoints) { lines.push(""); lines.push("### 痛点需求"); lines.push(""); lines.push(data.painPoints); }
  lines.push("");

  // 区块 4
  lines.push("## 四、销售话术/案例");
  lines.push("");
  if (data.openingScript) { lines.push("### 典型开场白"); lines.push(""); lines.push(data.openingScript); lines.push(""); }
  if (data.objectionHandling) { lines.push("### 常见异议处理"); lines.push(""); lines.push(data.objectionHandling); lines.push(""); }
  if (data.successCases) { lines.push("### 成功案例"); lines.push(""); lines.push(data.successCases); lines.push(""); }

  // 区块 5
  lines.push("## 五、合规红线");
  lines.push("");
  if (data.forbiddenPromises) { lines.push("### 禁止承诺"); lines.push(""); lines.push(data.forbiddenPromises); lines.push(""); }
  if (data.regulations) { lines.push("### 法规限制"); lines.push(""); lines.push(data.regulations); lines.push(""); }
  if (data.sensitiveTopics) { lines.push("### 敏感话题"); lines.push(""); lines.push(data.sensitiveTopics); lines.push(""); }
  if (data.mandatoryDisclosures) { lines.push("### 必须披露"); lines.push(""); lines.push(data.mandatoryDisclosures); lines.push(""); }

  // 区块 6
  lines.push("## 六、品牌调性指南");
  lines.push("");
  if (data.brandTone) { lines.push("### 品牌语气"); lines.push(""); lines.push(data.brandTone); lines.push(""); }
  if (data.wordingRules) { lines.push("### 用词规范"); lines.push(""); lines.push(data.wordingRules); lines.push(""); }
  if (data.visualStyle) { lines.push("### 视觉风格"); lines.push(""); lines.push(data.visualStyle); lines.push(""); }
  if (data.bannedWords) { lines.push("### 禁用词"); lines.push(""); lines.push(data.bannedWords); lines.push(""); }

  return lines.join("\n");
}
