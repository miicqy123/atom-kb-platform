import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatNumber(n: number) { return new Intl.NumberFormat("zh-CN").format(n); }

export function formatPercent(n: number) { return `${(n * 100).toFixed(1)}%`; }

export function truncate(s: string, max = 80) { return s.length > max ? s.slice(0, max) + "…" : s; }

export function formatDateTime(date: Date | string | number) {
  if (typeof date === 'string') {
    date = new Date(date);
  } else if (typeof date === 'number') {
    date = new Date(date);
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}