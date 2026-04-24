import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

// 在组件函数外添加映射函数
function toApiStatus(s: string): 'DRAFT' | 'ARCHIVED' | 'REVIEW' | 'APPROVED' {
  if (s === 'ACTIVE') return 'APPROVED';
  if (s === 'TESTING') return 'REVIEW';
  if (s === 'ARCHIVED') return 'ARCHIVED';
  return 'DRAFT';
}

interface QADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  qaPair?: any; // 编辑时传递现有QA对数据
  onComplete?: () => void; // 操作完成后回调
}

export default function QADialog({ open, onOpenChange, projectId, qaPair, onComplete }: QADialogProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [materialType, setMaterialType] = useState('THEORY');
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'TESTING' | 'ACTIVE' | 'ARCHIVED'>('DRAFT');

  const utils = trpc.useUtils();
  const { toast } = useToast();

  const createQAMutation = trpc.qaPair.create.useMutation({
    onSuccess: () => {
      toast({
        title: '创建成功',
        description: 'QA对已成功创建',
      });
      utils.qaPair.getAll.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error.message || '创建QA对时出现错误',
        variant: 'destructive',
      });
    }
  });

  const updateQAMutation = trpc.qaPair.update.useMutation({
    onSuccess: () => {
      toast({
        title: '更新成功',
        description: 'QA对已成功更新',
      });
      utils.qaPair.getAll.invalidate(); // 使缓存失效
      resetForm();
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error.message || '更新QA对时出现错误',
        variant: 'destructive',
      });
    }
  });

  const isEditing = !!qaPair;

  useEffect(() => {
    if (qaPair) {
      setQuestion(qaPair.question || '');
      setAnswer(qaPair.answer || '');
      setDifficulty(qaPair.difficulty || 'MEDIUM');
      setMaterialType(qaPair.materialType || 'THEORY');
      setScenarios(qaPair.scenarios || []);
      setTags(qaPair.tags || []);
      setStatus(qaPair.status || 'DRAFT');
    } else {
      resetForm();
    }
  }, [qaPair]);

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setDifficulty('MEDIUM');
    setMaterialType('THEORY');
    setScenarios([]);
    setTags([]);
    setCurrentTag('');
    setStatus('DRAFT');
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast({
        title: '错误',
        description: '请输入问题',
        variant: 'destructive',
      });
      return;
    }

    if (!answer.trim()) {
      toast({
        title: '错误',
        description: '请输入答案',
        variant: 'destructive',
      });
      return;
    }

    const qaData = {
      question,
      answer,
      projectId,
      difficulty,
      materialType,
      scenarios,
      tags,
      questionKeywords: question.split(/\s+/).filter(word => word.length > 2), // 提取关键词
      status: toApiStatus(status),
    };

    if (isEditing) {
      // 更新现有QA对
      updateQAMutation.mutate({
        id: qaPair.id,
        ...qaData
      } as any);
    } else {
      // 创建新QA对
      createQAMutation.mutate({ ...qaData, status: toApiStatus(status) } as any);
    }
  };

  const isLoading = createQAMutation.isPending || updateQAMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑QA对' : '创建新QA对'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
              问题 *
            </label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入问题"
              rows={3}
              required
            />
          </div>

          <div>
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">
              答案 *
            </label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="输入答案"
              rows={5}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                难度
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="EASY">简单</option>
                <option value="MEDIUM">中等</option>
                <option value="HARD">困难</option>
              </select>
            </div>

            <div>
              <label htmlFor="materialType" className="block text-sm font-medium text-gray-700 mb-1">
                材料类型
              </label>
              <select
                id="materialType"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="THEORY">理论知识</option>
                <option value="CASE_STUDY">案例分析</option>
                <option value="METHODOLOGY">方法论</option>
                <option value="FAQ">常见问题</option>
                <option value="SCRIPT">脚本/话术</option>
                <option value="REGULATION">规章制度</option>
                <option value="PRODUCT_DOC">产品文档</option>
                <option value="TRAINING_MATERIAL">培训材料</option>
                <option value="MEETING_RECORD">会议纪要</option>
                <option value="CUSTOMER_VOICE">客户声音</option>
                <option value="INDUSTRY_REPORT">行业报告</option>
                <option value="COMPETITOR_ANALYSIS">竞品分析</option>
                <option value="INTERNAL_WIKI">内部知识库</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="DRAFT">草稿</option>
                <option value="REVIEW">审核中</option>
                <option value="ACTIVE">激活</option>
                <option value="ARCHIVED">归档</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="输入标签并回车添加"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <div key={tag} className="flex items-center bg-gray-100 rounded px-2 py-1 text-sm">
                  {tag}
                  <button
                    type="button"
                    className="ml-1 text-gray-500 hover:text-gray-700"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (isEditing ? '更新中...' : '创建中...') : (isEditing ? '更新' : '创建')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}