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

const getAdminAllowlist = () => {
  const raw = process.env.ADMIN_USER_IDS?.trim();
  if (!raw) {
    return new Set<string>();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => UUID_PATTERN.test(value)),
  );
};

const collectClaimStrings = (value: unknown): string[] => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized ? [normalized] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => collectClaimStrings(entry));
};

const hasAdminRoleClaim = (user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}) => {
  const appMetadata = user.app_metadata ?? {};
  const userMetadata = user.user_metadata ?? {};
  const claims = [
    ...collectClaimStrings(appMetadata.role),
    ...collectClaimStrings(appMetadata.roles),
    ...collectClaimStrings(appMetadata.freestyle_role),
    ...collectClaimStrings(appMetadata.freestyle_roles),
    ...collectClaimStrings(userMetadata.role),
    ...collectClaimStrings(userMetadata.roles),
    ...collectClaimStrings(userMetadata.freestyle_role),
    ...collectClaimStrings(userMetadata.freestyle_roles),
  ];

  return claims.some((claim) =>
    ["admin", "partner", "publisher", "operator", "internal-admin"].includes(claim),
  );
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

export const requireAdminAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const userId = await requireAuth(request, reply);
  if (!userId) return null;

  const token = getBearerToken(request);
  const allowlist = getAdminAllowlist();
  const devBypassUserId = process.env.DEV_BYPASS_USER_ID?.trim();

  if (!token) {
    if (
      process.env.NODE_ENV !== "production" &&
      devBypassUserId &&
      userId === devBypassUserId &&
      (allowlist.size === 0 || allowlist.has(userId))
    ) {
      return userId;
    }

    reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Admin bearer token is required.",
    });
    return null;
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    reply.code(401).send({ error: "UNAUTHORIZED", message: "Invalid or expired token." });
    return null;
  }

  if (data.user.id !== userId) {
    reply.code(401).send({ error: "UNAUTHORIZED", message: "Authenticated user mismatch." });
    return null;
  }

  if (allowlist.has(userId) || hasAdminRoleClaim(data.user)) {
    return userId;
  }

  reply.code(403).send({
    error: "FORBIDDEN",
    message: "Admin access is required.",
  });
  return null;
};
