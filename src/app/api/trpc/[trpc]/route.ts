import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";
import { createContext } from "../../../../server/context";
import { appRouter } from "../../../../server/routers/_app";

// Enable streaming responses
export const runtime = "nodejs";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    req,
    router: appRouter,
    endpoint: "/api/trpc",
    createContext: () => createContext(),
  });

export { handler as GET, handler as POST };