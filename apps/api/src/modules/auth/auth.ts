import type { FastifyReply, FastifyRequest } from "fastify";
import { getAdminClient } from "@freestyle/db";

const getBearerToken = (request: FastifyRequest) => {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  if (request.authUserId) return request.authUserId;

  const token = getBearerToken(request);
  if (!token) {
    const bypassUserId = process.env.DEV_BYPASS_USER_ID?.trim();
    if (process.env.NODE_ENV !== "production" && bypassUserId) {
      request.authUserId = bypassUserId;
      return bypassUserId;
    }
  }

  if (!token) {
    reply.code(401).send({ error: "UNAUTHORIZED", message: "Bearer token is required." });
    return null;
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    reply.code(401).send({ error: "UNAUTHORIZED", message: "Invalid or expired token." });
    return null;
  }

  request.authUserId = data.user.id;
  return data.user.id;
};
