'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ClassificationBadge } from '@/components/shared/ClassificationBadge';
import { trpc } from '@/lib/trpc';
import { FolderTree, Tags, ChevronRight } from 'lucide-react';

// ── 中文映射（与 ClassificationBadge 一致）──
const SOURCE_LABELS: Record<string, { text: string; icon: string; color: string }> = {
  E1_COMPANY: { text: '企业经验', icon: '🏢', color: 'bg-blue-50 border-blue-200' },
  E2_INDUSTRY: { text: '行业经验', icon: '🏭', color: 'bg-purple-50 border-purple-200' },
  E3_BOOK: { text: '书本经验', icon: '📚', color: 'bg-amber-50 border-amber-200' },
};

const CATEGORY_LABELS: Record<string, { text: string; icon: string }> = {
  CAT_WHO: { text: '身份与受众', icon: '👤' },
  CAT_WHAT: { text: '产品与卖点', icon: '📦' },
  CAT_HOW: { text: '方法与流程', icon: '⚙️' },
  CAT_STYLE: { text: '风格与表达', icon: '🎨' },
  CAT_FENCE: { text: '红线与合规', icon: '🚫' },
  CAT_PROOF: { text: '证据与案例', icon: '📊' },
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  WHO_BRAND: '品牌定位', WHO_ROLE: '角色人格', WHO_AUDIENCE: '受众画像', WHO_TERM: '术语规范',
  WHAT_PRODUCT: '产品信息', WHAT_USP: '差异卖点', WHAT_PRICE: '价格体系', WHAT_CERT: '权威背书',
  HOW_SOP: '标准流程', HOW_METHOD: '方法论', HOW_TACTIC: '技巧策略', HOW_BEST: '最佳实践',
  STYLE_HOOK: '钩子库', STYLE_WORD: '词库', STYLE_TONE: '语言风格', STYLE_RHYTHM: '结构节奏',
  FENCE_BAN: '禁用清单', FENCE_ALLOW: '白名单', FENCE_LAW: '法规合规', FENCE_BLUR: '模糊处理',
  PROOF_CASE: '成功案例', PROOF_DATA: '数据报告', PROOF_FAIL: '反面教训', PROOF_COMPARE: '对比分析',
};

const SCENE_TAGS: Record<string, string[]> = {
  岗位: ['销售岗','客服岗','运营岗','技术支持','培训讲师','市场推广','管理层','新媒体运营','直播主播','社群运营','投手','BD'],
  平台: ['小红书','抖音','微信','快手','淘宝','京东','官网','线下'],
  受众: ['宝妈','年轻白领','中老年','装修业主','设计师','经销商','工程客户','高端客户'],
  业务线: ['零售','工程','加盟','电商','定制','批发'],
};

interface SelectedNode {
  source: string;
  category?: string;
  subcategory?: string;
  path: string;
}

export default function TaxonomyPage() {
  // TODO: 从 URL 或 context 获取 projectId，这里先用硬编码占位
  const projectId = 'default'; // 请替换为实际的 projectId 来源

  const [mainTab, setMainTab] = useState<'tree' | 'scene'>('tree');
  const [expandedSources, setExpandedSources] = useState<string[]>(['E1_COMPANY']);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const { data: treeData, isLoading } = trpc.taxonomy.getTree.useQuery(
    { projectId },
    { enabled: mainTab === 'tree' }
  );

  const { data: atomsData } = trpc.taxonomy.getAtomsByClassification.useQuery(
    {
      projectId,
      experienceSource: selectedNode?.source || '',
      category: selectedNode?.category,
      subcategory: selectedNode?.subcategory,
    },
    { enabled: !!selectedNode }
  );

  const toggleSource = (key: string) =>
    setExpandedSources(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
  const toggleCat = (key: string) =>
    setExpandedCats(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="分类体系" />

      {/* Tab 切换 */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setMainTab('tree')}
            className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              mainTab === 'tree' ? 'border-brand text-brand' : 'border-transparent text-gray-500'
            }`}
          >
            <FolderTree size={14} /> 三级分类树
          </button>
          <button
            onClick={() => setMainTab('scene')}
            className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
              mainTab === 'scene' ? 'border-brand text-brand' : 'border-transparent text-gray-500'
            }`}
          >
            <Tags size={14} /> 场景标签
          </button>
        </div>
      </div>

      {mainTab === 'tree' && (
        <div className="flex gap-6">
          {/* ── 左侧：三级分类树 ── */}
          <div className="w-80 shrink-0">
            {/* 总计统计 */}
            {treeData && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-500 flex gap-4">
                <span>🧱 原子块 {treeData.totalAtoms}</span>
                <span>❓ QA 对 {treeData.totalQA}</span>
                <span>📂 路径 72 条</span>
              </div>
            )}

            <div className="border rounded-xl p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {isLoading && <div className="text-xs text-gray-400 p-4">加载中...</div>}
              {treeData?.tree.map(source => {
                const sl = SOURCE_LABELS[source.key] || { text: source.key, icon: '📁', color: 'bg-gray-50' };
                return (
                  <div key={source.key}>
                    {/* 一级：ExperienceSource */}
                    <button
                      onClick={() => toggleSource(source.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg hover:bg-white transition ${sl.color} border`}
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight size={12} className={`transition ${expandedSources.includes(source.key) ? 'rotate-90' : ''}`} />
                        {sl.icon} {sl.text}
                      </span>
                      <span className="text-xs text-gray-400">{source.atomCount}</span>
                    </button>

                    {expandedSources.includes(source.key) && source.categories.map(cat => {
                      const cl = CATEGORY_LABELS[cat.key] || { text: cat.key, icon: '📂' };
                      const catKey = `${source.key}|${cat.key}`;
                      return (
                        <div key={cat.key} className="ml-4">
                          {/* 二级：ContentCategory */}
                          <button
                            onClick={() => toggleCat(catKey)}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-gray-700 rounded hover:bg-white transition"
                          >
                            <span className="flex items-center gap-1.5">
                              <ChevronRight size={10} className={`transition ${expandedCats.includes(catKey) ? 'rotate-90' : ''}`} />
                              {cl.icon} {cl.text}
                            </span>
                            <span className="text-gray-400">{cat.atomCount}</span>
                          </button>

                          {expandedCats.includes(catKey) && cat.subcategories.map(sub => {
                            const subLabel = SUBCATEGORY_LABELS[sub.key] || sub.key;
                            const isSelected = selectedNode?.subcategory === sub.key
                              && selectedNode?.source === source.key
                              && selectedNode?.category === cat.key;
                            return (
                              <button
                                key={sub.key}
                                onClick={() => setSelectedNode({
                                  source: source.key,
                                  category: cat.key,
                                  subcategory: sub.key,
                                  path: `${sl.text} → ${cl.text} → ${subLabel}`,
                                })}
                                className={`w-full flex items-center justify-between ml-6 px-3 py-1 text-xs rounded transition ${
                                  isSelected
                                    ? 'bg-white text-brand font-medium border-r-2 border-brand'
                                    : 'text-gray-500 hover:bg-white'
                                }`}
                              >
                                <span>● {subLabel}</span>
                                <span className="flex items-center gap-2">
                                  <span className="text-gray-400">({sub.atomCount})</span>
                                  {sub.slots.length > 0 && (
                                    <span className="text-[9px] text-gray-300">{sub.slots.join(',')}</span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 右侧：节点详情 ── */}
          <div className="flex-1">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="text-xs text-gray-400">📍 {selectedNode.path}</div>
                <ClassificationBadge
                  experienceSource={selectedNode.source}
                  category={selectedNode.category}
                  subcategory={selectedNode.subcategory}
                  showSlots={true}
                />

                {/* 统计卡片 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">🧱 原子块数量</div>
                    <div className="text-xl font-bold mt-1">{atomsData?.total ?? 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">📋 Slot 映射</div>
                    <div className="text-sm font-medium mt-1">
                      {selectedNode.subcategory
                        ? (SUBCATEGORY_LABELS[selectedNode.subcategory] || selectedNode.subcategory)
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* 原子块列表 */}
                <div className="border rounded-xl">
                  <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium">该节点下的原子块</div>
                  {atomsData?.atoms.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-400">暂无原子块</div>
                  )}
                  {atomsData?.atoms.map(atom => (
                    <div key={atom.id} className="px-4 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={atom.status === 'ACTIVE' ? '🟢' : '🟡'}></span>
                          <span className="text-sm">{atom.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{atom.layer}</span>
                          <span>{atom.wordCount} 字</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(atomsData?.total ?? 0) > 20 && (
                    <div className="px-4 py-2 text-center">
                      <button className="text-xs text-brand hover:underline">查看完整列表 →</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                ← 从左侧选择一个分类节点查看详情
              </div>
            )}
          </div>
        </div>
      )}

      {mainTab === 'scene' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(SCENE_TAGS).map(([category, tags]) => (
            <div key={category} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">{category}</span>
                <span className="text-xs text-gray-400">{tags.length} 个标签</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 cursor-pointer transition">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
