import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";
import { appRouter } from "../../../../server/routers/_app";
import { prisma } from "../../../../server/context";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const handler = async (req: NextRequest) => {
  // 在 App Router 的 fetch handler 中，直接获取 session
  const session = await getServerSession(authOptions);

  return fetchRequestHandler({
    req,
    router: appRouter,
    endpoint: "/api/trpc",
    createContext: () => Promise.resolve({ prisma, session }),
  });
};

export { handler as GET, handler as POST };