// src/services/vectorService.ts
// 方案A：本地文件向量库（零依赖，仅用 Node.js 内置 fs + fetch）

import * as fs from 'fs';
import * as path from 'path';

const VECTOR_DB_PATH = path.join(process.cwd(), 'uploads', 'vector-db.json');
const QWEN_API_KEY = process.env.QWEN_API_KEY ?? '';
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

interface VectorEntry {
  id: string;
  projectId: string;
  content: string;
  metadata: Record<string, unknown>;
  vector: number[];
  createdAt: string;
}

interface VectorDB {
  entries: VectorEntry[];
  updatedAt: string;
}

function loadDB(): VectorDB {
  if (!fs.existsSync(VECTOR_DB_PATH)) {
    return { entries: [], updatedAt: new Date().toISOString() };
  }
  try {
    const raw = fs.readFileSync(VECTOR_DB_PATH, 'utf-8');
    return JSON.parse(raw) as VectorDB;
  } catch {
    return { entries: [], updatedAt: new Date().toISOString() };
  }
}

function saveDB(db: VectorDB): void {
  const dir = path.dirname(VECTOR_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${QWEN_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-v2', input: text }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status} ${res.statusText}`);
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function upsertVector(
  id: string,
  projectId: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const vector = await getEmbedding(content);
  const db = loadDB();
  const idx = db.entries.findIndex(e => e.id === id);
  const entry: VectorEntry = { id, projectId, content, metadata, vector, createdAt: new Date().toISOString() };
  if (idx >= 0) db.entries[idx] = entry;
  else db.entries.push(entry);
  saveDB(db);
}

export async function searchSimilar(
  projectId: string,
  query: string,
  topK = 5
): Promise<Array<{ id: string; content: string; metadata: Record<string, unknown>; score: number }>> {
  const queryVector = await getEmbedding(query);
  const db = loadDB();
  return db.entries
    .filter(e => e.projectId === projectId)
    .map(e => ({ id: e.id, content: e.content, metadata: e.metadata, score: cosineSimilarity(queryVector, e.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function deleteVector(id: string): Promise<void> {
  const db = loadDB();
  db.entries = db.entries.filter(e => e.id !== id);
  saveDB(db);
}

export async function deleteProjectVectors(projectId: string): Promise<void> {
  const db = loadDB();
  db.entries = db.entries.filter(e => e.projectId !== projectId);
  saveDB(db);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const dir = path.dirname(VECTOR_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

// 追加 BM25 索引功能
import { Document } from 'flexsearch';

// 内存 BM25 索引（生产建议持久化到 Redis 或 Elasticsearch）
const bm25Index = new Document({
  tokenize: 'full',
  document: {
    id: 'id',
    index: ['content', 'title'],
  },
});

export async function indexAtomBM25(atomId: string, title: string, content: string) {
  bm25Index.add({ id: atomId, title, content });
}

export async function searchBM25(
  query: string,
  limit = 10
): Promise<string[]> {
  const results = bm25Index.search(query, { limit, enrich: true });
  const ids = new Set<string>();
  for (const field of results) {
    for (const r of field.result as any[]) {
      ids.add(r.id as string);
    }
  }
  return Array.from(ids).slice(0, limit);
}

// 混合检索：BM25 + 向量语义 RRF 融合
export async function hybridSearch(
  projectId: string,
  query: string,
  topK = 10,
  filter?: object
): Promise<{ id: string; score: number; source: 'bm25' | 'vector' | 'both' }[]> {
  // 并行执行两路检索
  const [bm25Ids, vectorResults] = await Promise.all([
    searchBM25(query, topK * 2),
    searchSimilar(projectId, query, topK * 2)
  ]);

  const vectorIds = vectorResults.map(r => r.id);
  const vectorScoreMap = new Map(vectorResults.map(r => [r.id, r.score]));

  // RRF（Reciprocal Rank Fusion）融合
  const k = 60;
  const scores = new Map<string, { rrf: number; source: Set<string> }>();

  bm25Ids.forEach((id, rank) => {
    if (!scores.has(id)) scores.set(id, { rrf: 0, source: new Set() });
    const entry = scores.get(id)!;
    entry.rrf += 1 / (k + rank + 1);
    entry.source.add('bm25');
  });

  vectorIds.forEach((id, rank) => {
    if (!scores.has(id)) scores.set(id, { rrf: 0, source: new Set() });
    const entry = scores.get(id)!;
    entry.rrf += 1 / (k + rank + 1);
    entry.source.add('vector');
  });

  return Array.from(scores.entries())
    .sort((a, b) => b[1].rrf - a[1].rrf)
    .slice(0, topK)
    .map(([id, { rrf, source }]) => ({
      id,
      score: rrf,
      source: source.size === 2 ? 'both' : (source.has('bm25') ? 'bm25' : 'vector'),
    }));
}