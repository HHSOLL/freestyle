"use client";

import { ensureBodySignatureHash, type BodySignature } from "@freestyle/asset-schema";
import type { GarmentMaterialProfile, GarmentSimProxy } from "@freestyle/contracts";
import type {
  PreviewBodyCollision,
  PreviewWorkerMessage,
  PreviewXpbdFitMesh,
} from "@freestyle/viewer-protocol";
import type {
  AvatarRenderVariantId,
  BodyProfile,
  RuntimeGarmentAsset,
} from "@freestyle/shared-types";
import { resolveGarmentRuntimeModelPath } from "@freestyle/domain-garment";

const resolveHeightClass = (heightCm: number): BodySignature["normalizedShape"]["heightClass"] => {
  if (heightCm < 162) return "short";
  if (heightCm > 175) return "tall";
  return "average";
};

const resolveTorsoClass = (
  torsoLengthCm?: number,
): BodySignature["normalizedShape"]["torsoClass"] => {
  if (!torsoLengthCm) return "average";
  if (torsoLengthCm < 58) return "short";
  if (torsoLengthCm > 64) return "long";
  return "average";
};

const resolveHipClass = (
  waistCm: number,
  hipCm: number,
): BodySignature["normalizedShape"]["hipClass"] => {
  const ratio = hipCm / waistCm;
  if (ratio < 1.2) return "narrow";
  if (ratio > 1.32) return "wide";
  return "average";
};

const resolveShoulderClass = (
  shoulderCm: number,
): BodySignature["normalizedShape"]["shoulderClass"] => {
  if (shoulderCm < 39) return "narrow";
  if (shoulderCm > 44) return "wide";
  return "average";
};

const toRepoRelativePublicAssetPath = (value: string) =>
  value.startsWith("/") ? `apps/web/public${value}` : value;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const categoryMaterialDefaults = {
  tops: { fabricFamily: "knit", thicknessMm: 1.1, density: 180, bend: 18, shear: 22, damping: 0.92, friction: 0.55 },
  bottoms: { fabricFamily: "woven", thicknessMm: 1.4, density: 260, bend: 28, shear: 30, damping: 0.94, friction: 0.6 },
  outerwear: { fabricFamily: "woven", thicknessMm: 2.1, density: 340, bend: 36, shear: 34, damping: 0.98, friction: 0.62 },
  shoes: { fabricFamily: "rubber", thicknessMm: 4.2, density: 520, bend: 60, shear: 52, damping: 1.02, friction: 0.78 },
  accessories: { fabricFamily: "blended", thicknessMm: 1.2, density: 120, bend: 24, shear: 20, damping: 0.88, friction: 0.42 },
  hair: { fabricFamily: "synthetic", thicknessMm: 0.8, density: 90, bend: 12, shear: 16, damping: 0.86, friction: 0.38 },
  custom: { fabricFamily: "blended", thicknessMm: 1.6, density: 220, bend: 26, shear: 24, damping: 0.9, friction: 0.5 },
} as const;

const categoryTriangleBudget = {
  tops: 3200,
  bottoms: 3600,
  outerwear: 4200,
  shoes: 2400,
  accessories: 1200,
  hair: 2200,
  custom: 3000,
} as const;

export const buildRuntimePreviewBodySignature = (
  bodyProfile: BodyProfile,
): BodySignature =>
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
      footLengthCm: bodyProfile.detailed?.outseamCm,
      footWidthCm: bodyProfile.detailed?.ankleCm,
      instepHeightCm: bodyProfile.detailed?.calfCm,
    },
    normalizedShape: {
      heightClass: resolveHeightClass(bodyProfile.simple.heightCm),
      torsoClass: resolveTorsoClass(bodyProfile.detailed?.torsoLengthCm),
      hipClass: resolveHipClass(bodyProfile.simple.waistCm, bodyProfile.simple.hipCm),
      shoulderClass: resolveShoulderClass(bodyProfile.simple.shoulderCm),
    },
  });

export const buildRuntimePreviewCollisionBody = (input: {
  avatarVariantId: AvatarRenderVariantId;
  bodyProfile: BodyProfile;
  bodySignature: BodySignature;
}): PreviewBodyCollision => {
  const { bodyProfile, bodySignature, avatarVariantId } = input;
  const torsoRadiusCm = clamp(bodyProfile.simple.chestCm / (Math.PI * 2) * 0.78, 9, 18);
  const hipsRadiusCm = clamp(bodyProfile.simple.hipCm / (Math.PI * 2) * 0.74, 10, 20);
  const armRadiusCm = clamp((bodyProfile.detailed?.bicepCm ?? bodyProfile.simple.shoulderCm * 0.34) / (Math.PI * 2), 3.5, 8);
  const legRadiusCm = clamp((bodyProfile.detailed?.thighCm ?? bodyProfile.simple.hipCm * 0.32) / (Math.PI * 2), 4.5, 10);
  const footRadiusCm = clamp((bodyProfile.detailed?.ankleCm ?? 22) / (Math.PI * 2), 3.2, 6);

  return {
    schemaVersion: "preview-body-collision.v1",
    avatarId: avatarVariantId,
    bodySignatureHash: bodySignature.hash,
    colliders: [
      {
        id: "torso-body",
        zone: "torso",
        kind: "capsule",
        radiusCm: torsoRadiusCm,
        halfHeightCm: clamp((bodyProfile.detailed?.torsoLengthCm ?? 61) * 0.46, 18, 34),
        anchorId: "chestCenter",
      },
      {
        id: "arms-body",
        zone: "arms",
        kind: "capsule",
        radiusCm: armRadiusCm,
        halfHeightCm: clamp((bodyProfile.detailed?.armLengthCm ?? 59) * 0.36, 16, 28),
        anchorId: "leftShoulder",
      },
      {
        id: "hips-body",
        zone: "hips",
        kind: "capsule",
        radiusCm: hipsRadiusCm,
        halfHeightCm: clamp((bodyProfile.simple.hipCm - bodyProfile.simple.waistCm) * 0.22, 10, 20),
        anchorId: "hipCenter",
      },
      {
        id: "legs-body",
        zone: "legs",
        kind: "capsule",
        radiusCm: legRadiusCm,
        halfHeightCm: clamp((bodyProfile.simple.inseamCm ?? 79) * 0.42, 20, 40),
        anchorId: "leftKnee",
      },
      {
        id: "feet-body",
        zone: "feet",
        kind: "capsule",
        radiusCm: footRadiusCm,
        halfHeightCm: clamp((bodyProfile.detailed?.outseamCm ?? 26) * 0.22, 4, 10),
        anchorId: "leftFoot",
      },
    ],
  };
};

export const buildRuntimePreviewFitMesh = (input: {
  item: RuntimeGarmentAsset;
  avatarVariantId: AvatarRenderVariantId;
}): GarmentSimProxy => {
  const { item, avatarVariantId } = input;

  return {
    schemaVersion: "garment-sim-proxy.v1",
    intendedUse: "solver-authoring" as const,
    runtimeStarterId: item.id,
    category: item.category,
    proxyStrategy: "decimated-runtime-mesh" as const,
    meshRelativePathByVariant: {
      "female-base": item.runtime.modelPathByVariant?.["female-base"]
        ? toRepoRelativePublicAssetPath(item.runtime.modelPathByVariant["female-base"])
        : undefined,
      "male-base": item.runtime.modelPathByVariant?.["male-base"]
        ? toRepoRelativePublicAssetPath(item.runtime.modelPathByVariant["male-base"])
        : undefined,
      [avatarVariantId]: toRepoRelativePublicAssetPath(
        resolveGarmentRuntimeModelPath(item.runtime, avatarVariantId, "high"),
      ),
    },
    triangleBudget: categoryTriangleBudget[item.category],
    pinnedAnchorIds: item.runtime.anchorBindings.map((binding) => binding.id),
    selfCollision: item.category !== "shoes" && item.category !== "accessories" && item.category !== "hair",
    notes: `Runtime compatibility fit mesh for ${item.id}.`,
  };
};

export const buildRuntimePreviewXpbdFitMesh = (input: {
  item: RuntimeGarmentAsset;
  bodyProfile: BodyProfile;
}): PreviewXpbdFitMesh => {
  const { item, bodyProfile } = input;
  const isFootwear = item.category === "shoes";
  const columns = isFootwear ? 4 : item.category === "hair" ? 5 : 8;
  const rows = isFootwear ? 3 : item.category === "hair" ? 5 : 8;
  const widthMeters = isFootwear
    ? clamp((bodyProfile.detailed?.ankleCm ?? 22) / 100, 0.16, 0.34)
    : clamp(bodyProfile.simple.chestCm / 100 * 0.46, 0.32, 0.56);
  const heightMeters = isFootwear
    ? clamp((bodyProfile.detailed?.outseamCm ?? 26) / 100 * 0.72, 0.16, 0.32)
    : clamp((bodyProfile.detailed?.torsoLengthCm ?? 61) / 100 * 0.72, 0.36, 0.62);
  const positions: number[] = [];
  const inverseMasses: number[] = [];
  const constraints: PreviewXpbdFitMesh["constraints"] = [];
  const vertex = (x: number, y: number) => y * columns + x;
  const columnDivisor = Math.max(columns - 1, 1);
  const rowDivisor = Math.max(rows - 1, 1);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const u = x / columnDivisor;
      const v = y / rowDivisor;
      const px = (u - 0.5) * widthMeters;
      const py = isFootwear ? 0.12 - v * heightMeters : 0.95 - v * heightMeters;
      const pz = isFootwear ? (v - 0.5) * 0.12 : 0;
      positions.push(Number(px.toFixed(5)), Number(py.toFixed(5)), Number(pz.toFixed(5)));
      inverseMasses.push(y === 0 || (isFootwear && x === 0) ? 0 : 1);
      if (y === 0 || (isFootwear && x === 0)) {
        constraints.push({
          kind: "pin",
          particle: vertex(x, y),
          target: [Number(px.toFixed(5)), Number(py.toFixed(5)), Number(pz.toFixed(5))],
        });
      }
      if (x > 0) {
        constraints.push({
          kind: isFootwear ? "strap" : "stretch",
          particleA: vertex(x - 1, y),
          particleB: vertex(x, y),
          restLengthMeters: Number((widthMeters / columnDivisor).toFixed(5)),
        });
      }
      if (y > 0) {
        constraints.push({
          kind: y === rows - 1 ? "hem" : "stretch",
          particleA: vertex(x, y - 1),
          particleB: vertex(x, y),
          restLengthMeters: Number((heightMeters / rowDivisor).toFixed(5)),
        });
      }
      if (x > 0 && y > 0) {
        constraints.push({
          kind: "shear",
          particleA: vertex(x - 1, y - 1),
          particleB: vertex(x, y),
          restLengthMeters: Number(
            Math.hypot(
              widthMeters / columnDivisor,
              heightMeters / rowDivisor,
            ).toFixed(5),
          ),
          compliance: 0.00002,
        });
      }
    }
  }

  const centerParticle = vertex(Math.floor(columns / 2), Math.floor(rows / 2));
  constraints.push({
    kind: "sphere-collision",
    particle: centerParticle,
    center: isFootwear ? [0, 0, 0] : [0, 0.68, 0],
    radiusMeters: isFootwear
      ? clamp((bodyProfile.detailed?.ankleCm ?? 22) / 100 * 0.16, 0.03, 0.07)
      : clamp(bodyProfile.simple.chestCm / 100 * 0.11, 0.08, 0.13),
    marginMeters: 0.004,
    friction: categoryMaterialDefaults[item.category].friction,
  });

  return {
    schemaVersion: "preview-xpbd-fit-mesh.v1",
    positions,
    inverseMasses,
    constraints,
    iterations: isFootwear ? 10 : 14,
    gravity: isFootwear ? [0, 0, 0] : [0, -9.81, 0],
    damping: clamp(categoryMaterialDefaults[item.category].damping, 0, 1),
  };
};

export const buildRuntimePreviewMaterialProfile = (
  item: RuntimeGarmentAsset,
): GarmentMaterialProfile => {
  const defaults = categoryMaterialDefaults[item.category];
  const physical = item.metadata?.physicalProfile;
  const stretchRatio = clamp(
    physical?.materialStretchRatio ?? physical?.maxComfortStretchRatio ?? 0.18,
    0.04,
    0.45,
  );
  const comfortStretch = clamp(
    physical?.maxComfortStretchRatio ?? stretchRatio * 1.2,
    stretchRatio,
    0.5,
  );

  return {
    schemaVersion: "garment-material-profile.v1",
    intendedUse: "solver-authoring" as const,
    runtimeStarterId: item.id,
    category: item.category,
    materialPresetId: `runtime-compat-${item.category}`,
    fabricFamily: defaults.fabricFamily,
    stretchProfile:
      comfortStretch < 0.12 ? ("none" as const) : comfortStretch < 0.2 ? ("low" as const) : comfortStretch < 0.32 ? ("medium" as const) : ("high" as const),
    thicknessMm: defaults.thicknessMm,
    arealDensityGsm: defaults.density,
    solver: {
      warpStretchRatio: stretchRatio,
      weftStretchRatio: clamp(stretchRatio * 1.12, stretchRatio, 0.6),
      biasStretchRatio: clamp(stretchRatio * 1.28, stretchRatio, 0.7),
      bendStiffness: defaults.bend,
      shearStiffness: defaults.shear,
      damping: defaults.damping,
      friction: defaults.friction,
    },
    notes: `Runtime compatibility material profile for ${item.id}.`,
  };
};

export const buildRuntimePreviewWorkerSetupMessages = (input: {
  avatarVariantId: AvatarRenderVariantId;
  bodyProfile: BodyProfile;
  item: RuntimeGarmentAsset;
}) => {
  const bodySignature = buildRuntimePreviewBodySignature(input.bodyProfile);

  return {
    bodySignature,
    messages: [
      {
        type: "INIT_SOLVER",
        backend: "transferable-array-buffer",
      },
      {
        type: "SET_BODY_SIGNATURE",
        bodySignature,
      },
      {
        type: "SET_COLLISION_BODY",
        collisionBody: buildRuntimePreviewCollisionBody({
          avatarVariantId: input.avatarVariantId,
          bodyProfile: input.bodyProfile,
          bodySignature,
        }),
      },
      {
        type: "SET_GARMENT_FIT_MESH",
        garmentId: input.item.id,
        fitMesh: buildRuntimePreviewFitMesh({
          item: input.item,
          avatarVariantId: input.avatarVariantId,
        }),
        xpbdFitMesh: buildRuntimePreviewXpbdFitMesh({
          item: input.item,
          bodyProfile: input.bodyProfile,
        }),
      },
      {
        type: "SET_MATERIAL_PHYSICS",
        garmentId: input.item.id,
        materialProfile: buildRuntimePreviewMaterialProfile(input.item),
      },
    ] satisfies PreviewWorkerMessage[],
  };
};
