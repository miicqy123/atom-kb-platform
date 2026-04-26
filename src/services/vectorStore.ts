// src/services/vectorStore.ts

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';
const QA_COLLECTION = 'qa_vectors';
const VECTOR_DIM = 1536;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (QDRANT_API_KEY) headers['api-key'] = QDRANT_API_KEY;
  return headers;
}

/**
 * 确保 collection 存在，不存在则创建
 */
export async function ensureCollection(): Promise<void> {
  const check = await fetch(`${QDRANT_URL}/collections/${QA_COLLECTION}`, {
    headers: getHeaders(),
  });
  if (check.status === 404) {
    await fetch(`${QDRANT_URL}/collections/${QA_COLLECTION}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        vectors: {
          size: VECTOR_DIM,
          distance: 'Cosine',
        },
      }),
    });
  }
}

export interface VectorPoint {
  id: string;         // QAPair ID
  vector: number[];   // 1536 维
  payload: {
    question: string;
    answer: string;
    projectId: string;
    rawId?: string;
    tags?: string[];
    difficulty?: string;
  };
}

/**
 * 批量写入向量
 */
export async function upsertVectors(points: VectorPoint[]): Promise<void> {
  await ensureCollection();

  const BATCH = 100;
  for (let i = 0; i < points.length; i += BATCH) {
    const batch = points.slice(i, i + BATCH);
    const res = await fetch(`${QDRANT_URL}/collections/${QA_COLLECTION}/points`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ points: batch }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Qdrant upsert error: ${res.status} ${err}`);
    }
  }
}

/**
 * 相似度搜索（用于 RAG 检索）
 */
export async function searchSimilar(
  vector: number[],
  projectId: string,
  topK: number = 5
): Promise<Array<{ id: string; score: number; payload: any }>> {
  await ensureCollection();

  const res = await fetch(`${QDRANT_URL}/collections/${QA_COLLECTION}/points/search`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      vector,
      limit: topK,
      filter: {
        must: [{ key: 'projectId', match: { value: projectId } }],
      },
      with_payload: true,
    }),
  });

  if (!res.ok) throw new Error(`Qdrant search error: ${res.status}`);
  const data = await res.json();
  return data.result || [];
}
