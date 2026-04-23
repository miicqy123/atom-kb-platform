import { z } from "zod";
import { router, withPermission } from "../trpc";

export const vectorRouter = router({
  search: withPermission("knowledge", "read").input(z.object({ projectId: z.string(), query: z.string(), topK: z.number().default(5), collection: z.string().default("atoms") })).query(async ({ ctx, input }) => {
    // TODO: 接入 Qdrant 向量检索
    return { results: [], message: "向量检索服务待接入" };
  }),
});