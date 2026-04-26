"use client";
import { File, Building2, Calendar, Brain, Zap } from "lucide-react";

export interface PositionSurveyRecord {
  id: string;
  title: string;
  createdAt: string;
  markdownContent?: string | null;
  metadata?: {
    department?: string;
    position?: string;
    level?: string;
    yearsInRole?: string;
    experienceDependency?: string;
    aiPotential?: string;
    surveyDate?: string;
    respondent?: string;
  } | null;
}

interface PositionSurveyListProps {
  items: PositionSurveyRecord[];
  loading: boolean;
  onNew: () => void;
  onItemClick: (id: string) => void;
}

export default function PositionSurveyList({ items, loading, onNew, onItemClick }: PositionSurveyListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        加载中...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Building2 className="w-12 h-12 mb-3 text-gray-300" />
        <p>暂无岗位调研记录</p>
        <p className="text-xs mt-1">点击「新建岗位调研」开始填写问卷</p>
        <button
          onClick={onNew}
          className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
        >
          <File className="w-4 h-4" /> 新建岗位调研
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((r) => {
        const meta = r.metadata || {};
        return (
          <div
            key={r.id}
            onClick={() => onItemClick(r.id)}
            className="rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium truncate flex-1">{r.title}</span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
              {meta.respondent && (
                <div className="flex items-center gap-1.5">
                  <File className="w-3.5 h-3.5 text-gray-400" />
                  <span>填写人：{meta.respondent}</span>
                </div>
              )}
              {meta.department && meta.position && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>{meta.department} · {meta.position}</span>
                </div>
              )}
              {meta.level && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>级别：{meta.level}</span>
                </div>
              )}
              {meta.surveyDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>调研日期：{meta.surveyDate}</span>
                </div>
              )}
              {meta.experienceDependency && (
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-gray-400" />
                  <span>经验依赖：{meta.experienceDependency}</span>
                </div>
              )}
              {meta.aiPotential && (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-gray-400" />
                  <span>AI 潜力：{meta.aiPotential}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("zh-CN") : ""}
              </span>
              <span className="text-xs text-gray-400">
                {r.markdownContent ? r.markdownContent.length + " 字" : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
