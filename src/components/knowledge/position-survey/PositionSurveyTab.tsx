"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { File } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { generatePositionMarkdown, type PositionSurveyFormData } from "./types";
import PositionSurveyForm from "./PositionSurveyForm";
import PositionSurveyList from "./PositionSurveyList";
import type { PositionSurveyRecord } from "./PositionSurveyList";

export default function PositionSurveyTab() {
  const router = useRouter();
  const { currentProject } = useProjectStore();
  const [showForm, setShowForm] = useState(false);

  const utils = trpc.useUtils();

  // 查询岗位调研记录（materialType + titlePrefix）
  const { data, isLoading } = trpc.raw.list.useQuery(
    {
      projectId: currentProject?.id ?? "",
      materialType: "TRAINING_MATERIAL",
      titlePrefix: "岗位调研",
      page: 1,
      pageSize: 100,
    },
    { enabled: !!currentProject }
  );

  const createRaw = trpc.raw.create.useMutation({
    onSuccess: () => utils.raw.list.invalidate(),
  });
  const updateRaw = trpc.raw.update.useMutation();

  const items: PositionSurveyRecord[] = (Array.isArray(data?.items) ? data.items : [])
    .filter((r: any) => r.title?.startsWith("岗位调研") && r.id)
    .map((item) => ({
      id: item.id,
      title: item.title ?? item.originalFileName ?? '未命名调研',
      createdAt: item.createdAt,
    }));

  const handleSubmit = useCallback(
    async (formData: PositionSurveyFormData, attachments: { name: string; url: string }[]) => {
      if (!currentProject) { alert("请先选择项目"); return; }

      const dept = formData.department === "其他" && formData.departmentCustom
        ? formData.departmentCustom
        : formData.department;
      const markdown = generatePositionMarkdown(formData);
      const title = `岗位调研 · ${formData.position} · ${dept}`;

      try {
        const created = await createRaw.mutateAsync({
          title,
          projectId: currentProject.id,
          format: "WORD",
          materialType: "TRAINING_MATERIAL",
          experienceSource: "E1_COMPANY",
          originalFileUrl: attachments[0]?.url || undefined,
          originalFileName: attachments[0]?.name || undefined,
        });

        if (created?.id) {
          await updateRaw.mutateAsync({
            id: created.id,
            data: {
              markdownContent: markdown,
              conversionStatus: "CONVERTED",
              metadata: {
                surveyType: "position",
                department: dept,
                position: formData.position,
                level: formData.level,
                yearsInRole: formData.yearsInRole,
                experienceDependency: formData.experienceDependency,
                aiPotential: formData.aiPotential,
                sopStatus: formData.sopStatus,
                surveyDate: formData.surveyDate,
                respondent: formData.name,
              },
            },
          });
        }

        utils.raw.list.invalidate();
        setShowForm(false);
        router.push("/knowledge/raw?tab=list");
      } catch (err: any) {
        alert("保存失败: " + (err.message || "未知错误"));
      }
    },
    [currentProject, createRaw, updateRaw, utils.raw.list, router]
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">岗位调研记录</h3>
          <p className="text-sm text-gray-500 mt-1">
            填写结构化岗位调研问卷，自动生成 Markdown 并存入素材库
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 shadow-sm"
        >
          <File className="w-4 h-4" />
          新建岗位调研
        </button>
      </div>

      <PositionSurveyList
        items={items}
        loading={isLoading}
        onNew={() => setShowForm(true)}
        onItemClick={(id) => router.push("/knowledge/workbench?rawId=" + id)}
      />

      {showForm && (
        <PositionSurveyForm
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          submitting={createRaw.isPending}
        />
      )}
    </div>
  );
}
