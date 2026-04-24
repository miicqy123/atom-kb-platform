"use client";

import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "../server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

// 在现有 export 之后追加：
import type { inferRouterOutputs } from '@trpc/server';
export type RouterOutputs = inferRouterOutputs<AppRouter>;