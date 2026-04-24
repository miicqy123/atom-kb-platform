"use client";
import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { Send, ThumbsUp, ThumbsDown, FileEdit, Bot, User, ChevronDown } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  confidence?: number;
  sources?: { type:string; title:string; id?:string }[];
  answerLayers?: { title:string; content:string }[];
};

export default function QASearchPage() {
  const { projectId } = useProjectStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "您好！我是知识问答助手，可以回答关于当前 Project 的所有知识库问题。请问有什么可以帮您？",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"hybrid"|"qa"|"atom">("hybrid");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:"smooth" });
  }, [messages, loading]);

  const qaSearch = trpc.qaPair.getAll.useQuery(
    { search: "", projectId: projectId ?? "", limit: 5 },
    { enabled: false }
  );
  const vectorSearch = trpc.vector.hybridSearch.useQuery(
    { query: "", projectId, topK: 5 },
    { enabled: false }
  );

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role:"user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 简单模拟：用 QA 搜索
      const res = await fetch(`/api/trpc/qaPair.getAll?input=${encodeURIComponent(JSON.stringify({
        projectId: projectId ?? "", search: input, limit: 3
      }))}`).then(r => r.json()).catch(() => null);

      const qaItems = res?.result?.data?.items ?? [];
      const topHit = qaItems[0];

      const aiMsg: Message = {
        id: (Date.now()+1).toString(),
        role: "assistant",
        content: topHit?.answer || "抱歉，我暂时没有找到相关知识。请换一种方式提问，或确认知识库已录入相关内容。",
        confidence: topHit ? 0.94 : 0.2,
        sources: topHit ? [
          { type:"qa", title: topHit.question },
        ] : [],
        answerLayers: topHit ? [
          { title:"核心回答", content: topHit.answer || "" },
          { title:"深层解析", content:"（需要更丰富的知识库支持）" },
          { title:"场景应用话术", content:"（需要更丰富的知识库支持）" },
        ] : [],
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now()+1).toString(), role:"assistant",
        content: "抱歉，检索出现错误，请稍后重试。"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="智能问答" description="基于知识库的 RAG 问答助手" />

      {/* 模式切换 */}
      <div className="flex items-center gap-2 px-6 py-2 border-b">
        {(["hybrid","qa","atom"] as const).map(m=>(
          <button key={m} onClick={()=>setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mode===m ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {m==="hybrid" ? "混合检索" : m==="qa" ? "QA关键词" : "向量语义"}
          </button>
        ))}
      </div>

      {/* 聊天区域 */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role==="user" ? "justify-end" : "justify-start"}`}>
            {msg.role==="assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}
            <div className={`max-w-[600px] rounded-2xl px-4 py-3 ${
              msg.role==="user"
                ? "bg-brand text-white rounded-br-md"
                : "bg-gray-100 text-gray-800 rounded-bl-md"
            }`}>
              {/* 置信度 */}
              {msg.confidence !== undefined && msg.role==="assistant" && (
                <div className="text-xs text-blue-600 font-medium mb-2">
                  📋 推荐回答（置信度: {msg.confidence.toFixed(2)}）
                </div>
              )}

              {/* 内容 */}
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

              {/* 可折叠的层 */}
              {msg.answerLayers && msg.answerLayers.length > 1 && (
                <div className="mt-3 space-y-1">
                  {msg.answerLayers.slice(1).map((layer,i)=>(
                    <details key={i} className="group">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                        ▸ {layer.title}（点击展开）
                      </summary>
                      <div className="text-xs text-gray-600 mt-1 pl-3">{layer.content}</div>
                    </details>
                  ))}
                </div>
              )}

              {/* 溯源 */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200/50">
                  <div className="text-xs text-gray-500">
                    {msg.sources.map((s,i)=>(
                      <div key={i}>{s.type==="qa" ? "❓" : "📄"} 命中: {s.title}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* 反馈按钮 */}
              {msg.role==="assistant" && msg.id !== "welcome" && (
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-200/50">
                  <button className="text-xs text-gray-400 hover:text-green-600 flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> 有帮助
                  </button>
                  <button className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3" /> 不准确
                  </button>
                  <button className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1">
                    <FileEdit className="h-3 w-3" /> 建议补充
                  </button>
                </div>
              )}
            </div>
            {msg.role==="user" && (
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-brand" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-blue-600 animate-pulse" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-500">
              正在检索知识库…
            </div>
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="border-t px-6 py-3">
        <div className="flex items-center gap-2 max-w-[800px] mx-auto">
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); handleSend(); } }}
            placeholder="💬 输入您的问题…"
            className="flex-1 rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand focus:outline-none"
          />
          <button onClick={handleSend} disabled={!input.trim()||loading}
            className="p-2.5 rounded-xl bg-brand text-white hover:bg-brand/90 disabled:opacity-40 transition">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
