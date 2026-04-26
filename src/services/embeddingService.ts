// src/services/embeddingService.ts

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || '';
const EMBEDDING_MODEL = 'text-embedding-v3';
const EMBEDDING_DIM = 1024;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export interface EmbeddingResult {
  vector: number[];
  dimension: number;
  model: string;
}

/**
 * 对单条文本生成 embedding 向量
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const response = await fetch(`${DASHSCOPE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // 截断防超限
      dimensions: EMBEDDING_DIM,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return {
    vector: data.data[0].embedding,
    dimension: EMBEDDING_DIM,
    model: EMBEDDING_MODEL,
  };
}

/**
 * 批量生成 embedding（最多 25 条/批）
 */
export async function generateEmbeddingBatch(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const BATCH_SIZE = 25;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await fetch(`${DASHSCOPE_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch.map(t => t.slice(0, 8000)),
        dimensions: EMBEDDING_DIM,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding batch API error: ${response.status}`);
    }

    const data = await response.json();
    for (const item of data.data) {
      results.push({
        vector: item.embedding,
        dimension: EMBEDDING_DIM,
        model: EMBEDDING_MODEL,
      });
    }
  }

  return results;
}
