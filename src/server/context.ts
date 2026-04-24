import { PrismaClient } from "@prisma/client";
import { inferAsyncReturnType } from "@trpc/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../lib/auth";

export const prisma = new PrismaClient();

export async function createContext(opts?: { req?: any; res?: any; session?: any }) {
  // 如果直接传入了 session，使用它
  if (opts?.session !== undefined) {
    return { prisma, session: opts.session };
  }

  // 否则尝试获取 session
  let session = null;
  try {
    if (opts?.req && opts?.res) {
      session = await getServerSession(opts.req, opts.res, authOptions);
    } else {
      session = await getServerSession(authOptions);
    }
  } catch (e) {
    console.error("[TRPC Context] Failed to get session:", e);
  }

  return { prisma, session };
}

export type Context = inferAsyncReturnType<typeof createContext>;
