import { cn } from "@/lib/utils";

export function StatsCard({ title, value, subtitle, icon, color = "text-brand" }: { title: string; value: string | number; subtitle?: string; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        {icon && <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-opacity-10", color)}>{icon}</div>}
      </div>
      <p className={cn("mt-1 text-2xl font-bold", color)}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}