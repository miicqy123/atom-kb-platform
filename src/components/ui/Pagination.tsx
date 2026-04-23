"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border p-2 hover:bg-gray-50 disabled:opacity-30">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm text-gray-600">{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border p-2 hover:bg-gray-50 disabled:opacity-30">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}