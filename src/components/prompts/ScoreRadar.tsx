'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const DIMENSION_LABELS: Record<string, string> = {
  roleClarity: '角色清晰度',
  taskClarity: '任务明确性',
  inputCompleteness: '输入完整性',
  outputStandard: '输出规范性',
  boundaryConstraint: '边界约束',
  structureReason: '结构合理性',
  conciseness: '简洁度',
};

const WEIGHTS: Record<string, number> = {
  roleClarity: 0.15,
  taskClarity: 0.20,
  inputCompleteness: 0.15,
  outputStandard: 0.15,
  boundaryConstraint: 0.15,
  structureReason: 0.10,
  conciseness: 0.10,
};

interface ScoreRadarProps {
  dimensions: {
    roleClarity: number;
    taskClarity: number;
    inputCompleteness: number;
    outputStandard: number;
    boundaryConstraint: number;
    structureReason: number;
    conciseness: number;
  } | null;
  overall: number | null;
}

export function ScoreRadar({ dimensions, overall }: ScoreRadarProps) {
  if (!dimensions) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        暂无评分数据
      </div>
    );
  }

  const chartData = Object.entries(dimensions).map(([key, value]) => ({
    dimension: DIMENSION_LABELS[key] || key,
    score: value,
    fullMark: 5,
  }));

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-3">
        <span className="text-lg">⭐</span>
        <span className="text-2xl font-bold ml-1">{overall?.toFixed(1) ?? '--'}</span>
        <span className="text-sm text-gray-400"> / 5.0</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} tickCount={6} />
          <Radar dataKey="score" fill="#6366f1" fillOpacity={0.2} stroke="#6366f1" strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[10px] text-gray-400">
        {Object.entries(WEIGHTS).map(([key, weight]) => (
          <div key={key} className="flex justify-between gap-2">
            <span>{DIMENSION_LABELS[key]}</span>
            <span className="text-gray-300">
              {dimensions[key as keyof typeof dimensions]?.toFixed(1) ?? '-'}
              <span className="text-gray-200"> /5 ({(weight * 100).toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
