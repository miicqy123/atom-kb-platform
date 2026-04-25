'use client';

import { PromptViewer } from '@/components/prompts/PromptViewer';
import { Button } from '@/components/ui/Button';
import { Database, Save, Copy } from 'lucide-react';

interface PromptPreviewProps {
  prompt: string;
  slots: Record<string, string>;
  onSaveAsPrompt: () => void;
  onToAtoms: () => void;
  onCopy: () => void;
  saving: boolean;
}

export default function PromptPreview({
  prompt,
  slots,
  onSaveAsPrompt,
  onToAtoms,
  onCopy,
  saving,
}: PromptPreviewProps) {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <h3 className="text-sm font-semibold">生成的提示词</h3>

      <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
        <PromptViewer fullText={prompt} slots={slots} />
      </div>

      <div className="flex items-center gap-2 pt-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onToAtoms} disabled={saving}>
          <Database className="h-3.5 w-3.5 mr-1" />
          拆解入原子库
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveAsPrompt} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" />
          保存为提示词
        </Button>
        <Button variant="outline" size="sm" onClick={onCopy} disabled={saving}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          直接使用
        </Button>
      </div>
    </div>
  );
}
