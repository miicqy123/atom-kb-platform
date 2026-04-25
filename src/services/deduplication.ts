// src/services/deduplication.ts
import { prisma } from '@/lib/prisma';

/**
 * 语义去重：新原子块入库前检查是否与已有内容重复
 * 阈值：cosine similarity > 0.95 视为重复
 */
export async function checkDuplicate(
  projectId: string,
  content: string,
  threshold: number = 0.95
): Promise<{
  isDuplicate: boolean;
  similarAtomId?: string;
  similarity?: number;
}> {
  // 方案 A：调用现有 vector 路由的混合搜索
  try {
    const { hybridSearch } = await import('@/services/vectorService');

    const results = await hybridSearch(projectId, content.slice(0, 500), 3);

    if (results.length > 0 && results[0].score >= threshold) {
      return {
        isDuplicate: true,
        similarAtomId: results[0].id,
        similarity: results[0].score,
      };
    }

    return { isDuplicate: false };
  } catch {
    // 降级：跳过去重
    return { isDuplicate: false };
  }
}
