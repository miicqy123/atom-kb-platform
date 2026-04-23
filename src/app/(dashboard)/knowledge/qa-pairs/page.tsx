"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { Plus, Search, FlaskConical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import QADialog from "@/components/knowledge/QADialog";
import { useToast } from "@/hooks/use-toast";

export default function QAPairsPage() {
  const { currentProject } = useProjectStore();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showTest, setShowTest] = useState(false);
  const [testQ, setTestQ] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQAPair, setEditingQAPair] = useState<any>(null);

  const utils = trpc.useUtils();

  const pageSize = 20;
  const currentPage = page;
  const offset = (currentPage - 1) * pageSize;

  const { data, isLoading } = trpc.qaPair.list.useQuery({
    projectId: currentProject?.id ?? "",
    search: search || undefined,
    page: currentPage,
    pageSize: pageSize
  }, {
    enabled: !!currentProject
  });

  // 注意：暂时不启用检索测试功能，因为searchSimilar端点未在后端定义
  // const searchResult = trpc.qaPair.searchSimilar.useQuery({ projectId: currentProject?.id ?? "", question: testQ, topN: 5 }, { enabled: !!currentProject && !!testQ && showTest });

  const deleteMutation = trpc.qaPair.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "QA对已成功删除",
      });
      utils.qaPair.list.invalidate(); // 使缓存失效
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除QA对时出现错误",
        variant: "destructive",
      });
    }
  });

  const columns: Column<any>[] = [
    { key: "question", label: "Question", render: (r) => <span className="font-medium text-sm">{r.question.length > 60 ? r.question.slice(0, 60) + "…" : r.question}</span> },
    { key: "tags", label: "Tags", render: (r) => <div className="flex flex-wrap gap-1">{(r.tags ?? []).slice(0, 3).map((t: string) => <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{t}</span>)}</div> },
    { key: "status", label: "状态", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", label: "创建时间", render: (r) => <span className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</span> },
    { key: "actions", label: "操作", render: (r) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditingQAPair(r)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm("确定要删除这个QA对吗？此操作不可撤销。")) {
              deleteMutation.mutate({ id: r.id });
            }
          }}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )},
  ];

  // 计算总页数
  const totalPages = data ? data.totalPages : 1;

  return (
    <div>
      <PageHeader title="QA Pairs 数据集管理器" description="管理 QA 对，验证 RAG 检索质量"
        actions={<div className="flex gap-2">
          <button onClick={() => setShowTest(!showTest)} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"><FlaskConical className="h-4 w-4" />测试检索</button>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white"><Plus className="h-4 w-4" />新建 QA 对</Button>
        </div>} />

      {showTest && (
        <div className="mb-4 rounded-xl border bg-blue-50 p-4">
          <h3 className="text-sm font-semibold mb-2">🔍 RAG 检索测试</h3>
          <div className="flex gap-2">
            <input value={testQ} onChange={e => setTestQ(e.target.value)} placeholder="输入测试问题…" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
            <button className="rounded-lg bg-brand px-4 py-2 text-sm text-white">检索</button>
          </div>
          {/* 注意：目前没有实现检索功能，因为后端没有对应的端点 */}
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索 QA 对…" className="h-9 w-full rounded-lg border pl-9 pr-4 text-sm" />
        </div>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} loading={isLoading} />
      {data && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      <QADialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={currentProject?.id ?? ""}
        onComplete={() => setShowCreateDialog(false)}
      />

      <QADialog
        open={!!editingQAPair}
        onOpenChange={() => setEditingQAPair(null)}
        projectId={currentProject?.id ?? ""}
        qaPair={editingQAPair}
        onComplete={() => setEditingQAPair(null)}
      />
    </div>
  );
}