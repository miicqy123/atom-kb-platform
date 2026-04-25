'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { TASK_TYPE_OPTIONS, PLATFORM_OPTIONS } from '@/lib/taskMaps';

interface InputPanelProps {
  onSubmit: (data: { inputType: 'text' | 'url' | 'image'; content: string; taskType?: string; platform?: string }) => void;
  loading: boolean;
}

const INPUT_MODES = [
  { value: 'text', label: '文本粘贴' },
  { value: 'url', label: 'URL 链接' },
  { value: 'image', label: '截图上传' },
] as const;

export default function InputPanel({ onSubmit, loading }: InputPanelProps) {
  const [inputType, setInputType] = useState<'text' | 'url' | 'image'>('text');
  const [content, setContent] = useState('');
  const [taskType, setTaskType] = useState('');
  const [platform, setPlatform] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setContent(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({
      inputType,
      content: content.trim(),
      taskType: taskType || undefined,
      platform: platform || undefined,
    });
  };

  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      {/* 输入方式切换 */}
      <div className="flex items-center gap-4">
        {INPUT_MODES.map((mode) => (
          <label key={mode.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name="inputType"
              checked={inputType === mode.value}
              onChange={() => { setInputType(mode.value); setContent(''); setImagePreview(null); }}
              className="w-4 h-4"
            />
            {mode.label}
          </label>
        ))}
      </div>

      {/* 输入区域 */}
      {inputType === 'text' && (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="粘贴你想复刻的优质内容..."
          rows={8}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-y"
        />
      )}

      {inputType === 'url' && (
        <input
          type="url"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="输入文章/帖子链接..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      )}

      {inputType === 'image' && (
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          {imagePreview ? (
            <img src={imagePreview} alt="preview" className="max-h-48 mx-auto rounded" />
          ) : (
            <div className="text-gray-400">
              <p className="text-2xl mb-2">📷</p>
              <p className="text-sm">点击上传截图</p>
              <p className="text-xs mt-1">支持 JPG / PNG / WebP</p>
            </div>
          )}
        </div>
      )}

      {/* 选项 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">任务类型（可选）</label>
          <select
            value={taskType}
            onChange={e => setTaskType(e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">不限</option>
            {TASK_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">平台（可选）</label>
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">不限</option>
            {PLATFORM_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 提交 */}
      <Button
        onClick={handleSubmit}
        disabled={!content.trim() || loading}
        className="w-full flex items-center justify-center gap-2"
        size="lg"
      >
        {loading ? '⏳ 正在反推分析中...' : '开始反推 →'}
      </Button>
    </div>
  );
}
