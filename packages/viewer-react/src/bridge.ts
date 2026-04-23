import { ensureBodySignatureHash, type BodySignature } from "@freestyle/asset-schema";
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

const resolveHeightClass = (heightCm: number): BodySignature["normalizedShape"]["heightClass"] => {
  if (heightCm < 162) return "short";
  if (heightCm > 175) return "tall";
  return "average";
};

const resolveTorsoClass = (torsoLengthCm?: number): BodySignature["normalizedShape"]["torsoClass"] => {
  if (!torsoLengthCm) return "average";
  if (torsoLengthCm < 58) return "short";
  if (torsoLengthCm > 64) return "long";
  return "average";
};

const resolveHipClass = (waistCm: number, hipCm: number): BodySignature["normalizedShape"]["hipClass"] => {
  const ratio = hipCm / waistCm;
  if (ratio < 1.2) return "narrow";
  if (ratio > 1.32) return "wide";
  return "average";
};

const resolveShoulderClass = (shoulderCm: number): BodySignature["normalizedShape"]["shoulderClass"] => {
  if (shoulderCm < 39) return "narrow";
  if (shoulderCm > 44) return "wide";
  return "average";
};

export const buildViewerBodySignature = (bodyProfile: BodyProfile): BodySignature =>
  ensureBodySignatureHash({
    version: "body-signature.v1",
    measurements: {
      heightCm: bodyProfile.simple.heightCm,
      bustCm: bodyProfile.simple.chestCm,
      waistCm: bodyProfile.simple.waistCm,
      hipCm: bodyProfile.simple.hipCm,
      shoulderWidthCm: bodyProfile.simple.shoulderCm,
      armLengthCm: bodyProfile.detailed?.armLengthCm,
      inseamCm: bodyProfile.simple.inseamCm,
      thighCm: bodyProfile.detailed?.thighCm,
      calfCm: bodyProfile.detailed?.calfCm,
    },
    normalizedShape: {
      heightClass: resolveHeightClass(bodyProfile.simple.heightCm),
      torsoClass: resolveTorsoClass(bodyProfile.detailed?.torsoLengthCm),
      hipClass: resolveHipClass(bodyProfile.simple.waistCm, bodyProfile.simple.hipCm),
      shoulderClass: resolveShoulderClass(bodyProfile.simple.shoulderCm),
    },
  });

export const buildViewerAvatarInput = ({
  avatarVariantId,
  bodyProfile,
}: {
  avatarVariantId: AvatarRenderVariantId;
  bodyProfile: BodyProfile;
}): LoadAvatarInput => ({
  avatarId: avatarVariantId,
  bodySignature: buildViewerBodySignature(bodyProfile),
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
