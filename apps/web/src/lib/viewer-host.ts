import type { ComponentType } from "react";
import type { BodyProfile, RuntimeGarmentAsset } from "@freestyle/shared-types";
import type { ViewportQualityTier } from "@/components/product/avatar-stage-viewport-lifecycle";

export type ViewerHostMode = "runtime-3d" | "viewer-react";

export type AvatarStageComponentProps = {
  bodyProfile: BodyProfile;
  avatarVariantId: "female-base" | "male-base";
  poseId: "neutral" | "relaxed" | "contrapposto" | "stride" | "tailored";
  equippedGarments: RuntimeGarmentAsset[];
  selectedItemId: string | null;
  qualityTier: ViewportQualityTier;
  backgroundColor?: string;
};

export type AvatarStageComponent = ComponentType<AvatarStageComponentProps>;

type Runtime3DModule = {
  ReferenceClosetStageCanvas?: AvatarStageComponent;
};

type ViewerReactModule = {
  FreestyleViewerHost?: AvatarStageComponent;
};

export const resolveViewerHost = (value = process.env.NEXT_PUBLIC_VIEWER_HOST): ViewerHostMode => {
  return value === "viewer-react" ? "viewer-react" : "runtime-3d";
};

export const loadConfiguredAvatarStageModule = async (host = resolveViewerHost()) => {
  if (host === "viewer-react") {
    return import("@freestyle/viewer-react");
  }

  return import("@freestyle/runtime-3d");
};

export const resolveAvatarStageComponent = (
  module: Partial<Runtime3DModule & ViewerReactModule>,
  host: ViewerHostMode,
): AvatarStageComponent | null => {
  if (host === "viewer-react") {
    return module.FreestyleViewerHost ?? null;
  }

  return module.ReferenceClosetStageCanvas ?? null;
};
