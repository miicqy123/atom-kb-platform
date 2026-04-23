import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Atomized KB Platform
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            欢迎来到知识库平台 - 一个智能化的知识管理和自动化平台
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/knowledge/raw">
              <Button className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-lg text-base transition-all duration-200 transform hover:scale-105">
                开始管理素材
              </Button>
            </Link>

            <Link href="/(dashboard)">
              <Button variant="outline" className="border-brand text-brand hover:bg-brand/10 px-6 py-3 rounded-lg text-base transition-all duration-200">
                进入仪表板
              </Button>
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-blue-50 p-5 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">智能知识管理</h3>
              <p className="text-gray-600 text-sm">高效组织和管理您的知识资产</p>
            </div>
            <div className="bg-green-50 p-5 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">自动化处理</h3>
              <p className="text-gray-600 text-sm">自动化的知识提取和处理流程</p>
            </div>
            <div className="bg-purple-50 p-5 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">多维分析</h3>
              <p className="text-gray-600 text-sm">深度分析和洞察您的知识内容</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}