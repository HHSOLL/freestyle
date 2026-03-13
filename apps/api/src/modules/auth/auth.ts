import type { FastifyReply, FastifyRequest } from "fastify";
import { getAdminClient } from "@freestyle/db";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const getBearerToken = (request: FastifyRequest) => {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

const getAnonymousUserId = (request: FastifyRequest) => {
  const header = request.headers["x-anonymous-user-id"];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) return null;
  return normalized;
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

  if (!token && toBoolean(process.env.ALLOW_ANONYMOUS_USER, true)) {
    const anonymousUserId = getAnonymousUserId(request);
    if (anonymousUserId) {
      request.authUserId = anonymousUserId;
      return anonymousUserId;
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
