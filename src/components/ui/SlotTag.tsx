export function SlotTag({ slot }: { slot: string }) {
  return <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-mono text-indigo-600">{slot}</span>;
}