"use client";

export interface Column<T> { key: string; label: string; render?: (row: T) => React.ReactNode; width?: string; }

export function DataTable<T extends Record<string, any>>({ columns, data, onRowClick, loading, emptyMessage = "暂无数据" }: { columns: Column<T>[]; data: T[]; onRowClick?: (row: T) => void; loading?: boolean; emptyMessage?: string }) {
  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            {columns.map(c => <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase" style={c.width ? { width: c.width } : {}}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">{emptyMessage}</td>
            </tr>
          ) : data.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row)} className="border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
              {columns.map(c => <td key={c.key} className="px-4 py-3">{c.render ? c.render(row) : (row as any)[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}