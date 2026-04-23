"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { Send, ThumbsUp, ThumbsDown, MessageSquarePlus } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; sources?: any[] };

export default function QASearchPage() {
  const { currentProject } = useProjectStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const searchQA = trpc.qaPair.searchSimilar.useMutation();

  const handleSend = async () => {
    if (!input.trim() || !currentProject) return;

    const q = input; setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);

    const results = await searchQA.mutateAsync({ projectId: currentProject.id, question: q, topN: 3 });
    const answer = results.length > 0 ? results[0].answer : "未找到匹配的 QA 对，建议补充知识库。";

    setMessages(prev => [...prev, { role: "assistant", content: answer, sources: results }]);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="智能问答" description="基于 QA 知识库的 RAG 检索应答" />

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && <div className="flex items-center justify-center h-64 text-gray-400 text-sm">💬 输入问题开始检索</div>}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-2xl rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-brand text-white" : "bg-white border shadow-sm"}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 space-y-2 border-t pt-2">
                  <p className="text-xs text-gray-500 font-semibold">来源溯源</p>

                  {msg.sources.map((s: any, j: number) => (
                    <div key={j} className="rounded-lg bg-gray-50 p-2 text-xs">
                      <p className="font-medium">Q: {s.question}</p>
                      {s.qualityScore && <ConfidenceBar value={s.qualityScore} />}
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <button className="rounded border px-2 py-1 text-xs hover:bg-green-50">
                      <ThumbsUp className="inline h-3 w-3" /> 有帮助
                    </button>
                    <button className="rounded border px-2 py-1 text-xs hover:bg-red-50">
                      <ThumbsDown className="inline h-3 w-3" /> 不准确
                    </button>
                    <button className="rounded border px-2 py-1 text-xs hover:bg-blue-50">
                      <MessageSquarePlus className="inline h-3 w-3" /> 建议补充
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t bg-white pt-4">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="输入您的问题…" className="flex-1 rounded-xl border px-4 py-3 text-sm" />
        <button onClick={handleSend} className="rounded-xl bg-brand px-6 py-3 text-white hover:bg-brand-dark">
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}