"use client";
import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Upload, ArrowLeft, ArrowRight, File, Check, Loader2, AlertCircle } from "lucide-react";
import { positionSurveySchema, MODULES, type PositionSurveyFormData, type ModuleField } from "./types";

interface PositionSurveyFormProps {
  onClose: () => void;
  onSubmit: (data: PositionSurveyFormData, attachments: { name: string; url: string }[]) => Promise<void>;
  submitting: boolean;
}

export default function PositionSurveyForm({ onClose, onSubmit, submitting }: PositionSurveyFormProps) {
  const [step, setStep] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PositionSurveyFormData>({
    resolver: zodResolver(positionSurveySchema),
    defaultValues: {
      name: "", department: "", departmentCustom: "", position: "", level: "", yearsInRole: "", surveyDate: today,
      jobDescription: "", frequentTasks: "", referenceDocuments: "", industryTerms: "", sopStatus: "",
      valuableExperience: "", ifThenRules: "", decisionPoints: "", hardToTeach: "", experienceDependency: "", aiPotential: "",
      firstStep: "", workflow: "", timeConsumingStep: "", thinkingFrameworks: "", halfTimePriority: "",
      rookieMistakes: "", redLines: "", commonMisconceptions: "", qualityChecklist: "", bestCaseExample: "", coreEssence: "",
      aiWishlist: "", personalAssets: "", frequentFeedback: "", aiCapabilityBoundary: "", promptSuggestions: "",
      attachments: [],
    },
  });

  const department = watch("department");
  const attachments = watch("attachments") || [];

  // 当前模块的字段 key 列表
  const currentFields = MODULES[step].fields
    .filter(f => !f.condition || watch(f.condition as keyof PositionSurveyFormData) === f.conditionValue)
    .map(f => f.key);

  // 分步校验
  const goNext = async () => {
    const valid = await trigger(currentFields);
    if (valid && step < MODULES.length - 1) setStep(s => s + 1);
  };

  const goPrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // 附件上传
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingFiles(true);
    const current = [...attachments];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) continue;
        const data = await res.json();
        current.push({ name: data.originalName || file.name, url: data.url });
      }
      setValue("attachments", current, { shouldValidate: false });
    } finally {
      setUploadingFiles(false);
    }
  }, [attachments, setValue]);

  const removeAttachment = (index: number) => {
    const next = attachments.filter((_, i) => i !== index);
    setValue("attachments", next, { shouldValidate: false });
  };

  // 提交
  const onFormSubmit = async (data: PositionSurveyFormData) => {
    await onSubmit(data, attachments);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <File className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">岗位调研问卷</h2>
                <p className="text-xs text-gray-500">第 {step + 1}/{MODULES.length} 步 · {MODULES[step].title}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          {/* 步骤条 */}
          <div className="flex gap-1.5 mt-3">
            {MODULES.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setStep(i)}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i === step ? "bg-blue-600" : i < step ? "bg-blue-300" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          {/* 步骤标签 */}
          <div className="flex justify-between mt-1.5">
            {MODULES.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setStep(i)}
                className={`text-xs transition-colors ${
                  i <= step ? "text-blue-600 font-medium" : "text-gray-400"
                }`}
              >
                {m.id}
              </button>
            ))}
          </div>
        </div>

        {/* 表单体（可滚动） */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* 模块标题 */}
            <div className="mb-4">
              <h3 className="text-base font-semibold">模块 {MODULES[step].id}：{MODULES[step].title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === 0 ? "以下信息将作为调研报告的抬头" : `请详细回答以下问题，帮助 AI 更好地理解该岗位`}
              </p>
            </div>

            {/* 字段 */}
            <div className={step === 0 ? "grid grid-cols-2 gap-4" : "space-y-4"}>
              {MODULES[step].fields
                .filter(f => !f.condition || watch(f.condition as keyof PositionSurveyFormData) === f.conditionValue)
                .map(field => (
                  <div key={field.key} className={field.half && step === 0 ? "col-span-1" : step === 0 ? "col-span-2" : ""}>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>

                    {field.type === "textarea" ? (
                      <div>
                        <textarea
                          {...register(field.key)}
                          rows={4}
                          placeholder={field.placeholder || ""}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                        {field.guide && (
                          <p className="text-xs text-gray-400 mt-1">{field.guide}</p>
                        )}
                      </div>
                    ) : field.type === "select" ? (
                      <div>
                        <select
                          {...register(field.key)}
                          className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="">请选择</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        {field.guide && (
                          <p className="text-xs text-gray-400 mt-1">{field.guide}</p>
                        )}
                      </div>
                    ) : field.type === "date" ? (
                      <input
                        type="date"
                        {...register(field.key)}
                        className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <div>
                        <input
                          {...register(field.key)}
                          placeholder={field.placeholder || ""}
                          className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {field.guide && (
                          <p className="text-xs text-gray-400 mt-1">{field.guide}</p>
                        )}
                      </div>
                    )}

                    {errors[field.key] && (
                      <p className="text-xs text-red-500 mt-1">{errors[field.key]?.message as string}</p>
                    )}
                  </div>
                ))}

              {/* 附件上传（模块 G 专用） */}
              {MODULES[step].id === "G" && (
                <div className="col-span-2">
                  {/* 上传区 */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = "#3b82f6"; }}
                    onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; }}
                    onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                    className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept=".doc,.docx,.pdf,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.mp3,.mp4,.wav"
                      onChange={e => handleFileUpload(e.target.files)}
                    />
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">点击选择文件或拖拽到此处</p>
                    <p className="text-xs text-gray-400 mt-1">支持 .doc/.docx/.pdf/.ppt/.pptx/.xls/.xlsx/.jpg/.jpeg/.png/.mp3/.mp4/.wav</p>
                  </div>

                  {uploadingFiles && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      上传中...
                    </div>
                  )}

                  {/* 已选文件列表 */}
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {attachments.map((a, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <File className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-sm truncate">{a.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="p-0.5 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 底部导航 */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{step + 1}/{MODULES.length}</span>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={goPrev}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4" /> 上一步
                  </button>
                )}
                {step < MODULES.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    下一步 <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> 提交中...</>
                    ) : (
                      <><Check className="w-4 h-4" /> 提交并保存到素材库</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
