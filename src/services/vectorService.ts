import { prisma } from '@/lib/prisma';

const QWEN_API_KEY = process.env.QWEN_API_KEY ?? '';
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${QWEN_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${QWEN_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-v2', input: text.slice(0, 2000) }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function upsertVector(id: string, projectId: string, content: string, metadata: Record<string, any> = {}): Promise<void> {
  const vector = await getEmbedding(content);
  const existing = await prisma.auditLog.findFirst({ where: { entityId: id, entityType: 'VECTOR' } });
  const data = { userId: 'system', entityId: id, entityType: 'VECTOR', entityName: projectId, action: 'VECTOR_STORE', changeSummary: JSON.stringify({ content: content.slice(0,500), metadata, vector }) };
  if (existing) { await prisma.auditLog.update({ where: { id: existing.id }, data }); }
  else { await prisma.auditLog.create({ data }); }
}

export async function searchSimilar(projectId: string, query: string, topK = 5): Promise<Array<{ id: string; content: string; metadata: Record<string, any>; score: number }>> {
  const queryVector = await getEmbedding(query);
  const entries = await prisma.auditLog.findMany({ where: { entityType: 'VECTOR', entityName: projectId } });
  return entries.map(e => {
    try { const p = JSON.parse(e.changeSummary || '{}'); return { id: e.entityId || '', content: p.content || '', metadata: p.metadata || {}, score: cosineSimilarity(queryVector, p.vector || []) }; }
    catch { return null; }
  }).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => b.score - a.score).slice(0, topK);
}

export async function deleteVector(id: string): Promise<void> { await prisma.auditLog.deleteMany({ where: { entityId: id, entityType: 'VECTOR' } }); }
export async function deleteProjectVectors(projectId: string): Promise<void> { await prisma.auditLog.deleteMany({ where: { entityName: projectId, entityType: 'VECTOR' } }); }
export async function checkHealth(): Promise<boolean> { try { await prisma.auditLog.count({ where: { entityType: 'VECTOR' } }); return true; } catch { return false; } }

export async function indexAtomBM25(atomId: string, title: string, content: string) { /* 数据在Atom表中 */ }

export async function searchBM25(query: string, limit = 10): Promise<string[]> {
  const atoms = await prisma.atom.findMany({ where: { OR: [{ title: { contains: query, mode: 'insensitive' } }, { content: { contains: query, mode: 'insensitive' } }] }, take: limit, select: { id: true } });
  return atoms.map(a => a.id);
}

export async function hybridSearch(projectId: string, query: string, topK = 10, filter?: object): Promise<{ id: string; score: number; source: 'bm25'|'vector'|'both' }[]> {
  const [bm25Ids, vectorResults] = await Promise.all([searchBM25(query, topK*2), searchSimilar(projectId, query, topK*2)]);
  const k = 60;
  const scores = new Map<string, { rrf: number; source: Set<string> }>();
  bm25Ids.forEach((id, rank) => { if (!scores.has(id)) scores.set(id, { rrf: 0, source: new Set() }); const e = scores.get(id)!; e.rrf += 1/(k+rank+1); e.source.add('bm25'); });
  vectorResults.forEach(({ id }, rank) => { if (!scores.has(id)) scores.set(id, { rrf: 0, source: new Set() }); const e = scores.get(id)!; e.rrf += 1/(k+rank+1); e.source.add('vector'); });
  return Array.from(scores.entries()).sort((a,b) => b[1].rrf - a[1].rrf).slice(0, topK).map(([id, { rrf, source }]) => ({ id, score: rrf, source: source.size===2 ? 'both' : (source.has('bm25') ? 'bm25' : 'vector') }));
}