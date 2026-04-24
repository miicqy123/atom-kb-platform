import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { useProjectStore } from '@/stores/projectStore';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string; // 如果有默认项目ID
}

export default function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const [title, setTitle] = useState('');
  const [materialType, setMaterialType] = useState<'THEORY' | 'CASE_STUDY' | 'METHODOLOGY' | 'FAQ' | 'SCRIPT' | 'REGULATION' | 'PRODUCT_DOC' | 'TRAINING_MATERIAL' | 'MEETING_RECORD' | 'CUSTOMER_VOICE' | 'INDUSTRY_REPORT' | 'COMPETITOR_ANALYSIS' | 'INTERNAL_WIKI' | 'OTHER'>('THEORY');
  const [experienceSource, setExperienceSource] = useState<'E1_COMPANY' | 'E2_INDUSTRY' | 'E3_CROSS_INDUSTRY'>('E1_COMPANY');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { projectId } = useProjectStore();

  // 用于手动触发数据刷新
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: '错误',
        description: '请选择文件',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: '错误',
        description: '请输入素材标题',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('projectId', projectId);          // 从 useProjectStore 获取
      formData.append('materialType', materialType);     // 来自表单选择
      formData.append('experienceSource', experienceSource); // 来自表单选择

      // 调用文件上传API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: '上传成功',
          description: '素材已成功上传并添加到系统中',
        });

        // 关闭对话框并清空表单
        onOpenChange(false);
        setTitle('');
        setMaterialType('THEORY');
        setExperienceSource('E1_COMPANY');
        setFile(null);
        setFileName('');

        // 使缓存失效，强制重新获取数据
        utils.raw.getAll.invalidate();

        // 刷新页面以显示新上传的文件
        router.refresh && router.refresh();
      } else {
        toast({
          title: '上传失败',
          description: result.error || '上传素材时出现错误',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: '上传失败',
        description: '网络错误或上传过程中出现问题',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);

      // 自动填充标题（去掉扩展名）
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传素材</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择文件</label>
            <div className="flex items-center space-x-2">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {fileName ? (
                    <p className="text-sm text-gray-500 truncate max-w-full">{fileName}</p>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <p className="text-sm text-gray-500 mt-2">点击选择文件或拖拽文件到此处</p>
                      <p className="text-xs text-gray-500">支持 PDF, Word, Excel, PPT, TXT, MD</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
                />
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              素材标题
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入素材标题"
              required
            />
          </div>

          <div>
            <label htmlFor="materialType" className="block text-sm font-medium text-gray-700 mb-1">
              素材类型
            </label>
            <select
              id="materialType"
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              required
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

          <div>
            <label htmlFor="experienceSource" className="block text-sm font-medium text-gray-700 mb-1">
              经验来源
            </label>
            <select
              id="experienceSource"
              value={experienceSource}
              onChange={(e) => setExperienceSource(e.target.value as any)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              required
            >
              <option value="E1_COMPANY">公司内部经验</option>
              <option value="E2_INDUSTRY">行业经验</option>
              <option value="E3_CROSS_INDUSTRY">跨行业经验</option>
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={uploading || !file}
            >
              {uploading ? '上传中...' : '确认上传'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}