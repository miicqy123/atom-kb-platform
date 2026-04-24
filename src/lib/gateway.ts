// src/lib/gateway.ts
import { prisma } from './prisma';

// 简单内存限流（生产建议改用 Redis）
const requestCounts = new Map<string, { count: number; windowStart: number }>();

export async function checkRateLimit(
  apiKeyId: string,
  limitPerMinute = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowMs = 60_000;
  const entry = requestCounts.get(apiKeyId);

  if (!entry || now - entry.windowStart > windowMs) {
    requestCounts.set(apiKeyId, { count: 1, windowStart: now });
    return { allowed: true, remaining: limitPerMinute - 1 };
  }

  entry.count++;
  if (entry.count > limitPerMinute) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limitPerMinute - entry.count };
}

export async function checkExposureLevel(
  blueprintId: string,
  callerRole: 'INTERNAL' | 'EXTERNAL' | 'ADMIN'
): Promise<{ allowed: boolean; reason?: string }> {
  const blueprint = await prisma.blueprint.findUnique({
    where: { id: blueprintId },
    select: { exposureLevel: true, name: true },
  });

  if (!blueprint) return { allowed: false, reason: '蓝图不存在' };

  const level = blueprint.exposureLevel;

  if (level === 'STRICTLY_FORBIDDEN') {
    return { allowed: false, reason: '该蓝图已被设为严禁访问' };
  }
  if (level === 'INTERNAL' && callerRole === 'EXTERNAL') {
    return { allowed: false, reason: '该蓝图仅限内部访问' };
  }
  if (level === 'NEEDS_APPROVAL' && callerRole !== 'ADMIN') {
    return { allowed: false, reason: '该蓝图需要管理员审批才能访问' };
  }

  return { allowed: true };
}