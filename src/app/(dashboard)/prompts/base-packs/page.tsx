"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/PageHeader";
import { SlotTag } from "@/components/ui/SlotTag";
import { Save, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import BasePackDialog from "@/components/prompt/BasePackDialog";
import { useToast } from "@/hooks/use-toast";

const SLOT_NAMES: Record<string, string> = { S0: "全局人设", S1: "任务指令", S2: "用户画像", S3: "预检规则", S4: "知识注入", S5: "主执行", S6: "路由调度", S7: "输出格式", S8: "对抗验证", S9: "质量报告", S10: "元指令" };

export default function BasePacksPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: packs } = trpc.basePack.list.useQuery();
  const updatePack = trpc.basePack.update.useMutation();
  const deletePack = trpc.basePack.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "蓝图已成功删除",
      });
      utils.basePack.list.invalidate(); // 使缓存失效
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message || "删除蓝图时出现错误",
        variant: "destructive",
      });
    }
  });

  const [selectedSlot, setSelectedSlot] = useState("S0");
  const [editContent, setEditContent] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPack, setEditingPack] = useState<any>(null);

  const selectedPack = packs?.find((p: any) => p.slotKey === selectedSlot && !p.subSlotKey);

  return (
    <div>
      <PageHeader title="通用底座包管理" description="管理 S0-S10 全部槽位的通用底座包模板"
        actions={
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white">
            <Plus className="h-4 w-4" />新建蓝图
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1 rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">槽位树</h3>
          </div>
          <div className="space-y-1">
            {Object.entries(SLOT_NAMES).map(([key, name]) => (
              <div key={key} className="flex items-center justify-between">
                <button onClick={() => {
                  setSelectedSlot(key);
                  const p = packs?.find((x: any) => x.slotKey === key && !x.subSlotKey);
                  setEditContent(p?.content ?? "");
                }}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${selectedSlot === key ? "bg-pf/10 text-pf" : "hover:bg-gray-50"}`}>
                  <SlotTag slot={key} />
                  <span className="text-xs">{name}</span>
                </button>
                <div className="flex gap-1">
                  <Button size="xs" variant="ghost" onClick={() => {
                    const pack = packs?.find((x: any) => x.slotKey === key && !x.subSlotKey);
                    if (pack) {
                      setEditingPack(pack);
                    }
                  }} disabled={!packs?.some((x: any) => x.slotKey === key && !x.subSlotKey)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{selectedSlot} · {SLOT_NAMES[selectedSlot]} 底座包</h3>
            <div className="flex items-center gap-2">
              {selectedPack && <span className="text-xs text-gray-400">v{selectedPack.version}</span>}
              <Button
                onClick={() => selectedPack && updatePack.mutate({
                  id: selectedPack.id,
                  content: editContent,
                  name: selectedPack.name
                })}
                disabled={updatePack.isPending}
                className="flex items-center gap-1 rounded-lg bg-pf px-3 py-1.5 text-xs text-white hover:bg-pf/90"
              >
                <Save className="h-3 w-3" />保存
              </Button>
            </div>
          </div>
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="h-96 w-full rounded-lg border p-4 font-mono text-sm leading-relaxed focus:border-pf focus:outline-none focus:ring-1 focus:ring-pf"
            placeholder="在此编辑底座包内容…"
          />
          <div className="mt-3 flex gap-4 text-xs text-gray-400">
            <span>应用范围: {selectedPack?.scope ?? "全局"}</span>
            {selectedPack && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingPack(selectedPack);
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" /> 编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`确定要删除蓝图 "${selectedPack.name}" 吗？此操作不可撤销。`)) {
                      deletePack.mutate({ id: selectedPack.id });
                    }
                  }}
                  disabled={deletePack.isPending}
                >
                  <Trash2 className="h-3 w-3 mr-1 text-red-500" /> 删除
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BasePackDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onComplete={() => {
          setShowCreateDialog(false);
        }}
      />

      <BasePackDialog
        open={!!editingPack}
        onOpenChange={() => setEditingPack(null)}
        pack={editingPack}
        onComplete={() => {
          setEditingPack(null);
        }}
      />
    </div>
  );
}