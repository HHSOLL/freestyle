export type ViewportQualityTier = "low" | "balanced" | "high";
export type StageSupportState = "pending" | "supported" | "unsupported";
export type StageLoadState = "loading" | "ready" | "error";
export type StageRenderState = "loading" | "ready" | "error" | "unsupported";

export type AvatarStageViewportLifecycleState = {
  attempt: number;
  supportState: StageSupportState;
  loadState: StageLoadState;
};

type StageCanvasLike = {
  getContext: (contextId: string) => unknown;
};

type StageCanvasFactory = () => StageCanvasLike;

type AvatarStageViewportLifecycleEvent =
  | { type: "support-detected"; supportState: Exclude<StageSupportState, "pending"> }
  | { type: "load-started"; attempt: number }
  | { type: "load-resolved"; attempt: number; loadState: Exclude<StageLoadState, "loading"> }
  | { type: "retry-requested" };

export const avatarStageViewportInitialLifecycleState: AvatarStageViewportLifecycleState = {
  attempt: 0,
  supportState: "pending",
  loadState: "loading",
};

const qualityTierRank = {
  low: 0,
  balanced: 1,
  high: 2,
} as const;

export function resolveAvatarStageViewportQualityTier(
  requestedQualityTier: ViewportQualityTier | undefined,
  detectedQualityTier: ViewportQualityTier,
) {
  if (!requestedQualityTier) {
    return detectedQualityTier;
  }

  return qualityTierRank[requestedQualityTier] <= qualityTierRank[detectedQualityTier]
    ? requestedQualityTier
    : detectedQualityTier;
}

export function detectAvatarStageViewportSupport(createCanvas?: StageCanvasFactory | null): Exclude<StageSupportState, "pending"> {
  if (!createCanvas) {
    return "supported";
  }

  const canvas = createCanvas();
  return canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    ? "supported"
    : "unsupported";
}

export function reduceAvatarStageViewportLifecycle(
  state: AvatarStageViewportLifecycleState,
  event: AvatarStageViewportLifecycleEvent,
): AvatarStageViewportLifecycleState {
  switch (event.type) {
    case "support-detected":
      return {
        ...state,
        supportState: event.supportState,
        loadState: "loading",
      };
    case "load-started":
      if (state.supportState !== "supported" || event.attempt !== state.attempt) {
        return state;
      }
      return {
        ...state,
        loadState: "loading",
      };
    case "load-resolved":
      if (state.supportState !== "supported" || event.attempt !== state.attempt) {
        return state;
      }
      return {
        ...state,
        loadState: event.loadState,
      };
    case "retry-requested":
      if (state.supportState !== "supported") {
        return state;
      }
      return {
        attempt: state.attempt + 1,
        supportState: state.supportState,
        loadState: "loading",
      };
    default:
      return state;
  }
}

export function shouldApplyAvatarStageViewportLoadResult({
  cancelled,
  supportState,
  activeAttempt,
  resolvedAttempt,
}: {
  cancelled: boolean;
  supportState: StageSupportState;
  activeAttempt: number;
  resolvedAttempt: number;
}) {
  if (cancelled) {
    return false;
  }

  return supportState === "supported" && activeAttempt === resolvedAttempt;
}

export function resolveAvatarStageViewportRenderState(
  state: AvatarStageViewportLifecycleState,
  hasStageComponent: boolean,
): StageRenderState {
  if (state.supportState === "unsupported") {
    return "unsupported";
  }

  if (state.loadState === "error") {
    return "error";
  }

  if (state.supportState !== "supported" || state.loadState !== "ready" || !hasStageComponent) {
    return "loading";
  }

  return "ready";
}
