// src/app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { register } from 'prom-client';

export async function GET() {
  const metrics = await register.metrics();
  return new NextResponse(metrics, {
    headers: { 'Content-Type': register.contentType },
  });
}