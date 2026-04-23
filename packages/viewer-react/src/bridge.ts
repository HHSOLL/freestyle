import { buildBodyProfileRevision } from "@freestyle/contracts";
import type {
  AvatarPoseId,
  AvatarRenderVariantId,
  BodyProfile,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";
import type {
  ApplyGarmentsInput,
  FreestyleViewerSceneInput,
  LoadAvatarInput,
  ViewerCameraPreset,
} from "@freestyle/viewer-core";

export const buildViewerAvatarInput = ({
  avatarVariantId,
  bodyProfile,
}: {
  avatarVariantId: AvatarRenderVariantId;
  bodyProfile: BodyProfile;
}): LoadAvatarInput => ({
  avatarId: avatarVariantId,
  bodySignature: buildBodyProfileRevision(bodyProfile),
  appearance: {
    avatarVariantId,
    gender: bodyProfile.gender ?? null,
    bodyFrame: bodyProfile.bodyFrame ?? null,
  },
});

export const buildViewerGarmentsInput = (equippedGarments: RuntimeGarmentAsset[]): ApplyGarmentsInput =>
  equippedGarments.map((item) => ({
    garmentId: item.id,
    size: item.metadata?.selectedSizeLabel,
  }));

export const resolveViewerCameraPreset = (poseId: AvatarPoseId): ViewerCameraPreset => {
  switch (poseId) {
    case "stride":
      return "full-body-three-quarter";
    case "tailored":
      return "full-body-front-tight";
    case "contrapposto":
      return "full-body-front";
    case "relaxed":
      return "full-body-front";
    case "neutral":
    default:
      return "full-body-front";
  }
};

export const buildViewerSceneInput = ({
  avatarVariantId,
  backgroundColor,
  bodyProfile,
  equippedGarments,
  poseId,
  qualityTier,
  selectedItemId,
}: {
  avatarVariantId: AvatarRenderVariantId;
  backgroundColor?: string;
  bodyProfile: BodyProfile;
  equippedGarments: RuntimeGarmentAsset[];
  poseId: AvatarPoseId;
  qualityTier: "low" | "balanced" | "high";
  selectedItemId: string | null;
}): FreestyleViewerSceneInput => ({
  avatar: buildViewerAvatarInput({
    avatarVariantId,
    bodyProfile,
  }),
  garments: buildViewerGarmentsInput(equippedGarments),
  cameraPreset: resolveViewerCameraPreset(poseId),
  qualityMode: qualityTier,
  selectedItemId,
  backgroundColor,
});
