// src/services/vectorStore.ts — DashVector

const DASHVECTOR_ENDPOINT = process.env.DASHVECTOR_ENDPOINT || '';
const DASHVECTOR_API_KEY = process.env.DASHVECTOR_API_KEY || '';
const QA_COLLECTION = process.env.DASHVECTOR_COLLECTION || 'qa_vectors';
const VECTOR_DIM = 1024;

function getBaseUrl(): string {
  const ep = DASHVECTOR_ENDPOINT.replace(/\/+$/, '');
  return ep.startsWith('http') ? ep : 'https://' + ep;
}

async function dashVectorRequest(
  path: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = getBaseUrl() + path;
  const res = await fetch(url, {
    method,
    headers: {
      'dashvector-auth-token': DASHVECTOR_API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  // -2021 = collection not found (expected in ensureCollection)
  if (data.code !== 0 && data.code !== -2021) {
    throw new Error(`DashVector error (${method} ${path}): code=${data.code} message=${data.message}`);
  }
  return data;
}

export interface VectorPoint {
  id: string;         // QAPair ID
  vector: number[];   // 1024 维
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
 * 确保 collection 存在，不存在则以 dimension=1024 cosine 创建
 */
export async function ensureCollection(): Promise<void> {
  const data = await dashVectorRequest(`/v1/collections/${QA_COLLECTION}`);
  if (data.code === -2021) {
    const createRes = await fetch(getBaseUrl() + '/v1/collections', {
      method: 'POST',
      headers: {
        'dashvector-auth-token': DASHVECTOR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: QA_COLLECTION,
        dimension: VECTOR_DIM,
        metric: 'cosine',
      }),
    });
    const createData = await createRes.json();
    if (createData.code !== 0) {
      // 如果其他人已并发创建，忽略
      if (createData.code === -2021) return;
      throw new Error(`DashVector create collection error: code=${createData.code} message=${createData.message}`);
    }
  }
}

/**
 * 批量写入向量
 */
export async function upsertVectors(points: VectorPoint[]): Promise<void> {
  await ensureCollection();

  const BATCH = 100;
  for (let i = 0; i < points.length; i += BATCH) {
    const batch = points.slice(i, i + BATCH);
    const docs = batch.map(p => ({
      id: p.id,
      vector: p.vector,
      fields: {
        question: p.payload.question,
        answer: p.payload.answer,
        projectId: p.payload.projectId,
        rawId: p.payload.rawId || '',
        tags: Array.isArray(p.payload.tags) ? p.payload.tags.join(',') : (p.payload.tags || ''),
        difficulty: p.payload.difficulty || '',
      },
    }));
    const data = await dashVectorRequest(`/v1/collections/${QA_COLLECTION}/docs`, 'POST', { docs });
    const failed = (data.output || []).filter((r: any) => r.code !== 0);
    if (failed.length > 0) {
      console.warn(`[vectorStore] ${failed.length} doc(s) failed to upsert`);
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

  const data = await dashVectorRequest(`/v1/collections/${QA_COLLECTION}/query`, 'POST', {
    vector,
    topk: topK,
    filter: `projectId = '${projectId.replace(/'/g, "\\'")}'`,
  });

  return (data.output || []).map((item: any) => ({
    id: item.id,
    score: item.score,
    payload: item.fields || {},
  }));
}
