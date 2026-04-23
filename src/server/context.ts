import { PrismaClient } from "@prisma/client";
import { inferAsyncReturnType } from "@trpc/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../lib/auth";

export const prisma = new PrismaClient();

export async function createContext(opts?: { req?: any; res?: any }) {
  const session = opts?.req && opts?.res
    ? await getServerSession(opts.req, opts.res, authOptions)
    : null;

  return {
    prisma,
    session,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
