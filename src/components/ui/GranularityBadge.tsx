const G_MAP: Record<string, { label: string; emoji: string }> = { ATOM: { label: "Atom", emoji: "⚛️" }, MODULE: { label: "Module", emoji: "📦" }, PACK: { label: "Pack", emoji: "📚" } };

export function GranularityBadge({ g }: { g: string }) {
  const item = G_MAP[g] ?? { label: g, emoji: "" };
  return <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">{item.emoji} {item.label}</span>;
}