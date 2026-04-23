"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { LayerBadge } from "@/components/ui/LayerBadge";
import { ChevronRight, ChevronDown, Plus, Tag, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import TagDialog from "@/components/knowledge/TagDialog";
import DimensionDialog from "@/components/knowledge/DimensionDialog";
import { useToast } from "@/hooks/use-toast";

const LAYERS = [{ key: "A", name: "A 认知层", range: "1-5" }, { key: "B", name: "B 技能层", range: "6-15" }, { key: "C", name: "C 风格红线层", range: "16-20" }, { key: "D", name: "D 系统合规层", range: "21-30" }];
const SLOTS = ["S0","S1","S2","S3","S4","S5","S6","S7","S8","S9","S10"];

export default function TaxonomyPage() {
  const [activeTab, setActiveTab] = useState<"tree" | "tags">("tree");
  const [expandedLayers, setExpandedLayers] = useState<string[]>(["A"]);
  const [selectedDim, setSelectedDim] = useState<number | null>(1);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [showDimDialog, setShowDimDialog] = useState(false);
  const [editingDim, setEditingDim] = useState<any>(null);

  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: dimensions } = trpc.taxonomy.dimensions.useQuery({});
  const { data: scenarioTags } = trpc.taxonomy.scenarioTags.useQuery({});

  const deleteTagMutation = trpc.taxonomy.deleteTag.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "标签已成功删除",
      });
      utils.taxonomy.scenarioTags.invalidate(); // 使缓存失效
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除标签时出现错误",
        variant: "destructive",
      });
    }
  });

  const deleteDimensionMutation = trpc.taxonomy.deleteDimension.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "维度已成功删除",
      });
      utils.taxonomy.dimensions.invalidate(); // 使缓存失效
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除维度时出现错误",
        variant: "destructive",
      });
    }
  });

  const toggleLayer = (key: string) => setExpandedLayers(prev => prev.includes(key) ? prev.filter(l => l !== key) : [...prev, key]);

  return (
    <div>
      <PageHeader title="分类树与标签管理" description="管理 30 维度 × ABCD 层级 × S0-S10 槽位 × 场景标签" />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTab("tree")} className={`rounded-lg px-4 py-2 text-sm ${activeTab === "tree" ? "bg-brand text-white" : "border"}`}>分类树</button>
        <button onClick={() => setActiveTab("tags")} className={`rounded-lg px-4 py-2 text-sm ${activeTab === "tags" ? "bg-brand text-white" : "border"}`}>场景标签</button>
      </div>

      {activeTab === "tree" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">层级 → 维度 → 槽位</h3>
              <Button size="sm" variant="outline" onClick={() => setShowDimDialog(true)}>
                <Plus className="h-3 w-3 mr-1" />
                新建
              </Button>
            </div>
            <div className="space-y-1">
              {LAYERS.map(layer => (
                <div key={layer.key}>
                  <button onClick={() => toggleLayer(layer.key)} className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                    {expandedLayers.includes(layer.key) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <LayerBadge layer={layer.key} />
                    <span className="text-gray-500 text-xs">维度 {layer.range}</span>
                  </button>
                  {expandedLayers.includes(layer.key) && (dimensions ?? []).filter((d: any) => d.layer === layer.key).map((dim: any) => (
                    <div key={dim.number} className="ml-6 flex items-center justify-between">
                      <button onClick={() => setSelectedDim(dim.number)}
                        className={`flex items-center gap-2 w-full rounded-lg px-2 py-1 text-xs hover:bg-gray-50 ${selectedDim === dim.number ? "bg-blue-50 text-brand" : ""}`}>
                        <span className="font-mono text-gray-400">D{dim.number}</span>
                        {dim.name}
                      </button>
                      <div className="flex gap-1">
                        <Button size="xs" variant="ghost" onClick={() => {
                          setEditingDim(dim);
                          setShowDimDialog(true);
                        }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => {
                          if (window.confirm(`确定要删除维度 ${dim.number} (${dim.name}) 吗？此操作不可撤销。`)) {
                            deleteDimensionMutation.mutate({ id: dim.id });
                          }
                        }} disabled={deleteDimensionMutation.isPending}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold mb-3">维度 {selectedDim} 详情</h3>
            {selectedDim && (
              <div>
                <p className="text-sm text-gray-600 mb-3">{dimensions?.find((d: any) => d.number === selectedDim)?.name}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-gray-500">原子块数量</p>
                    <p className="text-lg font-bold text-brand">—</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3">
                    <p className="text-xs text-gray-500">QA 对数量</p>
                    <p className="text-lg font-bold text-purple-600">—</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-xs text-gray-500">关联蓝图</p>
                    <p className="text-lg font-bold text-green-600">—</p>
                  </div>
                </div>
                <h4 className="text-xs font-semibold mt-4 mb-2">槽位映射</h4>
                <div className="flex flex-wrap gap-1">
                  {SLOTS.map(s => <span key={s} className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-600">{s}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tags" && (
        <div className="grid grid-cols-2 gap-6">
          {["position", "platform", "audience", "business_line"].map(type => (
            <div key={type} className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold capitalize">
                  {type === "position" ? "岗位标签" :
                   type === "platform" ? "平台标签" :
                   type === "audience" ? "受众标签" : "业务线标签"}
                </h3>
                <button className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => setShowTagDialog(true)}>
                  <Plus className="inline h-3 w-3 mr-1" /> 新增
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(scenarioTags ?? []).filter((t: any) => t.type === type).map((tag: any) => (
                  <div key={tag.id} className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                    <Tag className="h-3 w-3 text-gray-400" />
                    {tag.name}
                    <div className="flex gap-1 ml-1">
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setEditingTag(tag);
                          setShowTagDialog(true);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (window.confirm(`确定要删除标签 "${tag.name}" 吗？此操作不可撤销。`)) {
                            deleteTagMutation.mutate({ id: tag.id });
                          }
                        }}
                        disabled={deleteTagMutation.isPending}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {(scenarioTags ?? []).filter((t: any) => t.type === type).length === 0 &&
                 <span className="text-xs text-gray-400">暂无标签</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <TagDialog
        open={showTagDialog}
        onOpenChange={setShowTagDialog}
        tag={editingTag}
        onComplete={() => {
          setShowTagDialog(false);
          setEditingTag(null);
        }}
      />

      <DimensionDialog
        open={showDimDialog}
        onOpenChange={setShowDimDialog}
        dimension={editingDim}
        onComplete={() => {
          setShowDimDialog(false);
          setEditingDim(null);
        }}
      />
    </div>
  );
}