import type { FastifyInstance } from "fastify";
import { getAdminClient } from "@freestyle/db";

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get("/healthz", async () => {
    return {
      status: "ok",
      service: "freestyle-api",
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/readyz", async (request, reply) => {
    try {
      const supabase = getAdminClient();
      const { error } = await supabase.from("jobs").select("id", { count: "exact", head: true }).limit(1);
      if (error) {
        request.log.error({ error }, "DB readiness check failed");
        return reply.code(503).send({ status: "not_ready", dependency: "supabase" });
      }

      return {
        status: "ready",
        dependency: "supabase",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      request.log.error({ error }, "Readiness check crashed");
      return reply.code(503).send({ status: "not_ready", dependency: "supabase" });
    }
  });
};
