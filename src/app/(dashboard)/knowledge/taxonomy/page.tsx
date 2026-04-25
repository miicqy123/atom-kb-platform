"use client";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Plus, Edit, Archive, FolderTree, Tags } from "lucide-react";

/* ── 树形数据 ── */
const LAYERS = [
  { id:"A", name:"A 认知层", color:"#6366f1", icon:"🅰️" },
  { id:"B", name:"B 技能层", color:"#06b6d4", icon:"🅱️" },
  { id:"C", name:"C 风格红线层", color:"#f97316", icon:"🅲" },
  { id:"D", name:"D 系统合规层", color:"#8b5cf6", icon:"🅳" },
];

type TreeNode = {
  id: string;
  name: string;
  atomCount: number;
  children?: TreeNode[];
};

const TREE_DATA: Record<string, TreeNode[]> = {
  A: [
    { id:"d1", name:"维度1 品牌定位", atomCount:0, children:[
      { id:"s0.1", name:"S0.1 角色定义", atomCount:12 },
      { id:"s1.2", name:"S1.2 核心价值", atomCount:8 },
    ]},
    { id:"d2", name:"维度2 品牌故事", atomCount:0, children:[
      { id:"s1.1", name:"S1.1 品牌故事", atomCount:23 },
      { id:"s1.3", name:"S1.3 创始故事", atomCount:5 },
    ]},
    { id:"d3", name:"维度3 产品卖点", atomCount:0, children:[
      { id:"s2.3a", name:"S2.3 技术标准", atomCount:18 },
    ]},
    { id:"d4", name:"维度4 技术参数", atomCount:0, children:[
      { id:"s2.3b", name:"S2.3 技术标准", atomCount:6 },
    ]},
    { id:"d5", name:"维度5 工艺流程", atomCount:0, children:[{ id:"s2.1", name:"S2.1 行业概况", atomCount:3 }] },
    { id:"d6", name:"维度6 原料溯源", atomCount:0, children:[{ id:"s2.2", name:"S2.2 市场趋势", atomCount:8 }] },
    { id:"d7", name:"维度7 价值主张", atomCount:0, children:[
      { id:"s1.2b", name:"S1.2 核心价值", atomCount:15 },
    ]},
  ],
  B: [
    { id:"bd8", name:"维度8 对标竞品", atomCount:0, children:[
      { id:"bs5.1", name:"S5.1 内容生成", atomCount:18 },
    ]},
    { id:"bd10", name:"维度10 场景痛点", atomCount:0, children:[
      { id:"bs4.2", name:"S4.2 需求分析", atomCount:20 },
    ]},
  ],
  C: [
    { id:"cd28", name:"维度28 质量控制", atomCount:0, children:[
      { id:"cs8.1", name:"S8.1 红线扫描", atomCount:8 },
    ]},
  ],
  D: [
    { id:"dd30", name:"维度30 合规声明", atomCount:0, children:[
      { id:"ds10.1", name:"S10.1 降级回复", atomCount:12 },
    ]},
  ],
};

const SCENE_TAGS = {
  岗位: ["销售岗","客服岗","运营岗","技术支持","培训讲师","市场推广","管理层","新媒体运营","直播主播","社群运营","投手","BD"],
  平台: ["小红书","抖音","微信","快手","淘宝","京东","官网","线下"],
  受众: ["宝妈","年轻白领","中老年","装修业主","设计师","经销商","工程客户","高端客户"],
  业务线: ["零售","工程","加盟","电商","定制","批发"],
};

export default function TaxonomyPage() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<"tree" | "scene">("tree");
  const [expandedLayers, setExpandedLayers] = useState<string[]>(["A"]);
  const [expandedDims, setExpandedDims] = useState<string[]>(["d2"]);
  const [selectedNode, setSelectedNode] = useState<{ path: string; name: string; atomCount: number } | null>(
    { path: "A > 维度2 品牌故事 > S1.1", name: "S1.1 品牌故事", atomCount: 23 }
  );

  const toggleLayer = (id: string) => setExpandedLayers(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleDim = (id: string) => setExpandedDims(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="分类树与标签管理" description="管理知识分类体系和场景标签" />

      {/* Tab */}
      <div className="border-b px-6">
        <div className="flex gap-6">
          <button onClick={() => setMainTab("tree")}
            className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              mainTab === "tree" ? "border-brand text-brand" : "border-transparent text-gray-500"
            }`}>
            <FolderTree className="h-4 w-4" /> 分类树
          </button>
          <button onClick={() => setMainTab("scene")}
            className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              mainTab === "scene" ? "border-brand text-brand" : "border-transparent text-gray-500"
            }`}>
            <Tags className="h-4 w-4" /> 场景标签
          </button>
        </div>
      </div>

      {mainTab === "tree" && (
        <div className="flex flex-1 overflow-hidden">
          {/* ── 左侧：树形导航 ── */}
          <div className="w-72 border-r overflow-auto bg-gray-50/30">
            <div className="p-3">
              {LAYERS.map(layer => (
                <div key={layer.id}>
                  <button onClick={() => toggleLayer(layer.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-white transition">
                    <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expandedLayers.includes(layer.id) ? "rotate-90" : ""}`} />
                    <span style={{ color: layer.color }}>{layer.icon} {layer.name}</span>
                  </button>

                  {expandedLayers.includes(layer.id) && (TREE_DATA[layer.id] || []).map(dim => (
                    <div key={dim.id} className="ml-4">
                      <button onClick={() => toggleDim(dim.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 rounded hover:bg-white">
                        <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${expandedDims.includes(dim.id) ? "rotate-90" : ""}`} />
                        {dim.name}
                      </button>

                      {expandedDims.includes(dim.id) && dim.children?.map(sub => (
                        <button key={sub.id}
                          onClick={() => setSelectedNode({ path: `${layer.id} > ${dim.name} > ${sub.name.split(" ")[0]}`, name: sub.name, atomCount: sub.atomCount })}
                          className={`w-full flex items-center justify-between ml-8 px-3 py-1 text-xs rounded transition ${
                            selectedNode?.name === sub.name ? "bg-white text-brand font-medium border-r-2 border-brand" : "text-gray-500 hover:bg-white"
                          }`}>
                          <span>● {sub.name}</span>
                          <span className="text-[10px] text-gray-400">({sub.atomCount})</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── 右侧：节点详情 ── */}
          <div className="flex-1 overflow-auto p-6">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="text-xs text-gray-500">📍 当前选中: {selectedNode.path}</div>
                <h2 className="text-lg font-bold">{selectedNode.name}</h2>

                {/* 统计 */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "原子块数量", value: selectedNode.atomCount, icon: "🧱" },
                    { label: "QA 对数量", value: Math.floor(selectedNode.atomCount * 0.65), icon: "❓" },
                    { label: "关联蓝图数", value: Math.floor(selectedNode.atomCount * 0.35), icon: "📋" },
                  ].map(stat => (
                    <div key={stat.label} className="border rounded-xl p-4 bg-white">
                      <div className="text-xs text-gray-500">{stat.icon} {stat.label}</div>
                      <div className="text-2xl font-bold mt-1">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* 该节点下的原子块 */}
                <div className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-600">
                    该节点下的原子块
                  </div>
                  <div className="divide-y">
                    {[
                      { name: "品牌故事-核心", status: "🟢", gran: "Atom" },
                      { name: "品牌故事-创业历程", status: "🟢", gran: "Atom" },
                      { name: "品牌理念话术包", status: "🟢", gran: "Pack" },
                      { name: "品牌VI规范", status: "🟡", gran: "Atom" },
                    ].slice(0, Math.min(4, selectedNode.atomCount)).map((atom, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                        <div className="flex items-center gap-2 text-sm">
                          <span>{atom.status}</span>
                          <span className="font-medium">{atom.name}</span>
                          <Badge variant="outline" className="text-[10px]">{atom.gran}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t">
                    <button className="text-xs text-blue-600 hover:text-blue-800">查看完整列表 →</button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs"><Edit className="h-3.5 w-3.5" /> 编辑节点</Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs"><Plus className="h-3.5 w-3.5" /> 新增子节点</Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs text-gray-500"><Archive className="h-3.5 w-3.5" /> 归档</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                ← 从左侧选择一个节点查看详情
              </div>
            )}
          </div>
        </div>
      )}

      {mainTab === "scene" && (
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {Object.entries(SCENE_TAGS).map(([category, tags]) => (
            <div key={category} className="border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold">{category}</h3>
                <span className="text-xs text-gray-400">{tags.length} 个标签</span>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium group flex items-center gap-1 hover:bg-blue-100 cursor-pointer">
                    {tag}
                  </span>
                ))}
                <button className="px-3 py-1.5 border border-dashed rounded-full text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400">
                  + 添加
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
