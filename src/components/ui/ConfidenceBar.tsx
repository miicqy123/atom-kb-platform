import { cn } from "@/lib/utils";

export function ConfidenceBar({ value, max = 1 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-gray-200">
        <div className={cn("h-2 rounded-full transition-all", pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  );
}