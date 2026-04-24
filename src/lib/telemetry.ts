// src/lib/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Counter, Histogram, register } from 'prom-client';

// ── Prometheus Metrics ────────────────────────────────────────────
export const metrics = {
  runTotal: new Counter({
    name: 'atom_kb_run_total',
    help: '总运行次数',
    labelNames: ['status'] as const,
  }),
  runDuration: new Histogram({
    name: 'atom_kb_run_duration_seconds',
    help: '运行耗时（秒）',
    buckets: [0.5, 1, 2, 5, 10, 30],
  }),
  s8ScoreGauge: new Histogram({
    name: 'atom_kb_s8_score',
    help: 'S8 质检评分分布',
    buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    labelNames: ['slotKey'] as const,
  }),
  hitlRate: new Counter({
    name: 'atom_kb_hitl_total',
    help: 'HITL 介入次数',
    labelNames: ['urgency'] as const,
  }),
  tokenUsage: new Counter({
    name: 'atom_kb_token_total',
    help: 'Token 消耗',
    labelNames: ['model'] as const,
  }),
};

// ── Trace 结构化日志 ──────────────────────────────────────────────
export function logTrace(event: {
  traceId: string;
  node: string;
  durationMs: number;
  tokens: number;
  passed: boolean;
  score?: number;
  slotKey?: string;
}) {
  // 写入 Prometheus metrics
  metrics.runDuration.observe(event.durationMs / 1000);
  if (event.slotKey && event.score != null) {
    metrics.s8ScoreGauge.observe({ slotKey: event.slotKey }, event.score);
  }
  if (event.tokens) {
    metrics.tokenUsage.inc({ model: 'gpt-4o-mini' }, event.tokens);
  }

  // 结构化日志（生产可对接 Loki）
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: event.passed ? 'info' : 'warn',
    ...event,
  }));
}