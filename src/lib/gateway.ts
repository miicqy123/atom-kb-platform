import { prisma } from './prisma';

export async function checkRateLimit(apiKeyId: string, limitPerMinute = 60): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - 60_000);
  const count = await prisma.auditLog.count({ where: { entityId: apiKeyId, action: 'API_REQUEST', createdAt: { gte: windowStart } } });
  if (count >= limitPerMinute) return { allowed: false, remaining: 0 };
  try { await prisma.auditLog.create({ data: { userId: 'system', entityId: apiKeyId, entityType: 'API_KEY', action: 'API_REQUEST', entityName: 'rate-limit' } }); } catch(e) {}
  return { allowed: true, remaining: limitPerMinute - count - 1 };
}

export async function checkExposureLevel(blueprintId: string, callerRole: 'INTERNAL'|'EXTERNAL'|'ADMIN'): Promise<{ allowed: boolean; reason?: string }> {
  const blueprint = await prisma.blueprint.findUnique({ where: { id: blueprintId }, select: { exposureLevel: true } });
  if (!blueprint) return { allowed: false, reason: '蓝图不存在' };
  const level = blueprint.exposureLevel;
  if (level === 'STRICTLY_FORBIDDEN') return { allowed: false, reason: '严禁访问' };
  if (level === 'INTERNAL' && callerRole === 'EXTERNAL') return { allowed: false, reason: '仅限内部' };
  if (level === 'NEEDS_APPROVAL' && callerRole !== 'ADMIN') return { allowed: false, reason: '需管理员审批' };
  return { allowed: true };
}