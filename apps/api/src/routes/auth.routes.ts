import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { getAdminClient } from "@freestyle/db";
import { buildOriginPolicy } from "../lib/originPolicy.js";

const NAVER_AUTHORIZE_URL = "https://nid.naver.com/oauth2.0/authorize";
const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me";
const STATE_TTL_MS = 10 * 60 * 1000;

type NaverStatePayload = {
  redirectTo: string;
  issuedAt: number;
};

type NaverProfileResponse = {
  resultcode?: string;
  message?: string;
  response?: {
    id?: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
};

const getPublicApiOrigin = (request: FastifyRequest) => {
  const configured = process.env.API_PUBLIC_ORIGIN?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    return `https://${railwayDomain.replace(/\/+$/, "")}`;
  }

  const forwardedProtoHeader = request.headers["x-forwarded-proto"];
  const forwardedHostHeader = request.headers["x-forwarded-host"];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader;
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader;
  const protocol = forwardedProto?.split(",")[0]?.trim() || request.protocol || "http";
  const host = forwardedHost?.split(",")[0]?.trim() || request.headers.host;

  if (!host) {
    throw new Error("Unable to determine public API host.");
  }

  return `${protocol}://${host}`;
};

const parseAbsoluteUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const encodeState = (payload: NaverStatePayload, secret: string) => {
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(serialized).digest("base64url");
  return `${serialized}.${signature}`;
};

const decodeState = (state: string, secret: string): NaverStatePayload | null => {
  const [serialized, signature] = state.split(".");
  if (!serialized || !signature) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(serialized).digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(serialized, "base64url").toString("utf8")) as NaverStatePayload;
    if (typeof payload.redirectTo !== "string" || typeof payload.issuedAt !== "number") {
      return null;
    }
    if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const buildNaverAuthorizeUrl = (params: {
  clientId: string;
  callbackUrl: string;
  state: string;
}) => {
  const url = new URL(NAVER_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.callbackUrl);
  url.searchParams.set("state", params.state);
  return url.toString();
};

const exchangeNaverCode = async (params: {
  code: string;
  state: string;
  clientId: string;
  clientSecret: string;
}) => {
  const url = new URL(NAVER_TOKEN_URL);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("client_secret", params.clientSecret);
  url.searchParams.set("code", params.code);
  url.searchParams.set("state", params.state);

  const response = await fetch(url.toString(), { method: "GET" });
  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; error?: string; error_description?: string }
    | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Failed to exchange Naver OAuth code.");
  }

  return payload.access_token;
};

const fetchNaverProfile = async (accessToken: string) => {
  const response = await fetch(NAVER_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as NaverProfileResponse | null;
  if (!response.ok || payload?.resultcode !== "00" || !payload.response?.email) {
    throw new Error(payload?.message || "Failed to read Naver profile.");
  }

  return payload.response;
};

export const registerAuthRoutes = (app: FastifyInstance) => {
  const originPolicy = buildOriginPolicy();

  app.get("/auth/naver/start", async (request, reply) => {
    const redirectToParam = (request.query as { redirect_to?: string }).redirect_to?.trim();
    const redirectTo = redirectToParam ? parseAbsoluteUrl(redirectToParam) : null;

    if (!redirectTo) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "redirect_to must be an absolute http(s) URL.",
      });
    }

    if (!originPolicy.isAllowedOrigin(redirectTo.origin)) {
      return reply.code(400).send({
        error: "INVALID_REDIRECT_ORIGIN",
        message: "redirect_to origin is not allowed.",
      });
    }

    const clientId = process.env.NAVER_CLIENT_ID?.trim();
    const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
    const stateSecret = process.env.NAVER_STATE_SECRET?.trim();

    if (!clientId || !clientSecret || !stateSecret) {
      return reply.code(503).send({
        error: "NAVER_LOGIN_NOT_CONFIGURED",
        message: "Naver login is not configured.",
      });
    }

    const callbackUrl = `${getPublicApiOrigin(request)}/v1/auth/naver/callback`;
    const state = encodeState(
      {
        redirectTo: redirectTo.toString(),
        issuedAt: Date.now(),
      },
      stateSecret
    );

    return reply.redirect(buildNaverAuthorizeUrl({ clientId, callbackUrl, state }));
  });

  app.get("/auth/naver/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string; error_description?: string };

    if (query.error) {
      return reply.code(400).send({
        error: query.error,
        message: query.error_description || "Naver login was cancelled.",
      });
    }

    const code = query.code?.trim();
    const state = query.state?.trim();
    const clientId = process.env.NAVER_CLIENT_ID?.trim();
    const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
    const stateSecret = process.env.NAVER_STATE_SECRET?.trim();

    if (!code || !state) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "code and state are required.",
      });
    }

    if (!clientId || !clientSecret || !stateSecret) {
      return reply.code(503).send({
        error: "NAVER_LOGIN_NOT_CONFIGURED",
        message: "Naver login is not configured.",
      });
    }

    const decodedState = decodeState(state, stateSecret);
    if (!decodedState) {
      return reply.code(400).send({
        error: "INVALID_STATE",
        message: "OAuth state is invalid or expired.",
      });
    }

    if (!originPolicy.isAllowedOrigin(new URL(decodedState.redirectTo).origin)) {
      return reply.code(400).send({
        error: "INVALID_REDIRECT_ORIGIN",
        message: "redirect_to origin is not allowed.",
      });
    }

    try {
      const accessToken = await exchangeNaverCode({
        code,
        state,
        clientId,
        clientSecret,
      });
      const profile = await fetchNaverProfile(accessToken);
      const supabase = getAdminClient();

      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: profile.email!,
        options: {
          redirectTo: decodedState.redirectTo,
          data: {
            provider: "naver",
            providers: ["naver"],
            full_name: profile.name || profile.nickname || null,
            avatar_url: profile.profile_image || null,
            naver_user_id: profile.id || null,
          },
        },
      });

      if (error || !data.properties.action_link) {
        throw new Error(error?.message || "Failed to create Supabase magic link.");
      }

      return reply.redirect(data.properties.action_link);
    } catch (error) {
      request.log.error({ err: error }, "Failed to complete Naver OAuth callback");
      const fallback = new URL(decodedState.redirectTo);
      fallback.searchParams.set(
        "error_description",
        error instanceof Error ? error.message : "Naver login failed."
      );
      return reply.redirect(fallback.toString());
    }
  });
};
