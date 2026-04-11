import { clamp, readStoredJson, rgba, writeStoredJson } from "@freestyle/shared-utils";
import type {
  Asset,
  AvatarNormalizedParams,
  ClosetSceneState,
  GarmentCategory,
  GarmentCollisionZone,
  GarmentMeasurements,
  GarmentRuntimeBinding,
  StarterGarment,
} from "@freestyle/shared-types";
import {
  defaultSkeletonProfileId,
  freestyleSkeletonProfiles,
} from "./skeleton-profiles.js";

export const garmentStorageKey = "freestyle:starter-closet:v1";

const svgLabel = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const createSwatchThumbnail = (title: string, color: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 280">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="${color}" />
        </linearGradient>
      </defs>
      <rect width="220" height="280" rx="32" fill="rgba(255,255,255,0.42)" />
      <rect x="14" y="14" width="192" height="252" rx="26" fill="url(#bg)" />
      <circle cx="110" cy="70" r="28" fill="rgba(21,27,36,0.1)" />
      <path d="M70 225c10-58 33-88 40-88 7 0 30 30 40 88" fill="rgba(21,27,36,0.14)" />
      <text x="110" y="252" text-anchor="middle" fill="#10161f" font-size="14" font-family="Arial, sans-serif">${svgLabel(title)}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const createRuntime = (
  modelPath: string,
  collisionZones: GarmentCollisionZone[],
  bodyMaskZones: GarmentCollisionZone[],
  renderPriority: number,
): GarmentRuntimeBinding => ({
  modelPath,
  skeletonProfileId: defaultSkeletonProfileId,
  anchorBindings: [
    { id: "leftShoulder", weight: 0.25 },
    { id: "rightShoulder", weight: 0.25 },
    { id: "chestCenter", weight: 0.2 },
    { id: "waistCenter", weight: 0.15 },
    { id: "hipCenter", weight: 0.15 },
  ],
  collisionZones,
  bodyMaskZones,
  surfaceClearanceCm: renderPriority === 3 ? 2.2 : renderPriority === 2 ? 1.6 : 1.1,
  renderPriority,
});

export const starterGarmentCatalog: StarterGarment[] = [
  {
    id: "starter-top-ivory-tee",
    name: "Ivory Rib Tee",
    imageSrc: createSwatchThumbnail("Ivory Tee", "#ddd6c9"),
    category: "tops",
    brand: "Starter Rail",
    source: "starter",
    metadata: {
      dominantColor: "#ddd6c9",
      measurements: { chestCm: 98, waistCm: 90, shoulderCm: 43, sleeveLengthCm: 22, lengthCm: 60 },
      fitProfile: { layer: "base", silhouette: "regular", structure: "soft", stretch: 0.42, drape: 0.52 },
    },
    runtime: createRuntime("/assets/closet/models/top_tee.glb", ["torso", "arms"], ["torso"], 1),
    palette: ["#ddd6c9", "#111111", "#6f747a"],
  },
  {
    id: "starter-top-stripe-shirt",
    name: "Smoke Stripe Shirt",
    imageSrc: createSwatchThumbnail("Stripe Shirt", "#c7c9cf"),
    category: "tops",
    brand: "Starter Rail",
    source: "starter",
    metadata: {
      dominantColor: "#c7c9cf",
      measurements: { chestCm: 108, waistCm: 102, shoulderCm: 45, sleeveLengthCm: 61, lengthCm: 74 },
      fitProfile: { layer: "mid", silhouette: "relaxed", structure: "balanced", stretch: 0.18, drape: 0.44 },
    },
    runtime: createRuntime("/assets/closet/models/top_shirt.glb", ["torso", "arms"], ["torso"], 2),
    palette: ["#c7c9cf", "#8b8e96", "#efefef"],
  },
  {
    id: "starter-outer-soft-bomber",
    name: "Ash Bomber",
    imageSrc: createSwatchThumbnail("Ash Bomber", "#7f827f"),
    category: "outerwear",
    brand: "Starter Rail",
    source: "starter",
    metadata: {
      dominantColor: "#7f827f",
      measurements: { chestCm: 118, waistCm: 110, shoulderCm: 48, sleeveLengthCm: 63, lengthCm: 66 },
      fitProfile: { layer: "outer", silhouette: "regular", structure: "structured", stretch: 0.12, drape: 0.35 },
    },
    runtime: createRuntime("/assets/closet/models/outer_bomber.glb", ["torso", "arms"], ["torso", "arms"], 3),
    palette: ["#7f827f", "#4c5157", "#d5d7db"],
  },
  {
    id: "starter-outer-tailored-blazer",
    name: "Tailored Blazer",
    imageSrc: createSwatchThumbnail("Blazer", "#6d6a67"),
    category: "outerwear",
    brand: "Starter Rail",
    source: "starter",
    metadata: {
      dominantColor: "#6d6a67",
      measurements: { chestCm: 114, waistCm: 104, shoulderCm: 46, sleeveLengthCm: 62, lengthCm: 72 },
      fitProfile: { layer: "outer", silhouette: "tailored", structure: "structured", stretch: 0.08, drape: 0.24 },
    },
    runtime: createRuntime("/assets/closet/models/outer_blazer.glb", ["torso", "arms"], ["torso", "arms"], 3),
    palette: ["#6d6a67", "#272b31", "#c6c0b8"],
  },
  {
    id: "starter-bottom-soft-denim",
    name: "Soft Denim Trouser",
    imageSrc: createSwatchThumbnail("Denim", "#596474"),
    category: "bottoms",
    brand: "Starter Rail",
    source: "starter",
    metadata: {
      dominantColor: "#596474",
      measurements: { waistCm: 80, hipCm: 102, inseamCm: 80, riseCm: 31, hemCm: 42, lengthCm: 108 },
      fitProfile: { layer: "base", silhouette: "regular", structure: "balanced", stretch: 0.16, drape: 0.3 },
    },
    runtime: createRuntime("/assets/closet/models/bottom_denim.glb", ["hips", "legs"], ["hips", "legs"], 2),
    palette: ["#596474", "#343b48", "#d8dce2"],
  },
  {
    id: "starter-bottom-cargo",
    name: "Stone Cargo",
    imageSrc: createSwatchThumbnail("Cargo", "#7a7b6e"),
    category: "bottoms",
    brand: "Starter Rail",
    source: "starter",
    metadata: {
      dominantColor: "#7a7b6e",
      measurements: { waistCm: 84, hipCm: 108, inseamCm: 82, riseCm: 33, hemCm: 46, lengthCm: 110 },
      fitProfile: { layer: "base", silhouette: "relaxed", structure: "balanced", stretch: 0.1, drape: 0.34 },
    },
    runtime: createRuntime("/assets/closet/models/bottom_cargo.glb", ["hips", "legs"], ["hips", "legs"], 2),
    palette: ["#7a7b6e", "#9b9c8e", "#20242b"],
  },
  {
    id: "starter-shoe-sneaker",
    name: "Soft Sneaker",
    imageSrc: createSwatchThumbnail("Sneaker", "#f0efe9"),
    category: "shoes",
    brand: "Starter Rail",
    source: "starter",
    metadata: {
      dominantColor: "#f0efe9",
      measurements: { lengthCm: 29, hemCm: 12 },
      fitProfile: { layer: "base", silhouette: "regular", structure: "balanced", stretch: 0.02, drape: 0.02 },
    },
    runtime: createRuntime("/assets/closet/models/shoes_sneaker.glb", ["feet"], ["feet"], 1),
    palette: ["#f0efe9", "#a8afb6", "#121821"],
  },
];

export const starterGarmentById = new Map(starterGarmentCatalog.map((item) => [item.id, item] as const));

export const defaultEquippedItems: Partial<Record<GarmentCategory, string>> = {
  tops: "starter-top-stripe-shirt",
  outerwear: "starter-outer-soft-bomber",
  bottoms: "starter-bottom-soft-denim",
  shoes: "starter-shoe-sneaker",
};

export const validateGarmentRuntimeBinding = (binding: GarmentRuntimeBinding) => {
  const issues: string[] = [];
  const skeletonProfile = freestyleSkeletonProfiles[binding.skeletonProfileId];
  if (!binding.modelPath.endsWith(".glb")) {
    issues.push("modelPath must point to a GLB asset.");
  }
  if (binding.skeletonProfileId.trim().length === 0) {
    issues.push("skeletonProfileId is required.");
  } else if (!skeletonProfile) {
    issues.push(`unknown skeletonProfileId: ${binding.skeletonProfileId}`);
  }
  if (binding.anchorBindings.length === 0) {
    issues.push("at least one anchor binding is required.");
  }
  if (skeletonProfile) {
    const invalidAnchors = binding.anchorBindings
      .map((entry) => entry.id)
      .filter((anchorId) => !skeletonProfile.anchors.includes(anchorId));
    if (invalidAnchors.length > 0) {
      issues.push(`invalid anchor bindings: ${invalidAnchors.join(", ")}`);
    }

    const invalidCollisionZones = binding.collisionZones.filter(
      (zone) => !skeletonProfile.collisionZones.includes(zone),
    );
    if (invalidCollisionZones.length > 0) {
      issues.push(`invalid collision zones: ${invalidCollisionZones.join(", ")}`);
    }

    const invalidBodyMaskZones = binding.bodyMaskZones.filter(
      (zone) => !skeletonProfile.bodyMaskZones.includes(zone),
    );
    if (invalidBodyMaskZones.length > 0) {
      issues.push(`invalid body mask zones: ${invalidBodyMaskZones.join(", ")}`);
    }
  }
  if (binding.surfaceClearanceCm <= 0) {
    issues.push("surfaceClearanceCm must be greater than zero.");
  }
  return issues;
};

export const validateStarterGarment = (item: StarterGarment) => {
  const issues = validateGarmentRuntimeBinding(item.runtime);
  if (!item.metadata?.fitProfile?.layer) {
    issues.push(`${item.id}: fitProfile.layer is required.`);
  }
  if (!item.metadata?.measurements) {
    issues.push(`${item.id}: measurements are required.`);
  }
  return issues;
};

export const computeGarmentEaseSummary = (
  measurements: GarmentMeasurements | undefined,
  avatarParams: AvatarNormalizedParams,
) => {
  const bustEase = (measurements?.chestCm ?? 96) - (78 + avatarParams.chestVolume * 28);
  const waistEase = (measurements?.waistCm ?? 80) - (62 + avatarParams.waistVolume * 30);
  const hipEase = (measurements?.hipCm ?? 98) - (84 + avatarParams.hipVolume * 28);

  return {
    bustEaseCm: clamp(Math.round(bustEase), -24, 36),
    waistEaseCm: clamp(Math.round(waistEase), -24, 36),
    hipEaseCm: clamp(Math.round(hipEase), -24, 36),
  };
};

export const computeGarmentRuntimeScale = (
  item: Asset | StarterGarment,
  avatarParams: AvatarNormalizedParams,
) => {
  const fit = item.metadata?.fitProfile;
  const silhouetteBias =
    fit?.silhouette === "oversized"
      ? 1.08
      : fit?.silhouette === "relaxed"
        ? 1.04
        : fit?.silhouette === "tailored"
          ? 0.98
          : 1;

  const width = 0.92 + avatarParams.shoulderWidth * 0.16 + avatarParams.chestVolume * 0.09;
  const depth = 0.94 + avatarParams.chestVolume * 0.12 + avatarParams.waistVolume * 0.04;
  const height = 0.94 + avatarParams.stature * 0.08 + avatarParams.torsoLength * 0.06;

  return {
    width: round(width * silhouetteBias),
    depth: round(depth * silhouetteBias),
    height: round(height),
  };
};

const round = (value: number) => Math.round(value * 1000) / 1000;

export type StarterClosetRepository = {
  load: () => StarterGarment[];
  save: (items: StarterGarment[]) => void;
};

export const createLocalStarterClosetRepository = (): StarterClosetRepository => ({
  load: () => readStoredJson(garmentStorageKey, starterGarmentCatalog),
  save: (items) => writeStoredJson(garmentStorageKey, items),
});

export const getCatalogByCategory = (category: GarmentCategory | "all") =>
  category === "all" ? starterGarmentCatalog : starterGarmentCatalog.filter((item) => item.category === category);

export const getEquippedGarments = (sceneState: ClosetSceneState) =>
  Object.values(sceneState.equippedItemIds)
    .map((id) => (id ? starterGarmentById.get(id) ?? null : null))
    .filter((item): item is StarterGarment => Boolean(item));

export {
  defaultSkeletonProfile,
  defaultSkeletonProfileId,
  freestyleSkeletonProfiles,
} from "./skeleton-profiles.js";

export const getSurfaceBadgeTone = (source: Asset["source"]) =>
  source === "starter" ? rgba("#1d2430", 0.1) : rgba("#d2b48c", 0.16);
