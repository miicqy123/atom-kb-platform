// src/services/agents/types.ts

export type AgentRole =
  | 'agent-organizer'
  | 'context-manager'
  | 'slot-filler'
  | 'quality-checker'
  | 'conflict-arbiter'
  | 'hitl-dispatcher'
  | 'feedback-learner'
  | 'blueprint-optimizer';

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  agentRole?: AgentRole;
  timestamp?: number;
}

export interface SlotContext {
  slotKey: string;
  atoms: Array<{ id: string; content: string; layer: string; score?: number }>;
  previousOutput?: string;
  retryCount: number;
}

export interface OrchestratorContext {
  blueprintId: string;
  projectId: string;
  userQuery: string;
  runId: string;
  sessionHistory: AgentMessage[];
  slotContexts: Map<string, SlotContext>;
  completedSlots: string[];
  failedSlots: string[];
}

export interface AgentResult {
  agentRole: AgentRole;
  slotKey?: string;
  output: string;
  score?: number;
  passed: boolean;
  metadata?: Record<string, unknown>;
}