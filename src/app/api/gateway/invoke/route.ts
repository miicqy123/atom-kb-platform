// src/app/api/gateway/invoke/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, checkExposureLevel } from '@/lib/gateway';
import { runBlueprint } from '@/services/executionLoop';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiKey, blueprintId, userQuery } = body;

  // 1. 验证 API Key
  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey, isActive: true },
    include: { project: true },
  });
  if (!keyRecord) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // 2. 限流检查
  const { allowed, remaining } = await checkRateLimit(keyRecord.id, keyRecord.rateLimit ?? 60);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    );
  }

  // 3. ExposureLevel 鉴权
  const callerType = (keyRecord.callerType || 'EXTERNAL') as 'INTERNAL' | 'EXTERNAL' | 'ADMIN';
  const exposureCheck = await checkExposureLevel(
    blueprintId,
    callerType
  );
  if (!exposureCheck.allowed) {
    return NextResponse.json({ error: exposureCheck.reason }, { status: 403 });
  }

  // 4. 执行蓝图
  try {
    const result = await (runBlueprint as any)(blueprintId, keyRecord.projectId, userQuery);
    return NextResponse.json(
      { runId: result.runId, slots: result.results.map(r => ({ slot: r.slotKey, output: r.output, score: r.score })) },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}