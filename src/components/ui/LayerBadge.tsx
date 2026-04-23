import { cn } from "@/lib/utils";

const LAYER_COLORS: Record<string, string> = { A: "bg-blue-100 text-blue-700", B: "bg-green-100 text-green-700", C: "bg-orange-100 text-orange-700", D: "bg-red-100 text-red-700" };
const LAYER_NAMES: Record<string, string> = { A: "A 认知", B: "B 技能", C: "C 风格红线", D: "D 系统合规" };

export function LayerBadge({ layer }: { layer: string }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", LAYER_COLORS[layer])}>{LAYER_NAMES[layer] ?? layer}</span>;
}