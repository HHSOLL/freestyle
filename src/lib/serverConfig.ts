import path from "node:path";

type NodeEnv = "development" | "test" | "production";
type HumanDetectionMode = "none" | "face";
type HumanFaceModelSource = "local" | "remote";

const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

const readEnv = (key: string) => {
  const value = process.env[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const parseHumanDetectionMode = (value: string | undefined): HumanDetectionMode => {
  if (!value) return "none";
  return value === "face" ? "face" : "none";
};

const parseHumanFaceModelSource = (
  value: string | undefined,
  fallback: HumanFaceModelSource
): HumanFaceModelSource => {
  if (!value) return fallback;
  return value === "remote" ? "remote" : "local";
};

const resolveNodeEnv = (): NodeEnv => {
  const value = readEnv("NODE_ENV");
  if (value === "production" || value === "test") return value;
  return "development";
};

const nodeEnv = resolveNodeEnv();
const isProduction = nodeEnv === "production";

const allowedImageHosts = (readEnv("ALLOWED_IMAGE_HOSTS") || "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export const serverConfig = {
  nodeEnv,
  isProduction,
  allowFilesystemStorageInProduction: parseBoolean(
    readEnv("ALLOW_FILESYSTEM_STORAGE_IN_PRODUCTION"),
    false
  ),
  redisUrl: readEnv("REDIS_URL") || (isProduction ? undefined : DEFAULT_REDIS_URL),
  bgRemovalConcurrency: parsePositiveInt(readEnv("BG_REMOVAL_CONCURRENCY"), 2),
  vtoConcurrency: parsePositiveInt(readEnv("VTO_CONCURRENCY"), 1),
  importConcurrency: parsePositiveInt(readEnv("IMPORT_CONCURRENCY"), 2),
  importCartItemConcurrency: parsePositiveInt(readEnv("IMPORT_CART_ITEM_CONCURRENCY"), 3),
  assetStoragePath: readEnv("ASSET_STORAGE_PATH") || path.join(process.cwd(), "data", "assets"),
  assetIndexPath: readEnv("ASSET_INDEX_PATH"),
  outfitsStoragePath: readEnv("OUTFITS_STORAGE_PATH") || path.join(process.cwd(), "data", "outfits.json"),
  allowedImageHosts,
  removeBgEndpoint: readEnv("REMOVE_BG_ENDPOINT") || "https://api.remove.bg/v1.0/removebg",
  removeBgSize: readEnv("REMOVE_BG_SIZE") || "preview",
  removeBgApiKey: readEnv("REMOVE_BG_API_KEY"),
  supabaseUrl: readEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  geminiApiKey: readEnv("GEMINI_API_KEY"),
  geminiReviewModel: readEnv("GEMINI_REVIEW_MODEL") || "gemini-3-flash-preview",
  vtoApiKey: readEnv("VTO_API_KEY"),
  vtoEndpoint: readEnv("VTO_ENDPOINT"),
  vtoAuthHeader: readEnv("VTO_AUTH_HEADER") || "Authorization",
  vtoAuthScheme: readEnv("VTO_AUTH_SCHEME") ?? "Bearer",
  vtoProvider: readEnv("VTO_PROVIDER") || "generic",
  humanDetectionMode: parseHumanDetectionMode(readEnv("HUMAN_DETECTION_MODE")),
  humanFaceModelSource: parseHumanFaceModelSource(
    readEnv("HUMAN_FACE_MODEL_SOURCE"),
    isProduction ? "local" : "remote"
  ),
  humanFaceModelPath:
    readEnv("HUMAN_FACE_MODEL_PATH") || path.join(process.cwd(), "models", "blazeface", "model.json"),
  humanFaceModelUrl: readEnv("HUMAN_FACE_MODEL_URL"),
  humanDetectionMaxCandidates: clamp(
    parsePositiveInt(readEnv("HUMAN_DETECTION_MAX_CANDIDATES"), 12),
    1,
    40
  ),
  humanDetectionMaxSide: clamp(parsePositiveInt(readEnv("HUMAN_DETECTION_MAX_SIDE"), 320), 160, 512),
  humanFaceMinAreaRatio: clamp(parseNumber(readEnv("HUMAN_FACE_MIN_AREA_RATIO"), 0.004), 0.001, 0.02),
  humanFacePenaltyBase: clamp(parseNumber(readEnv("HUMAN_FACE_PENALTY_BASE"), 120), 0, 500),
  humanFacePenaltySlope: clamp(parseNumber(readEnv("HUMAN_FACE_PENALTY_SLOPE"), 400), 0, 2000),
  strictNoModelImport: parseBoolean(readEnv("STRICT_NO_MODEL_IMPORT"), isProduction),
};

export const hasSupabaseAdminCredentials = () =>
  Boolean(serverConfig.supabaseUrl && serverConfig.supabaseServiceRoleKey);

export const requireRedisUrl = () => {
  if (serverConfig.redisUrl) {
    return serverConfig.redisUrl;
  }
  throw new Error(
    "REDIS_URL is required in production. Configure managed Redis/Valkey before enabling queue APIs."
  );
};

export const assertFilesystemStorageAllowed = (context: string) => {
  if (!serverConfig.isProduction) return;
  if (serverConfig.allowFilesystemStorageInProduction) return;
  throw new Error(
    `Filesystem storage is disabled in production for ${context}. Use managed storage or set ALLOW_FILESYSTEM_STORAGE_IN_PRODUCTION=true explicitly.`
  );
};
