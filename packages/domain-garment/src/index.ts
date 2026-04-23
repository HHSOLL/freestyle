import {
  garmentManifestSchema,
  garmentManifestSchemaVersion,
  requiresCanonicalManifestForApprovalState,
  requiresCertificationMetadataForApprovalState,
  type GarmentManifest,
} from "@freestyle/asset-schema";
import { clamp, readStoredJson, rgba, writeStoredJson } from "@freestyle/shared-utils";
import {
  fitMapSummarySchema,
  garmentFitAssessmentSchema,
  type GarmentCollisionProxy,
  type FitMapArtifactData,
  type FitMapSummary,
  garmentInstantFitReportSchema,
  garmentInstantFitSchemaVersion,
  type GarmentHQArtifactSpec,
  type GarmentMaterialProfile,
  type GarmentSimProxy,
} from "@freestyle/contracts";
import type {
  GarmentCertificationReportItem,
  GarmentFitOverall,
  GarmentFitRegionId,
  GarmentInstantFitReport,
  GarmentPatternSpec,
} from "@freestyle/contracts";
import type {
  Asset,
  AvatarPoseId,
  BodyProfile,
  AvatarRenderVariantId,
  AvatarNormalizedParams,
  ClosetSceneState,
  GarmentCategory,
  GarmentCollisionZone,
  GarmentAnchorBinding,
  GarmentCorrectiveProfile,
  GarmentFitAssessment,
  GarmentFitDimensionAssessment,
  GarmentFitState,
  GarmentMeasurementKey,
  GarmentMeasurementMode,
  GarmentMeasurementModeMap,
  GarmentMeasurements,
  GarmentPhysicalProfile,
  GarmentPoseRuntimeTuningEntry,
  GarmentRuntimeBinding,
  GarmentSizeSpec,
  PublishedGarmentAsset,
  RuntimeGarmentAsset,
  StarterGarment,
  QualityTier,
  GarmentRuntimeLodPaths,
} from "@freestyle/shared-types";
import { flattenBodyProfile } from "@freestyle/shared-types";
import {
  defaultSkeletonProfileId,
  freestyleSkeletonProfiles,
} from "./skeleton-profiles.js";

export const garmentStorageKey = "freestyle:starter-closet:v1";
export const publishedGarmentStorageKey = "freestyle:published-garments:v1";

const svgLabel = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildGarmentRuntimeLodPath = (modelPath: string, suffix: "lod1" | "lod2") =>
  modelPath.replace(/\.glb$/u, `.${suffix}.glb`);

const buildGarmentRuntimeLodPaths = (modelPath: string): GarmentRuntimeLodPaths => ({
  lod1: buildGarmentRuntimeLodPath(modelPath, "lod1"),
  lod2: buildGarmentRuntimeLodPath(modelPath, "lod2"),
});

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
  config: {
    modelPath: string;
    modelPathByVariant?: Partial<Record<AvatarRenderVariantId, string>>;
    deriveSiblingLods?: boolean;
    lodModelPaths?: GarmentRuntimeLodPaths;
    lodModelPathsByVariant?: Partial<Record<AvatarRenderVariantId, GarmentRuntimeLodPaths>>;
    collisionZones: GarmentCollisionZone[];
    bodyMaskZones: GarmentCollisionZone[];
    anchorBindings?: GarmentAnchorBinding[];
    poseTuning?: GarmentRuntimeBinding["poseTuning"];
    secondaryMotion?: GarmentRuntimeBinding["secondaryMotion"];
    surfaceClearanceCm?: number;
    renderPriority: number;
  },
): GarmentRuntimeBinding => ({
  modelPath: config.modelPath,
  modelPathByVariant: config.modelPathByVariant,
  lodModelPaths: config.deriveSiblingLods ? buildGarmentRuntimeLodPaths(config.modelPath) : config.lodModelPaths,
  lodModelPathsByVariant: config.deriveSiblingLods
    ? Object.fromEntries(
        Object.entries(config.modelPathByVariant ?? {}).map(([variantId, modelPath]) => [
          variantId,
          buildGarmentRuntimeLodPaths(modelPath),
        ]),
      )
    : config.lodModelPathsByVariant,
  skeletonProfileId: defaultSkeletonProfileId,
  anchorBindings:
    config.anchorBindings ?? [
      { id: "leftShoulder", weight: 0.25 },
      { id: "rightShoulder", weight: 0.25 },
      { id: "chestCenter", weight: 0.2 },
      { id: "waistCenter", weight: 0.15 },
      { id: "hipCenter", weight: 0.15 },
    ],
  collisionZones: config.collisionZones,
  bodyMaskZones: config.bodyMaskZones,
  poseTuning: config.poseTuning,
  secondaryMotion: config.secondaryMotion,
  surfaceClearanceCm:
    config.surfaceClearanceCm ??
    (config.renderPriority === 3 ? 2.2 : config.renderPriority === 2 ? 1.6 : 1.1),
  renderPriority: config.renderPriority,
});

const correctiveFit = (profile: GarmentCorrectiveProfile) => profile;
const poseTuning = (profile: GarmentRuntimeBinding["poseTuning"]) => profile;
const secondaryMotion = (profile: NonNullable<GarmentRuntimeBinding["secondaryMotion"]>) => profile;

const sizeSpec = (
  label: string,
  measurements: GarmentMeasurements,
  measurementModes: GarmentMeasurementModeMap,
  notes?: string,
): GarmentSizeSpec => ({
  label,
  measurements,
  measurementModes,
  source: "product-detail",
  notes,
});

const normalizeMeasurementForComparison = (
  value: number,
  mode: GarmentMeasurementMode | undefined,
) => (mode === "flat-half-circumference" ? value * 2 : value);

export const collectGarmentRuntimeModelPaths = (binding: GarmentRuntimeBinding) => {
  const paths = new Set<string>();
  if (binding.modelPath) {
    paths.add(binding.modelPath);
  }
  Object.values(binding.lodModelPaths ?? {}).forEach((value) => {
    if (value) {
      paths.add(value);
    }
  });
  Object.values(binding.modelPathByVariant ?? {}).forEach((value) => {
    if (value) {
      paths.add(value);
    }
  });
  Object.values(binding.lodModelPathsByVariant ?? {}).forEach((value) => {
    Object.values(value ?? {}).forEach((lodPath) => {
      if (lodPath) {
        paths.add(lodPath);
      }
    });
  });
  return Array.from(paths);
};

export const resolveGarmentRuntimeModelPath = (
  binding: GarmentRuntimeBinding,
  avatarVariantId: AvatarRenderVariantId,
  qualityTier: QualityTier = "high",
) => {
  const baseModelPath = binding.modelPathByVariant?.[avatarVariantId] ?? binding.modelPath;
  const lodPaths = binding.lodModelPathsByVariant?.[avatarVariantId] ?? binding.lodModelPaths;

  if (qualityTier === "low") {
    return lodPaths?.lod2 ?? lodPaths?.lod1 ?? baseModelPath;
  }

  if (qualityTier === "balanced") {
    return lodPaths?.lod1 ?? baseModelPath;
  }

  return baseModelPath;
};

export const getGarmentPoseRuntimeTuning = (
  binding: Pick<GarmentRuntimeBinding, "poseTuning">,
  poseId: AvatarPoseId,
): Required<Pick<GarmentPoseRuntimeTuningEntry, "widthScale" | "depthScale" | "heightScale" | "clearanceMultiplier" | "offsetY">> & {
  extraBodyMaskZones: GarmentCollisionZone[];
} => {
  const entry = binding.poseTuning?.[poseId];
  return {
    widthScale: entry?.widthScale ?? 1,
    depthScale: entry?.depthScale ?? 1,
    heightScale: entry?.heightScale ?? 1,
    clearanceMultiplier: entry?.clearanceMultiplier ?? 1,
    offsetY: entry?.offsetY ?? 0,
    extraBodyMaskZones: entry?.extraBodyMaskZones ?? [],
  };
};

export const getGarmentEffectiveBodyMaskZones = (
  binding: Pick<GarmentRuntimeBinding, "bodyMaskZones" | "poseTuning">,
  poseId: AvatarPoseId,
  adaptiveZones: readonly GarmentCollisionZone[] = [],
) =>
  Array.from(
    new Set([
      ...binding.bodyMaskZones,
      ...getGarmentPoseRuntimeTuning(binding, poseId).extraBodyMaskZones,
      ...adaptiveZones,
    ]),
  );

export const deriveAdaptiveBodyMaskZonesFromAssessment = (
  category: GarmentCategory,
  assessment: Pick<GarmentFitAssessment, "limitingKeys">,
) => {
  const zones = new Set<GarmentCollisionZone>();

  assessment.limitingKeys.forEach((key) => {
    switch (key) {
      case "chestCm":
      case "waistCm":
        zones.add("torso");
        if (category === "tops" || category === "outerwear") {
          zones.add("hips");
        }
        break;
      case "shoulderCm":
      case "sleeveLengthCm":
        zones.add("arms");
        if (category === "tops" || category === "outerwear") {
          zones.add("torso");
        }
        break;
      case "hipCm":
      case "riseCm":
        zones.add("hips");
        if (category === "outerwear") {
          zones.add("torso");
        }
        break;
      case "inseamCm":
        zones.add(category === "shoes" ? "feet" : "legs");
        break;
      case "hemCm":
        zones.add(category === "shoes" ? "feet" : "legs");
        if (category === "bottoms") {
          zones.add("hips");
        }
        break;
      case "lengthCm":
        if (category === "shoes") {
          zones.add("feet");
        } else if (category === "bottoms") {
          zones.add("legs");
        } else if (category === "tops" || category === "outerwear") {
          zones.add("torso");
        }
        break;
      default:
        break;
    }
  });

  return Array.from(zones);
};

export const getGarmentAdaptiveBodyMaskZones = (
  garment: Pick<Asset | StarterGarment, "category" | "metadata">,
  profile: BodyProfile,
) => {
  const assessment = assessGarmentPhysicalFit(garment, profile);
  if (!assessment) {
    return [] as GarmentCollisionZone[];
  }
  return deriveAdaptiveBodyMaskZonesFromAssessment(garment.category, assessment);
};

export const starterGarmentCatalog: StarterGarment[] = [
  {
    id: "starter-top-soft-casual",
    name: "Soft Tucked Tee",
    imageSrc: createSwatchThumbnail("Soft Casual", "#d7d1c8"),
    category: "tops",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#eef0f4",
      measurements: { chestCm: 117, waistCm: 112, shoulderCm: 52.5, sleeveLengthCm: 21, lengthCm: 65.5 },
      measurementModes: {
        chestCm: "body-circumference",
        waistCm: "body-circumference",
        shoulderCm: "linear-length",
        sleeveLengthCm: "linear-length",
        lengthCm: "linear-length",
      },
      sizeChart: [
        {
          label: "M",
          measurements: { shoulderCm: 50.5, chestCm: 56, sleeveLengthCm: 20, lengthCm: 63.5 },
          measurementModes: {
            shoulderCm: "linear-length",
            chestCm: "flat-half-circumference",
            sleeveLengthCm: "linear-length",
            lengthCm: "linear-length",
          },
          source: "product-detail",
          notes: "Reference tee size chart: shoulder width / chest flat width / sleeve / total length.",
        },
        {
          label: "L",
          measurements: { shoulderCm: 52.5, chestCm: 58.5, sleeveLengthCm: 21, lengthCm: 65.5 },
          measurementModes: {
            shoulderCm: "linear-length",
            chestCm: "flat-half-circumference",
            sleeveLengthCm: "linear-length",
            lengthCm: "linear-length",
          },
          source: "product-detail",
        },
        {
          label: "XL",
          measurements: { shoulderCm: 54.5, chestCm: 61, sleeveLengthCm: 22, lengthCm: 67.5 },
          measurementModes: {
            shoulderCm: "linear-length",
            chestCm: "flat-half-circumference",
            sleeveLengthCm: "linear-length",
            lengthCm: "linear-length",
          },
          source: "product-detail",
        },
      ],
      selectedSizeLabel: "L",
      physicalProfile: {
        materialStretchRatio: 0.1,
        maxComfortStretchRatio: 0.06,
        compressionToleranceCm: { chestCm: 1.5, waistCm: 1.2, shoulderCm: 0.8 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.992, depthScale: 0.988, clearanceBiasCm: -0.18 },
        snug: { widthScale: 0.998, depthScale: 0.996, clearanceBiasCm: -0.08 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.012, depthScale: 1.008, clearanceBiasCm: 0.12 },
        oversized: { widthScale: 1.02, depthScale: 1.012, clearanceBiasCm: 0.24 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "soft", stretch: 0.24, drape: 0.42 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/top_soft_casual_v4.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/top_soft_casual_v4.glb",
        "male-base": "/assets/garments/mpfb/male/top_soft_casual_v4.glb",
      },
      deriveSiblingLods: true,
      collisionZones: ["torso", "arms", "hips"],
      bodyMaskZones: ["torso"],
      poseTuning: poseTuning({
        stride: {
          clearanceMultiplier: 1.02,
          widthScale: 1.004,
          heightScale: 1.004,
          extraBodyMaskZones: ["hips"],
        },
        tailored: {
          clearanceMultiplier: 1.028,
          widthScale: 1.006,
          depthScale: 1.004,
          extraBodyMaskZones: ["arms"],
        },
      }),
      renderPriority: 1,
    }),
    palette: ["#eef0f4", "#dfe4eb", "#8d95a3"],
  },
  {
    id: "starter-bottom-soft-wool",
    name: "Soft Wool Trousers",
    imageSrc: createSwatchThumbnail("Soft Wool", "#3a4048"),
    category: "bottoms",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#3a4048",
      measurements: { waistCm: 95, hipCm: 124, inseamCm: 87, riseCm: 38, hemCm: 59, lengthCm: 112 },
      measurementModes: {
        waistCm: "body-circumference",
        hipCm: "body-circumference",
        inseamCm: "linear-length",
        hemCm: "body-circumference",
        lengthCm: "linear-length",
        riseCm: "linear-length",
      },
      sizeChart: [
        sizeSpec(
          "M",
          { waistCm: 39.5, hipCm: 52, riseCm: 33, inseamCm: 76, lengthCm: 100, hemCm: 26 },
          {
            waistCm: "flat-half-circumference",
            hipCm: "flat-half-circumference",
            riseCm: "linear-length",
            inseamCm: "linear-length",
            lengthCm: "linear-length",
            hemCm: "flat-half-circumference",
          },
          "Reference trouser size chart: waist/hip/hem flat width with rise, inseam, and out length.",
        ),
        sizeSpec("L", { waistCm: 47.5, hipCm: 62, riseCm: 38, inseamCm: 87, lengthCm: 112, hemCm: 29.5 }, {
          waistCm: "flat-half-circumference",
          hipCm: "flat-half-circumference",
          riseCm: "linear-length",
          inseamCm: "linear-length",
          lengthCm: "linear-length",
          hemCm: "flat-half-circumference",
        }),
        sizeSpec("XL", { waistCm: 49, hipCm: 64, riseCm: 39, inseamCm: 88, lengthCm: 114, hemCm: 30.5 }, {
          waistCm: "flat-half-circumference",
          hipCm: "flat-half-circumference",
          riseCm: "linear-length",
          inseamCm: "linear-length",
          lengthCm: "linear-length",
          hemCm: "flat-half-circumference",
        }),
      ],
      selectedSizeLabel: "L",
      physicalProfile: {
        materialStretchRatio: 0.04,
        maxComfortStretchRatio: 0.02,
        compressionToleranceCm: { waistCm: 1.2, hipCm: 1.5, inseamCm: 0.6 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.99, depthScale: 0.99, heightScale: 0.998, clearanceBiasCm: -0.14 },
        snug: { widthScale: 0.996, depthScale: 0.996, clearanceBiasCm: -0.06 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.014, depthScale: 1.01, clearanceBiasCm: 0.12 },
        oversized: { widthScale: 1.026, depthScale: 1.018, clearanceBiasCm: 0.22 },
      }),
      fitProfile: { layer: "base", silhouette: "relaxed", structure: "balanced", stretch: 0.08, drape: 0.28 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/bottom_soft_wool_v1.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/bottom_soft_wool_v1.glb",
        "male-base": "/assets/garments/mpfb/male/bottom_soft_wool_v1.glb",
      },
      deriveSiblingLods: true,
      anchorBindings: [
        { id: "waistCenter", weight: 0.34 },
        { id: "hipCenter", weight: 0.34 },
        { id: "leftKnee", weight: 0.16 },
        { id: "rightKnee", weight: 0.16 },
      ],
      collisionZones: ["hips", "legs"],
      bodyMaskZones: ["hips", "legs"],
      poseTuning: poseTuning({
        stride: {
          clearanceMultiplier: 1.032,
          depthScale: 1.012,
          heightScale: 1.006,
          offsetY: 0.004,
          extraBodyMaskZones: ["hips", "legs"],
        },
        contrapposto: {
          clearanceMultiplier: 1.014,
          widthScale: 1.004,
          extraBodyMaskZones: ["hips"],
        },
      }),
      renderPriority: 1,
    }),
    palette: ["#3a4048", "#20242a", "#727a88"],
  },
  {
    id: "starter-top-city-relaxed",
    name: "City Relaxed Outfit",
    imageSrc: createSwatchThumbnail("City Relaxed", "#c8ccd3"),
    category: "tops",
    brand: "MPFB Starter",
    source: "starter",
    metadata: {
      dominantColor: "#c8ccd3",
      measurements: { chestCm: 134, waistCm: 130, shoulderCm: 56, sleeveLengthCm: 62, lengthCm: 89 },
      measurementModes: {
        chestCm: "body-circumference",
        waistCm: "body-circumference",
        shoulderCm: "linear-length",
        sleeveLengthCm: "linear-length",
        lengthCm: "linear-length",
      },
      sizeChart: [
        sizeSpec(
          "M",
          { shoulderCm: 50.5, chestCm: 60, waistCm: 58, sleeveLengthCm: 56, lengthCm: 82 },
          {
            shoulderCm: "linear-length",
            chestCm: "flat-half-circumference",
            waistCm: "flat-half-circumference",
            sleeveLengthCm: "linear-length",
            lengthCm: "linear-length",
          },
          "Relaxed city top chart: shoulder/chest flat width, sleeve, and body length.",
        ),
        sizeSpec("L", { shoulderCm: 56, chestCm: 67, waistCm: 65, sleeveLengthCm: 62, lengthCm: 89 }, {
          shoulderCm: "linear-length",
          chestCm: "flat-half-circumference",
          waistCm: "flat-half-circumference",
          sleeveLengthCm: "linear-length",
          lengthCm: "linear-length",
        }),
        sizeSpec("XL", { shoulderCm: 57.5, chestCm: 69.5, waistCm: 67.5, sleeveLengthCm: 63.5, lengthCm: 90.5 }, {
          shoulderCm: "linear-length",
          chestCm: "flat-half-circumference",
          waistCm: "flat-half-circumference",
          sleeveLengthCm: "linear-length",
          lengthCm: "linear-length",
        }),
      ],
      selectedSizeLabel: "L",
      physicalProfile: {
        materialStretchRatio: 0.08,
        maxComfortStretchRatio: 0.05,
        compressionToleranceCm: { chestCm: 2.2, waistCm: 1.7, shoulderCm: 1.1 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.996, depthScale: 0.994, clearanceBiasCm: -0.02, offsetY: 0.002 },
        snug: { widthScale: 1.004, depthScale: 1.002, clearanceBiasCm: 0.06, offsetY: 0.002 },
        regular: { widthScale: 1.012, depthScale: 1.008, clearanceBiasCm: 0.14, offsetY: 0.004 },
        relaxed: { widthScale: 1.026, depthScale: 1.018, clearanceBiasCm: 0.26, offsetY: 0.006 },
        oversized: { widthScale: 1.04, depthScale: 1.026, clearanceBiasCm: 0.38, offsetY: 0.008 },
      }),
      fitProfile: { layer: "mid", silhouette: "relaxed", structure: "balanced", stretch: 0.18, drape: 0.44 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/top_city_relaxed.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/top_city_relaxed.glb",
        "male-base": "/assets/garments/mpfb/male/top_city_relaxed.glb",
      },
      collisionZones: ["torso", "arms", "hips", "legs"],
      bodyMaskZones: ["torso", "arms"],
      poseTuning: poseTuning({
        stride: {
          clearanceMultiplier: 1.048,
          widthScale: 1.014,
          depthScale: 1.014,
          heightScale: 1.01,
          offsetY: 0.004,
          extraBodyMaskZones: ["hips"],
        },
        tailored: {
          clearanceMultiplier: 1.058,
          widthScale: 1.02,
          depthScale: 1.018,
          heightScale: 1.008,
          offsetY: 0.006,
          extraBodyMaskZones: ["arms", "hips"],
        },
      }),
      secondaryMotion: secondaryMotion({
        profileId: "garment-soft",
        stiffness: 7.8,
        damping: 0.86,
        influence: 0.9,
        maxYawDeg: 2.4,
        maxPitchDeg: 2,
        maxRollDeg: 1.4,
        idleAmplitudeDeg: 0.5,
        idleFrequencyHz: 0.82,
        verticalBobCm: 0.28,
        lateralSwingCm: 0.22,
      }),
      renderPriority: 2,
      surfaceClearanceCm: 2.05,
    }),
    palette: ["#c8ccd3", "#81858e", "#f1f2f4"],
  },
  {
    id: "starter-outer-tailored-layer",
    name: "Tailored Layered Look",
    imageSrc: createSwatchThumbnail("Tailored Layer", "#6c6867"),
    category: "outerwear",
    brand: "MPFB Starter",
    source: "starter",
    metadata: {
      dominantColor: "#6c6867",
      measurements: { chestCm: 128, waistCm: 118, shoulderCm: 51, sleeveLengthCm: 65, lengthCm: 95 },
      measurementModes: {
        chestCm: "body-circumference",
        waistCm: "body-circumference",
        shoulderCm: "linear-length",
        sleeveLengthCm: "linear-length",
        lengthCm: "linear-length",
      },
      sizeChart: [
        sizeSpec(
          "M",
          { shoulderCm: 46, chestCm: 56, waistCm: 52, sleeveLengthCm: 60, lengthCm: 88 },
          {
            shoulderCm: "linear-length",
            chestCm: "flat-half-circumference",
            waistCm: "flat-half-circumference",
            sleeveLengthCm: "linear-length",
            lengthCm: "linear-length",
          },
          "Tailored outer layer chart: shoulder/chest/waist flat width plus sleeve and length.",
        ),
        sizeSpec("L", { shoulderCm: 51, chestCm: 64, waistCm: 59, sleeveLengthCm: 65, lengthCm: 95 }, {
          shoulderCm: "linear-length",
          chestCm: "flat-half-circumference",
          waistCm: "flat-half-circumference",
          sleeveLengthCm: "linear-length",
          lengthCm: "linear-length",
        }),
        sizeSpec("XL", { shoulderCm: 52.5, chestCm: 66, waistCm: 61, sleeveLengthCm: 66, lengthCm: 96.5 }, {
          shoulderCm: "linear-length",
          chestCm: "flat-half-circumference",
          waistCm: "flat-half-circumference",
          sleeveLengthCm: "linear-length",
          lengthCm: "linear-length",
        }),
      ],
      selectedSizeLabel: "L",
      physicalProfile: {
        materialStretchRatio: 0.03,
        maxComfortStretchRatio: 0.015,
        compressionToleranceCm: { chestCm: 2.8, waistCm: 2.2, shoulderCm: 1.2 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.996, clearanceBiasCm: 0.02, offsetY: 0.004 },
        snug: { widthScale: 1.006, depthScale: 1.004, clearanceBiasCm: 0.14, offsetY: 0.006 },
        regular: { widthScale: 1.016, depthScale: 1.012, clearanceBiasCm: 0.28, offsetY: 0.008 },
        relaxed: { widthScale: 1.032, depthScale: 1.022, clearanceBiasCm: 0.42, offsetY: 0.01 },
        oversized: { widthScale: 1.046, depthScale: 1.032, clearanceBiasCm: 0.58, offsetY: 0.012 },
      }),
      fitProfile: { layer: "outer", silhouette: "tailored", structure: "structured", stretch: 0.08, drape: 0.24 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/outer_tailored_layer.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/outer_tailored_layer.glb",
        "male-base": "/assets/garments/mpfb/male/outer_tailored_layer.glb",
      },
      collisionZones: ["torso", "arms", "hips", "legs"],
      bodyMaskZones: ["torso", "arms", "hips"],
      poseTuning: poseTuning({
        stride: {
          clearanceMultiplier: 1.095,
          widthScale: 1.026,
          depthScale: 1.022,
          heightScale: 1.014,
          offsetY: 0.012,
          extraBodyMaskZones: ["legs"],
        },
        tailored: {
          clearanceMultiplier: 1.078,
          widthScale: 1.02,
          depthScale: 1.02,
          heightScale: 1.008,
          offsetY: 0.01,
          extraBodyMaskZones: ["legs"],
        },
        contrapposto: {
          clearanceMultiplier: 1.04,
          widthScale: 1.012,
          depthScale: 1.014,
          offsetY: 0.006,
          extraBodyMaskZones: ["hips"],
        },
      }),
      secondaryMotion: secondaryMotion({
        profileId: "garment-loose",
        stiffness: 6.2,
        damping: 0.83,
        influence: 1.16,
        maxYawDeg: 4.2,
        maxPitchDeg: 3.4,
        maxRollDeg: 2.6,
        idleAmplitudeDeg: 0.92,
        idleFrequencyHz: 0.74,
        verticalBobCm: 0.48,
        lateralSwingCm: 0.44,
      }),
      renderPriority: 3,
      surfaceClearanceCm: 2.45,
    }),
    palette: ["#6c6867", "#2a2e34", "#cbc4bd"],
  },
  {
    id: "starter-shoe-sneaker",
    name: "Soft Sneaker",
    imageSrc: createSwatchThumbnail("Sneaker", "#f0efe9"),
    category: "shoes",
    brand: "MPFB Starter",
    source: "starter",
    metadata: {
      dominantColor: "#f0efe9",
      measurements: { lengthCm: 29, hemCm: 12 },
      measurementModes: {
        lengthCm: "linear-length",
        hemCm: "linear-length",
      },
      sizeChart: [
        sizeSpec(
          "260",
          { lengthCm: 26.4, hemCm: 9.8 },
          { lengthCm: "linear-length", hemCm: "linear-length" },
          "Reference footwear chart in cm-based last length and opening width.",
        ),
        sizeSpec("270", { lengthCm: 27.4, hemCm: 10.6 }, { lengthCm: "linear-length", hemCm: "linear-length" }),
        sizeSpec("280", { lengthCm: 28.4, hemCm: 11.4 }, { lengthCm: "linear-length", hemCm: "linear-length" }),
      ],
      selectedSizeLabel: "270",
      physicalProfile: {
        materialStretchRatio: 0.01,
        maxComfortStretchRatio: 0.005,
        compressionToleranceCm: { lengthCm: 0.2, hemCm: 0.25 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.996, depthScale: 0.996, clearanceBiasCm: -0.08, offsetY: -0.002 },
        snug: { widthScale: 0.999, depthScale: 0.999, clearanceBiasCm: -0.02 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.006, depthScale: 1.004, clearanceBiasCm: 0.04 },
        oversized: { widthScale: 1.012, depthScale: 1.008, clearanceBiasCm: 0.08 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "balanced", stretch: 0.02, drape: 0.02 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/shoes_soft_sneaker.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/shoes_soft_sneaker.glb",
        "male-base": "/assets/garments/mpfb/male/shoes_soft_sneaker.glb",
      },
      deriveSiblingLods: true,
      anchorBindings: [
        { id: "leftAnkle", weight: 0.25 },
        { id: "rightAnkle", weight: 0.25 },
        { id: "leftFoot", weight: 0.25 },
        { id: "rightFoot", weight: 0.25 },
      ],
      collisionZones: ["feet"],
      bodyMaskZones: ["feet"],
      poseTuning: poseTuning({
        stride: {
          clearanceMultiplier: 1.018,
          depthScale: 1.006,
        },
      }),
      renderPriority: 1,
    }),
    palette: ["#f0efe9", "#a8afb6", "#121821"],
  },
  {
    id: "starter-shoe-soft-day",
    name: "Soft Day Shoe",
    imageSrc: createSwatchThumbnail("Day Shoe", "#20242a"),
    category: "shoes",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#20242a",
      measurements: { lengthCm: 27, hemCm: 10 },
      measurementModes: {
        lengthCm: "linear-length",
        hemCm: "linear-length",
      },
      sizeChart: [
        sizeSpec(
          "245",
          { lengthCm: 24.6, hemCm: 8.8 },
          { lengthCm: "linear-length", hemCm: "linear-length" },
          "Reference flat shoe chart in cm-based length and opening width.",
        ),
        sizeSpec("250", { lengthCm: 25.1, hemCm: 9.2 }, { lengthCm: "linear-length", hemCm: "linear-length" }),
        sizeSpec("255", { lengthCm: 25.6, hemCm: 9.6 }, { lengthCm: "linear-length", hemCm: "linear-length" }),
      ],
      selectedSizeLabel: "255",
      physicalProfile: {
        materialStretchRatio: 0.006,
        maxComfortStretchRatio: 0.003,
        compressionToleranceCm: { lengthCm: 0.15, hemCm: 0.2 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.996, depthScale: 0.996, clearanceBiasCm: -0.06, offsetY: -0.002 },
        snug: { widthScale: 0.999, depthScale: 0.999, clearanceBiasCm: -0.02 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.005, depthScale: 1.004, clearanceBiasCm: 0.03 },
        oversized: { widthScale: 1.01, depthScale: 1.008, clearanceBiasCm: 0.06 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "soft", stretch: 0.01, drape: 0.01 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/shoes_soft_flat_v1.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/shoes_soft_flat_v1.glb",
        "male-base": "/assets/garments/mpfb/male/shoes_soft_sneaker.glb",
      },
      deriveSiblingLods: true,
      anchorBindings: [
        { id: "leftAnkle", weight: 0.25 },
        { id: "rightAnkle", weight: 0.25 },
        { id: "leftFoot", weight: 0.25 },
        { id: "rightFoot", weight: 0.25 },
      ],
      collisionZones: ["feet"],
      bodyMaskZones: ["feet"],
      poseTuning: poseTuning({
        stride: {
          clearanceMultiplier: 1.016,
          depthScale: 1.004,
        },
      }),
      renderPriority: 1,
    }),
    palette: ["#20242a", "#454d58", "#d2d6dd"],
  },
  {
    id: "starter-shoe-night-runner",
    name: "Night Runner",
    imageSrc: createSwatchThumbnail("Night Runner", "#9ea6b2"),
    category: "shoes",
    brand: "MPFB Starter",
    source: "starter",
    metadata: {
      dominantColor: "#9ea6b2",
      measurements: { lengthCm: 29, hemCm: 12 },
      measurementModes: {
        lengthCm: "linear-length",
        hemCm: "linear-length",
      },
      sizeChart: [
        sizeSpec(
          "265",
          { lengthCm: 26.6, hemCm: 10.2 },
          { lengthCm: "linear-length", hemCm: "linear-length" },
          "Reference runner chart in cm-based length and instep opening width.",
        ),
        sizeSpec("275", { lengthCm: 27.6, hemCm: 10.9 }, { lengthCm: "linear-length", hemCm: "linear-length" }),
        sizeSpec("285", { lengthCm: 28.6, hemCm: 11.6 }, { lengthCm: "linear-length", hemCm: "linear-length" }),
      ],
      selectedSizeLabel: "275",
      physicalProfile: {
        materialStretchRatio: 0.018,
        maxComfortStretchRatio: 0.01,
        compressionToleranceCm: { lengthCm: 0.25, hemCm: 0.3 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.997, depthScale: 0.996, clearanceBiasCm: -0.05, offsetY: -0.001 },
        snug: { widthScale: 1, depthScale: 0.999, clearanceBiasCm: 0 },
        regular: { widthScale: 1.002, depthScale: 1.001, heightScale: 1 },
        relaxed: { widthScale: 1.008, depthScale: 1.006, clearanceBiasCm: 0.04 },
        oversized: { widthScale: 1.014, depthScale: 1.012, clearanceBiasCm: 0.08 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "balanced", stretch: 0.02, drape: 0.01 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/shoes_night_runner.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/shoes_night_runner.glb",
        "male-base": "/assets/garments/mpfb/male/shoes_night_runner.glb",
      },
      anchorBindings: [
        { id: "leftAnkle", weight: 0.25 },
        { id: "rightAnkle", weight: 0.25 },
        { id: "leftFoot", weight: 0.25 },
        { id: "rightFoot", weight: 0.25 },
      ],
      collisionZones: ["feet"],
      bodyMaskZones: ["feet"],
      poseTuning: poseTuning({
        stride: {
          clearanceMultiplier: 1.024,
          widthScale: 1.004,
          depthScale: 1.008,
        },
      }),
      renderPriority: 1,
    }),
    palette: ["#9ea6b2", "#505764", "#e3e7ed"],
  },
  {
    id: "starter-accessory-city-bucket-hat",
    name: "City Bucket Hat",
    imageSrc: createSwatchThumbnail("Bucket Hat", "#b8b4ae"),
    category: "accessories",
    brand: "Freestyle Blockout",
    source: "starter",
    metadata: {
      dominantColor: "#b8b4ae",
      measurements: { headCircumferenceCm: 57.5 },
      measurementModes: {
        headCircumferenceCm: "body-circumference",
      },
      sizeChart: [
        sizeSpec(
          "M",
          { headCircumferenceCm: 56.5 },
          { headCircumferenceCm: "body-circumference" },
          "Reference hat chart in head circumference centimeters.",
        ),
        sizeSpec("L", { headCircumferenceCm: 58 }, { headCircumferenceCm: "body-circumference" }),
        sizeSpec("XL", { headCircumferenceCm: 59.5 }, { headCircumferenceCm: "body-circumference" }),
      ],
      selectedSizeLabel: "L",
      physicalProfile: {
        materialStretchRatio: 0.02,
        maxComfortStretchRatio: 0.01,
        compressionToleranceCm: { headCircumferenceCm: 0.4 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.998, heightScale: 0.998, clearanceBiasCm: -0.03, offsetY: -0.002 },
        snug: { widthScale: 1, depthScale: 1, heightScale: 1, clearanceBiasCm: -0.01 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.004, heightScale: 1.002, clearanceBiasCm: 0.03, offsetY: 0.002 },
        oversized: { widthScale: 1.01, depthScale: 1.01, heightScale: 1.004, clearanceBiasCm: 0.06, offsetY: 0.004 },
      }),
      fitProfile: { layer: "outer", silhouette: "regular", structure: "structured", stretch: 0.02, drape: 0.02 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/accessory_city_bucket_hat.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/accessory_city_bucket_hat.glb",
        "male-base": "/assets/garments/mpfb/male/accessory_city_bucket_hat.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.5 },
        { id: "foreheadCenter", weight: 0.3 },
        { id: "leftTemple", weight: 0.1 },
        { id: "rightTemple", weight: 0.1 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      surfaceClearanceCm: 0.45,
      renderPriority: 4,
    }),
    palette: ["#b8b4ae", "#8d8984", "#f1eeea"],
  },
  {
    id: "starter-accessory-oval-shades",
    name: "Oval Shade Sunglasses",
    imageSrc: createSwatchThumbnail("Oval Shades", "#1f242b"),
    category: "accessories",
    brand: "Freestyle Blockout",
    source: "starter",
    metadata: {
      dominantColor: "#1f242b",
      measurements: { frameWidthCm: 14.3 },
      measurementModes: {
        frameWidthCm: "linear-length",
      },
      sizeChart: [
        sizeSpec(
          "One",
          { frameWidthCm: 14.3 },
          { frameWidthCm: "linear-length" },
          "Reference sunglasses width measured across the frame front.",
        ),
      ],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.002,
        maxComfortStretchRatio: 0.001,
        compressionToleranceCm: { frameWidthCm: 0.15 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.999, depthScale: 0.999, clearanceBiasCm: -0.015, offsetY: -0.001 },
        snug: { widthScale: 1, depthScale: 1, clearanceBiasCm: -0.005 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.003, depthScale: 1.002, clearanceBiasCm: 0.015, offsetY: 0.001 },
        oversized: { widthScale: 1.006, depthScale: 1.004, clearanceBiasCm: 0.03, offsetY: 0.002 },
      }),
      fitProfile: { layer: "outer", silhouette: "regular", structure: "structured", stretch: 0.004, drape: 0 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/accessory_oval_shades.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/accessory_oval_shades.glb",
        "male-base": "/assets/garments/mpfb/male/accessory_oval_shades.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.4 },
        { id: "leftTemple", weight: 0.3 },
        { id: "rightTemple", weight: 0.3 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      surfaceClearanceCm: 0.18,
      renderPriority: 5,
    }),
    palette: ["#1f242b", "#454f5c", "#9098a5"],
  },
  {
    id: "starter-hair-signature-ponytail",
    name: "Signature Ponytail",
    imageSrc: createSwatchThumbnail("Ponytail", "#5a4436"),
    category: "hair",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#4b382f",
      measurements: { headCircumferenceCm: 57 },
      measurementModes: { headCircumferenceCm: "body-circumference" },
      sizeChart: [
        sizeSpec("One", { headCircumferenceCm: 57 }, { headCircumferenceCm: "body-circumference" }, "Hair base fitted against the MPFB head circumference."),
      ],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.01,
        maxComfortStretchRatio: 0.006,
        compressionToleranceCm: { headCircumferenceCm: 0.35 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.998, heightScale: 0.998, clearanceBiasCm: -0.02, offsetY: -0.001 },
        snug: { widthScale: 1, depthScale: 1, heightScale: 1, clearanceBiasCm: -0.008 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.003, heightScale: 1.002, clearanceBiasCm: 0.02, offsetY: 0.001 },
        oversized: { widthScale: 1.008, depthScale: 1.006, heightScale: 1.003, clearanceBiasCm: 0.04, offsetY: 0.002 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "soft", stretch: 0.02, drape: 0.08 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/hair_signature_ponytail.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/hair_signature_ponytail.glb",
        "male-base": "/assets/garments/mpfb/male/hair_signature_ponytail.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.46 },
        { id: "foreheadCenter", weight: 0.28 },
        { id: "leftTemple", weight: 0.13 },
        { id: "rightTemple", weight: 0.13 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: secondaryMotion({
        profileId: "hair-long",
        stiffness: 5.6,
        damping: 0.82,
        influence: 1.28,
        maxYawDeg: 8.4,
        maxPitchDeg: 7.2,
        maxRollDeg: 5.4,
        idleAmplitudeDeg: 1.35,
        idleFrequencyHz: 0.88,
        verticalBobCm: 0.34,
        lateralSwingCm: 0.82,
      }),
      surfaceClearanceCm: 0.12,
      renderPriority: 2,
    }),
    palette: ["#4b382f", "#705345", "#a8846f"],
  },
  {
    id: "starter-hair-soft-bob",
    name: "Soft Bob",
    imageSrc: createSwatchThumbnail("Soft Bob", "#4f3c33"),
    category: "hair",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#4f3c33",
      measurements: { headCircumferenceCm: 56.8 },
      measurementModes: { headCircumferenceCm: "body-circumference" },
      sizeChart: [sizeSpec("One", { headCircumferenceCm: 56.8 }, { headCircumferenceCm: "body-circumference" })],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.012,
        maxComfortStretchRatio: 0.007,
        compressionToleranceCm: { headCircumferenceCm: 0.35 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.998, clearanceBiasCm: -0.015 },
        snug: { widthScale: 1, depthScale: 1, clearanceBiasCm: -0.006 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.003, clearanceBiasCm: 0.018 },
        oversized: { widthScale: 1.008, depthScale: 1.006, clearanceBiasCm: 0.034 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "soft", stretch: 0.02, drape: 0.1 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/hair_soft_bob.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/hair_soft_bob.glb",
        "male-base": "/assets/garments/mpfb/male/hair_soft_bob.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.46 },
        { id: "foreheadCenter", weight: 0.28 },
        { id: "leftTemple", weight: 0.13 },
        { id: "rightTemple", weight: 0.13 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: secondaryMotion({
        profileId: "hair-bob",
        stiffness: 8.8,
        damping: 0.87,
        influence: 0.78,
        maxYawDeg: 4,
        maxPitchDeg: 3.2,
        maxRollDeg: 2.8,
        idleAmplitudeDeg: 0.72,
        idleFrequencyHz: 0.96,
        verticalBobCm: 0.18,
        lateralSwingCm: 0.22,
      }),
      surfaceClearanceCm: 0.11,
      renderPriority: 2,
    }),
    palette: ["#4f3c33", "#6c5145", "#b19383"],
  },
  {
    id: "starter-hair-long-fall",
    name: "Long Fall",
    imageSrc: createSwatchThumbnail("Long Fall", "#332925"),
    category: "hair",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#332925",
      measurements: { headCircumferenceCm: 57.2 },
      measurementModes: { headCircumferenceCm: "body-circumference" },
      sizeChart: [sizeSpec("One", { headCircumferenceCm: 57.2 }, { headCircumferenceCm: "body-circumference" })],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.012,
        maxComfortStretchRatio: 0.007,
        compressionToleranceCm: { headCircumferenceCm: 0.32 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.997, clearanceBiasCm: -0.015, offsetY: -0.001 },
        snug: { widthScale: 1, depthScale: 1, clearanceBiasCm: -0.006 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.003, clearanceBiasCm: 0.018 },
        oversized: { widthScale: 1.008, depthScale: 1.006, clearanceBiasCm: 0.032, offsetY: 0.001 },
      }),
      fitProfile: { layer: "base", silhouette: "relaxed", structure: "soft", stretch: 0.018, drape: 0.14 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/hair_long_fall.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/hair_long_fall.glb",
        "male-base": "/assets/garments/mpfb/male/hair_long_fall.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.46 },
        { id: "foreheadCenter", weight: 0.28 },
        { id: "leftTemple", weight: 0.13 },
        { id: "rightTemple", weight: 0.13 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: secondaryMotion({
        profileId: "hair-long",
        stiffness: 5.2,
        damping: 0.8,
        influence: 1.34,
        maxYawDeg: 9.2,
        maxPitchDeg: 8,
        maxRollDeg: 5.8,
        idleAmplitudeDeg: 1.48,
        idleFrequencyHz: 0.82,
        verticalBobCm: 0.4,
        lateralSwingCm: 0.92,
      }),
      surfaceClearanceCm: 0.12,
      renderPriority: 2,
    }),
    palette: ["#332925", "#56423c", "#836961"],
  },
  {
    id: "starter-hair-textured-crop",
    name: "Textured Crop",
    imageSrc: createSwatchThumbnail("Crop", "#382c28"),
    category: "hair",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#382c28",
      measurements: { headCircumferenceCm: 56.5 },
      measurementModes: { headCircumferenceCm: "body-circumference" },
      sizeChart: [sizeSpec("One", { headCircumferenceCm: 56.5 }, { headCircumferenceCm: "body-circumference" })],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.01,
        maxComfortStretchRatio: 0.006,
        compressionToleranceCm: { headCircumferenceCm: 0.35 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.998, clearanceBiasCm: -0.015 },
        snug: { widthScale: 1, depthScale: 1, clearanceBiasCm: -0.005 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.003, clearanceBiasCm: 0.018 },
        oversized: { widthScale: 1.008, depthScale: 1.006, clearanceBiasCm: 0.03 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "soft", stretch: 0.016, drape: 0.06 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/hair_textured_crop.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/hair_textured_crop.glb",
        "male-base": "/assets/garments/mpfb/male/hair_textured_crop.glb",
      },
      deriveSiblingLods: true,
      anchorBindings: [
        { id: "headCenter", weight: 0.46 },
        { id: "foreheadCenter", weight: 0.28 },
        { id: "leftTemple", weight: 0.13 },
        { id: "rightTemple", weight: 0.13 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: secondaryMotion({
        profileId: "hair-sway",
        stiffness: 9.4,
        damping: 0.9,
        influence: 0.52,
        maxYawDeg: 1.8,
        maxPitchDeg: 1.2,
        maxRollDeg: 1,
        idleAmplitudeDeg: 0.26,
        idleFrequencyHz: 1.04,
        verticalBobCm: 0.08,
        lateralSwingCm: 0.08,
      }),
      surfaceClearanceCm: 0.1,
      renderPriority: 2,
    }),
    palette: ["#382c28", "#58453f", "#8c7267"],
  },
  {
    id: "starter-hair-studio-braid",
    name: "Studio Braid",
    imageSrc: createSwatchThumbnail("Studio Braid", "#3a2d28"),
    category: "hair",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#3a2d28",
      measurements: { headCircumferenceCm: 56.9 },
      measurementModes: { headCircumferenceCm: "body-circumference" },
      sizeChart: [sizeSpec("One", { headCircumferenceCm: 56.9 }, { headCircumferenceCm: "body-circumference" })],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.01,
        maxComfortStretchRatio: 0.006,
        compressionToleranceCm: { headCircumferenceCm: 0.34 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.997, clearanceBiasCm: -0.016, offsetY: -0.001 },
        snug: { widthScale: 1, depthScale: 1, clearanceBiasCm: -0.006 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.003, clearanceBiasCm: 0.018 },
        oversized: { widthScale: 1.008, depthScale: 1.006, clearanceBiasCm: 0.034, offsetY: 0.001 },
      }),
      fitProfile: { layer: "base", silhouette: "relaxed", structure: "soft", stretch: 0.018, drape: 0.15 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/hair_studio_braid.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/hair_studio_braid.glb",
        "male-base": "/assets/garments/mpfb/male/hair_studio_braid.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.46 },
        { id: "foreheadCenter", weight: 0.28 },
        { id: "leftTemple", weight: 0.13 },
        { id: "rightTemple", weight: 0.13 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: secondaryMotion({
        profileId: "hair-long",
        stiffness: 5.8,
        damping: 0.82,
        influence: 1.22,
        maxYawDeg: 7.6,
        maxPitchDeg: 6.4,
        maxRollDeg: 4.8,
        idleAmplitudeDeg: 1.18,
        idleFrequencyHz: 0.86,
        verticalBobCm: 0.28,
        lateralSwingCm: 0.64,
      }),
      surfaceClearanceCm: 0.11,
      renderPriority: 2,
    }),
    palette: ["#3a2d28", "#5d463d", "#927164"],
  },
  {
    id: "starter-hair-volume-bob",
    name: "Volume Bob",
    imageSrc: createSwatchThumbnail("Volume Bob", "#4d3a31"),
    category: "hair",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#4d3a31",
      measurements: { headCircumferenceCm: 57 },
      measurementModes: { headCircumferenceCm: "body-circumference" },
      sizeChart: [sizeSpec("One", { headCircumferenceCm: 57 }, { headCircumferenceCm: "body-circumference" })],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.012,
        maxComfortStretchRatio: 0.007,
        compressionToleranceCm: { headCircumferenceCm: 0.35 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.998, clearanceBiasCm: -0.015 },
        snug: { widthScale: 1, depthScale: 1, clearanceBiasCm: -0.005 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.003, clearanceBiasCm: 0.018 },
        oversized: { widthScale: 1.008, depthScale: 1.006, clearanceBiasCm: 0.032 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "soft", stretch: 0.02, drape: 0.12 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/hair_volume_bob.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/hair_volume_bob.glb",
        "male-base": "/assets/garments/mpfb/male/hair_volume_bob.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.46 },
        { id: "foreheadCenter", weight: 0.28 },
        { id: "leftTemple", weight: 0.13 },
        { id: "rightTemple", weight: 0.13 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: secondaryMotion({
        profileId: "hair-bob",
        stiffness: 8.4,
        damping: 0.86,
        influence: 0.84,
        maxYawDeg: 4.4,
        maxPitchDeg: 3.4,
        maxRollDeg: 2.9,
        idleAmplitudeDeg: 0.78,
        idleFrequencyHz: 0.92,
        verticalBobCm: 0.18,
        lateralSwingCm: 0.24,
      }),
      surfaceClearanceCm: 0.11,
      renderPriority: 2,
    }),
    palette: ["#4d3a31", "#72574a", "#af8e7f"],
  },
  {
    id: "starter-hair-clean-sweep",
    name: "Clean Sweep",
    imageSrc: createSwatchThumbnail("Clean Sweep", "#342924"),
    category: "hair",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#342924",
      measurements: { headCircumferenceCm: 56.6 },
      measurementModes: { headCircumferenceCm: "body-circumference" },
      sizeChart: [sizeSpec("One", { headCircumferenceCm: 56.6 }, { headCircumferenceCm: "body-circumference" })],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.01,
        maxComfortStretchRatio: 0.006,
        compressionToleranceCm: { headCircumferenceCm: 0.35 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.998, clearanceBiasCm: -0.014 },
        snug: { widthScale: 1, depthScale: 1, clearanceBiasCm: -0.004 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.003, clearanceBiasCm: 0.016 },
        oversized: { widthScale: 1.008, depthScale: 1.006, clearanceBiasCm: 0.028 },
      }),
      fitProfile: { layer: "base", silhouette: "regular", structure: "balanced", stretch: 0.014, drape: 0.05 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/hair_clean_sweep.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/hair_clean_sweep.glb",
        "male-base": "/assets/garments/mpfb/male/hair_clean_sweep.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.46 },
        { id: "foreheadCenter", weight: 0.28 },
        { id: "leftTemple", weight: 0.13 },
        { id: "rightTemple", weight: 0.13 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: secondaryMotion({
        profileId: "hair-sway",
        stiffness: 9.6,
        damping: 0.9,
        influence: 0.54,
        maxYawDeg: 1.8,
        maxPitchDeg: 1.2,
        maxRollDeg: 1,
        idleAmplitudeDeg: 0.22,
        idleFrequencyHz: 1.08,
        verticalBobCm: 0.06,
        lateralSwingCm: 0.06,
      }),
      surfaceClearanceCm: 0.1,
      renderPriority: 2,
    }),
    palette: ["#342924", "#57433a", "#85685c"],
  },
  {
    id: "starter-hair-afro-cloud",
    name: "Afro Cloud",
    imageSrc: createSwatchThumbnail("Afro Cloud", "#29211e"),
    category: "hair",
    brand: "MakeHuman CC0",
    source: "starter",
    metadata: {
      dominantColor: "#29211e",
      measurements: { headCircumferenceCm: 57.4 },
      measurementModes: { headCircumferenceCm: "body-circumference" },
      sizeChart: [sizeSpec("One", { headCircumferenceCm: 57.4 }, { headCircumferenceCm: "body-circumference" })],
      selectedSizeLabel: "One",
      physicalProfile: {
        materialStretchRatio: 0.012,
        maxComfortStretchRatio: 0.007,
        compressionToleranceCm: { headCircumferenceCm: 0.36 },
      },
      correctiveFit: correctiveFit({
        compression: { widthScale: 0.998, depthScale: 0.998, clearanceBiasCm: -0.014 },
        snug: { widthScale: 1, depthScale: 1, clearanceBiasCm: -0.004 },
        regular: { widthScale: 1, depthScale: 1, heightScale: 1 },
        relaxed: { widthScale: 1.004, depthScale: 1.003, clearanceBiasCm: 0.016 },
        oversized: { widthScale: 1.008, depthScale: 1.006, clearanceBiasCm: 0.03 },
      }),
      fitProfile: { layer: "base", silhouette: "relaxed", structure: "soft", stretch: 0.015, drape: 0.08 },
    },
    runtime: createRuntime({
      modelPath: "/assets/garments/mpfb/female/hair_afro_cloud.glb",
      modelPathByVariant: {
        "female-base": "/assets/garments/mpfb/female/hair_afro_cloud.glb",
        "male-base": "/assets/garments/mpfb/male/hair_afro_cloud.glb",
      },
      anchorBindings: [
        { id: "headCenter", weight: 0.46 },
        { id: "foreheadCenter", weight: 0.28 },
        { id: "leftTemple", weight: 0.13 },
        { id: "rightTemple", weight: 0.13 },
      ],
      collisionZones: [],
      bodyMaskZones: [],
      secondaryMotion: secondaryMotion({
        profileId: "hair-bob",
        stiffness: 10.2,
        damping: 0.92,
        influence: 0.42,
        maxYawDeg: 1.4,
        maxPitchDeg: 1.1,
        maxRollDeg: 0.9,
        idleAmplitudeDeg: 0.16,
        idleFrequencyHz: 1.02,
        verticalBobCm: 0.04,
        lateralSwingCm: 0.04,
      }),
      surfaceClearanceCm: 0.12,
      renderPriority: 2,
    }),
    palette: ["#29211e", "#433531", "#6c574f"],
  },
];

export const starterGarmentById = new Map(starterGarmentCatalog.map((item) => [item.id, item] as const));

export const createRuntimeGarmentLookup = (catalog: RuntimeGarmentAsset[]) =>
  new Map(catalog.map((item) => [item.id, item] as const));

export const mergeRuntimeGarmentCatalogs = (
  starterCatalog: StarterGarment[],
  publishedCatalog: PublishedGarmentAsset[],
) => {
  const merged = new Map<string, RuntimeGarmentAsset>();
  starterCatalog.forEach((item) => merged.set(item.id, item));
  publishedCatalog.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
};

export type PublishedGarmentRepository = {
  load: () => PublishedGarmentAsset[];
  save: (items: PublishedGarmentAsset[]) => void;
};

export const createLocalPublishedGarmentRepository = (): PublishedGarmentRepository => ({
  load: () => {
    const stored = readStoredJson<PublishedGarmentAsset[]>(publishedGarmentStorageKey, []);
    return stored.filter((item) => validatePublishedGarmentAsset(item).length === 0);
  },
  save: (items) => writeStoredJson(publishedGarmentStorageKey, items),
});

export const defaultHairItemIdsByVariant: Record<AvatarRenderVariantId, string | null> = {
  "female-base": null,
  "male-base": "starter-hair-textured-crop",
};

export const defaultEquippedItems: Partial<Record<GarmentCategory, string>> = {
  tops: "starter-top-soft-casual",
  bottoms: "starter-bottom-soft-wool",
};

const defaultClosetLoadoutByVariant: Record<AvatarRenderVariantId, Partial<Record<GarmentCategory, string>>> = {
  "female-base": {
    tops: "starter-top-soft-casual",
    bottoms: "starter-bottom-soft-wool",
    shoes: "starter-shoe-soft-day",
    hair: defaultHairItemIdsByVariant["female-base"] ?? undefined,
  },
  "male-base": {
    tops: "starter-top-soft-casual",
    bottoms: "starter-bottom-soft-wool",
    shoes: "starter-shoe-sneaker",
    hair: defaultHairItemIdsByVariant["male-base"] ?? undefined,
  },
};

const defaultLayeredTopId = "starter-top-soft-casual";

export const resolveDefaultClosetLoadout = (
  variantId: AvatarRenderVariantId,
): Partial<Record<GarmentCategory, string>> => {
  return {
    ...defaultEquippedItems,
    ...(defaultClosetLoadoutByVariant[variantId] ?? {}),
  };
};

export const isTopCompatibleWithOuterwear = (top: RuntimeGarmentAsset | null | undefined) => {
  if (!top || top.category !== "tops") return true;
  const profile = top.metadata?.fitProfile;
  const layer = profile?.layer ?? "mid";
  const silhouette = profile?.silhouette ?? "regular";
  const drape = profile?.drape ?? 0;
  return layer === "base" || (layer === "mid" && silhouette === "regular" && drape <= 0.18);
};

export const resolveLayeredTopFallback = (
  catalogLookup: Map<string, RuntimeGarmentAsset>,
): RuntimeGarmentAsset | null => {
  const explicit = catalogLookup.get(defaultLayeredTopId);
  if (explicit && isTopCompatibleWithOuterwear(explicit)) {
    return explicit;
  }

  for (const item of catalogLookup.values()) {
    if (item.category === "tops" && isTopCompatibleWithOuterwear(item)) {
      return item;
    }
  }

  return null;
};

export const resolveLayeredEquippedItemIds = (
  currentEquippedItemIds: Partial<Record<GarmentCategory, string>>,
  category: GarmentCategory,
  itemId: string,
  catalogLookup: Map<string, RuntimeGarmentAsset>,
) => {
  const nextEquipped = { ...currentEquippedItemIds, [category]: itemId };
  const nextTop = nextEquipped.tops ? catalogLookup.get(nextEquipped.tops) ?? null : null;
  const nextOuterwear = nextEquipped.outerwear ? catalogLookup.get(nextEquipped.outerwear) ?? null : null;

  if (!nextOuterwear) {
    return nextEquipped;
  }

  if (category === "tops" && nextTop && !isTopCompatibleWithOuterwear(nextTop)) {
    delete nextEquipped.outerwear;
    return nextEquipped;
  }

  if (!nextTop || !isTopCompatibleWithOuterwear(nextTop)) {
    const fallbackTop = resolveLayeredTopFallback(catalogLookup);
    if (fallbackTop) {
      nextEquipped.tops = fallbackTop.id;
    } else {
      delete nextEquipped.outerwear;
    }
  }

  return nextEquipped;
};

const garmentMeasurementKeys: GarmentMeasurementKey[] = [
  "chestCm",
  "waistCm",
  "hipCm",
  "headCircumferenceCm",
  "frameWidthCm",
  "shoulderCm",
  "sleeveLengthCm",
  "lengthCm",
  "inseamCm",
  "riseCm",
  "hemCm",
];

const defaultMeasurementModes: Record<GarmentMeasurementKey, GarmentMeasurementMode> = {
  chestCm: "body-circumference",
  waistCm: "body-circumference",
  hipCm: "body-circumference",
  headCircumferenceCm: "body-circumference",
  frameWidthCm: "linear-length",
  shoulderCm: "linear-length",
  sleeveLengthCm: "linear-length",
  lengthCm: "linear-length",
  inseamCm: "linear-length",
  riseCm: "linear-length",
  hemCm: "body-circumference",
};

const fitStateOrder: GarmentFitState[] = ["compression", "snug", "regular", "relaxed", "oversized"];

const fitBandsByMeasurement: Record<
  GarmentMeasurementKey,
  { compression: number; snug: number; regular: number; relaxed: number }
> = {
  chestCm: { compression: -2, snug: 4, regular: 10, relaxed: 18 },
  waistCm: { compression: -2, snug: 3, regular: 8, relaxed: 14 },
  hipCm: { compression: -2, snug: 4, regular: 10, relaxed: 16 },
  headCircumferenceCm: { compression: -0.8, snug: 0.8, regular: 2.2, relaxed: 3.8 },
  frameWidthCm: { compression: -0.4, snug: 0.4, regular: 1.1, relaxed: 1.8 },
  shoulderCm: { compression: -1, snug: 1.5, regular: 4, relaxed: 7 },
  sleeveLengthCm: { compression: -1, snug: 1.5, regular: 3.5, relaxed: 6 },
  lengthCm: { compression: -2, snug: 2, regular: 5, relaxed: 10 },
  inseamCm: { compression: -1, snug: 1.5, regular: 4, relaxed: 8 },
  riseCm: { compression: -1, snug: 1.5, regular: 3, relaxed: 6 },
  hemCm: { compression: -1, snug: 2, regular: 5, relaxed: 10 },
};

const bodyMeasurementLabels: Record<GarmentMeasurementKey, { ko: string; en: string }> = {
  chestCm: { ko: "가슴", en: "Chest" },
  waistCm: { ko: "허리", en: "Waist" },
  hipCm: { ko: "힙", en: "Hip" },
  headCircumferenceCm: { ko: "머리", en: "Head" },
  frameWidthCm: { ko: "프레임폭", en: "Frame" },
  shoulderCm: { ko: "어깨", en: "Shoulder" },
  sleeveLengthCm: { ko: "소매", en: "Sleeve" },
  lengthCm: { ko: "총장", en: "Length" },
  inseamCm: { ko: "인심", en: "Inseam" },
  riseCm: { ko: "밑위", en: "Rise" },
  hemCm: { ko: "밑단", en: "Hem" },
};

const instantFitRegionIdsByMeasurement: Record<GarmentMeasurementKey, GarmentFitRegionId> = {
  chestCm: "chest",
  waistCm: "waist",
  hipCm: "hip",
  headCircumferenceCm: "head",
  frameWidthCm: "frame",
  shoulderCm: "shoulder",
  sleeveLengthCm: "sleeve",
  lengthCm: "length",
  inseamCm: "inseam",
  riseCm: "rise",
  hemCm: "hem",
};

const instantFitOverallLabels: Record<GarmentFitOverall, { ko: string; en: string }> = {
  good: { ko: "잘 맞음", en: "good fit" },
  tight: { ko: "타이트함", en: "tight fit" },
  loose: { ko: "여유가 큼", en: "loose fit" },
  risky: { ko: "주의 필요", en: "risky fit" },
};

const instantFitStateLabels: Record<GarmentFitState, { ko: string; en: string }> = {
  compression: { ko: "압박이 큼", en: "compressed" },
  snug: { ko: "슬림하게 맞음", en: "snug" },
  regular: { ko: "기본 핏", en: "regular" },
  relaxed: { ko: "여유 있게 맞음", en: "relaxed" },
  oversized: { ko: "오버 핏", en: "oversized" },
};

const deriveFootLengthCm = (heightCm: number) => round(heightCm * 0.152);
const deriveFootOpeningCm = (ankleCm: number | undefined, footLengthCm: number) =>
  round(ankleCm ?? footLengthCm * 0.38);
const deriveHeadCircumferenceCm = (heightCm: number, explicitValue: number | undefined) =>
  round(explicitValue ?? Math.max(52, Math.min(61, heightCm * 0.325)));
const deriveFaceWidthCm = (headCircumferenceCm: number) =>
  round((headCircumferenceCm / Math.PI) * 0.82);

export const bodyProfileToGarmentBodyMeasurements = (
  profile: BodyProfile,
  category: GarmentCategory | "custom" = "custom",
): GarmentMeasurements => {
  const flat = flattenBodyProfile(profile);
  const footLengthCm = deriveFootLengthCm(flat.heightCm);
  const headCircumferenceCm = deriveHeadCircumferenceCm(flat.heightCm, flat.headCircumferenceCm);

  if (category === "bottoms") {
    const riseCm = flat.riseCm ?? round(flat.heightCm * 0.14);
    const outseamCm = flat.outseamCm ?? round(flat.inseamCm + riseCm);
    return {
      waistCm: flat.waistCm,
      hipCm: flat.hipCm,
      inseamCm: flat.inseamCm,
      riseCm,
      lengthCm: outseamCm,
      hemCm: flat.ankleCm,
    };
  }

  if (category === "shoes") {
    return {
      lengthCm: footLengthCm,
      hemCm: deriveFootOpeningCm(flat.ankleCm, footLengthCm),
    };
  }

  if (category === "accessories") {
    return {
      headCircumferenceCm,
      frameWidthCm: deriveFaceWidthCm(headCircumferenceCm),
    };
  }

  if (category === "hair") {
    return {
      headCircumferenceCm,
    };
  }

  return {
    chestCm: flat.chestCm,
    waistCm: flat.waistCm,
    hipCm: flat.hipCm,
    shoulderCm: flat.shoulderCm,
    sleeveLengthCm: flat.sleeveLengthCm ?? flat.armLengthCm,
    lengthCm: flat.torsoLengthCm,
    inseamCm: flat.inseamCm,
    riseCm: flat.riseCm,
    hemCm: flat.ankleCm,
  };
};

export const resolveGarmentSizeSpec = (
  sizeChart: GarmentSizeSpec[] | undefined,
  selectedSizeLabel: string | undefined,
) => {
  if (!sizeChart?.length) {
    return null;
  }

  if (selectedSizeLabel) {
    const selected = sizeChart.find((entry) => entry.label === selectedSizeLabel);
    if (selected) {
      return selected;
    }
  }

  return sizeChart[0] ?? null;
};

export const resolveGarmentMeasurementMode = (
  key: GarmentMeasurementKey,
  modes: GarmentMeasurementModeMap | undefined,
) => modes?.[key] ?? defaultMeasurementModes[key];

export const normalizeGarmentMeasurementValue = (
  value: number,
  mode: GarmentMeasurementMode,
) => {
  if (mode === "flat-half-circumference") {
    return round(value * 2);
  }
  return round(value);
};

const resolveFitState = (key: GarmentMeasurementKey, easeCm: number, compressionToleranceCm: number) => {
  if (easeCm < -compressionToleranceCm) {
    return "compression";
  }

  const bands = fitBandsByMeasurement[key];
  if (easeCm < bands.snug) {
    return "snug";
  }
  if (easeCm < bands.regular) {
    return "regular";
  }
  if (easeCm < bands.relaxed) {
    return "relaxed";
  }
  return "oversized";
};

const shouldSkipMeasurementForFit = (
  garment: Pick<Asset | StarterGarment, "metadata" | "category">,
  key: GarmentMeasurementKey,
  bodyCm: number,
  garmentCm: number,
  measurementMode: GarmentMeasurementMode,
) => {
  if (key !== "sleeveLengthCm" || garment.category !== "tops") {
    return false;
  }

  if (measurementMode !== "linear-length") {
    return false;
  }

  const fitLayer = garment.metadata?.fitProfile?.layer ?? "mid";
  const ratio = garmentCm / Math.max(bodyCm, 1);
  return fitLayer === "base" && ratio <= 0.62;
};

const fitRiskFromLoad = (stretchLoad: number): "low" | "medium" | "high" => {
  if (stretchLoad >= 1.1) {
    return "high";
  }
  if (stretchLoad >= 0.72) {
    return "medium";
  }
  return "low";
};

const worstFitState = (states: GarmentFitState[]) =>
  states.reduce<GarmentFitState>(
    (current, next) =>
      fitStateOrder.indexOf(next) < fitStateOrder.indexOf(current) ? next : current,
    "oversized",
  );

const buildDimensionAssessment = (
  key: GarmentMeasurementKey,
  bodyCm: number,
  garmentCm: number,
  measurementMode: GarmentMeasurementMode,
  physicalProfile: GarmentPhysicalProfile | undefined,
): GarmentFitDimensionAssessment => {
  const materialStretchRatio = physicalProfile?.materialStretchRatio ?? 0;
  const maxComfortStretchRatio = Math.min(
    materialStretchRatio,
    physicalProfile?.maxComfortStretchRatio ?? materialStretchRatio,
  );
  const compressionToleranceCm = physicalProfile?.compressionToleranceCm?.[key] ?? 1.5;
  const easeBiasCm = physicalProfile?.easeBiasCm?.[key] ?? 0;
  const effectiveGarmentCm = garmentCm + garmentCm * maxComfortStretchRatio + easeBiasCm;
  const easeCm = round(effectiveGarmentCm - bodyCm);
  const requiredStretchRatio = bodyCm > garmentCm ? round((bodyCm - garmentCm) / garmentCm) : 0;
  return {
    key,
    measurementMode,
    garmentCm: round(garmentCm),
    bodyCm: round(bodyCm),
    effectiveGarmentCm: round(effectiveGarmentCm),
    easeCm,
    requiredStretchRatio,
    state: resolveFitState(key, easeCm, compressionToleranceCm),
  };
};

export const assessGarmentPhysicalFit = (
  garment: Pick<Asset | StarterGarment, "metadata" | "category">,
  profile: BodyProfile,
): GarmentFitAssessment | null => {
  const bodyMeasurements = bodyProfileToGarmentBodyMeasurements(profile, garment.category);
  const sizeSpec = resolveGarmentSizeSpec(
    garment.metadata?.sizeChart,
    garment.metadata?.selectedSizeLabel,
  );
  const baseMeasurements = sizeSpec?.measurements ?? garment.metadata?.measurements;
  const measurementModes = sizeSpec?.measurementModes ?? garment.metadata?.measurementModes;
  const physicalProfile = garment.metadata?.physicalProfile;

  if (!baseMeasurements) {
    return null;
  }

  const dimensions = garmentMeasurementKeys
    .map((key) => {
      const garmentValue = baseMeasurements[key];
      const bodyValue = bodyMeasurements[key];
      if (!garmentValue || !bodyValue) {
        return null;
      }
      const measurementMode = resolveGarmentMeasurementMode(key, measurementModes);
      const normalizedGarmentCm = normalizeGarmentMeasurementValue(garmentValue, measurementMode);
      if (shouldSkipMeasurementForFit(garment, key, bodyValue, normalizedGarmentCm, measurementMode)) {
        return null;
      }
      return buildDimensionAssessment(
        key,
        bodyValue,
        normalizedGarmentCm,
        measurementMode,
        physicalProfile,
      );
    })
    .filter((entry): entry is GarmentFitDimensionAssessment => Boolean(entry));

  if (dimensions.length === 0) {
    return null;
  }

  const stretchLoad = round(
    Math.max(
      ...dimensions.map((entry) => {
        const comfortStretch = physicalProfile?.maxComfortStretchRatio ?? physicalProfile?.materialStretchRatio ?? 0;
        if (comfortStretch <= 0) {
          return entry.requiredStretchRatio > 0 ? 2 : 0;
        }
        return entry.requiredStretchRatio / comfortStretch;
      }),
    ),
  );

  const limitingDimensions = [...dimensions]
    .sort((left, right) => left.easeCm - right.easeCm)
    .slice(0, 3)
    .map((entry) => entry.key);
  const overallState = worstFitState(dimensions.map((entry) => entry.state));

  return garmentFitAssessmentSchema.parse({
    sizeLabel: sizeSpec?.label ?? garment.metadata?.selectedSizeLabel ?? null,
    overallState,
    tensionRisk: fitRiskFromLoad(stretchLoad),
    clippingRisk: fitRiskFromLoad(stretchLoad * (garment.metadata?.fitProfile?.layer === "outer" ? 0.8 : 1)),
    stretchLoad,
    limitingKeys: limitingDimensions,
    dimensions,
  });
};

export const formatGarmentFitSummary = (
  assessment: GarmentFitAssessment | null,
  language: "ko" | "en" = "en",
) => {
  if (!assessment) {
    return language === "ko" ? "사이즈 데이터 없음" : "No size data";
  }

  const primary =
    assessment.dimensions.find((entry) => entry.key === assessment.limitingKeys[0]) ?? assessment.dimensions[0];
  const label = assessment.sizeLabel ? `${assessment.sizeLabel} · ` : "";
  const stateLabel =
    language === "ko"
      ? {
          compression: "끼는 핏",
          snug: "슬림 핏",
          regular: "정상 핏",
          relaxed: "여유 핏",
          oversized: "오버 핏",
        }[assessment.overallState]
      : assessment.overallState;

  if (!primary) {
    return `${label}${stateLabel}`;
  }

  return `${label}${bodyMeasurementLabels[primary.key][language]} ${stateLabel}`;
};

const resolveGarmentInstantFitOverall = (
  assessment: Pick<GarmentFitAssessment, "overallState" | "tensionRisk" | "clippingRisk">,
): GarmentFitOverall => {
  if (
    assessment.overallState === "compression" ||
    assessment.tensionRisk === "high" ||
    assessment.clippingRisk === "high"
  ) {
    return "risky";
  }

  if (
    assessment.overallState === "snug" ||
    assessment.tensionRisk === "medium" ||
    assessment.clippingRisk === "medium"
  ) {
    return "tight";
  }

  if (assessment.overallState === "oversized") {
    return "loose";
  }

  return "good";
};

const resolveGarmentInstantFitConfidence = (
  assessment: Pick<GarmentFitAssessment, "dimensions" | "sizeLabel" | "tensionRisk" | "clippingRisk">,
) => {
  const tensionPenalty =
    assessment.tensionRisk === "high" ? 0.12 : assessment.tensionRisk === "medium" ? 0.05 : 0;
  const clippingPenalty =
    assessment.clippingRisk === "high" ? 0.08 : assessment.clippingRisk === "medium" ? 0.03 : 0;
  const value = clamp(
    0.45 +
      Math.min(assessment.dimensions.length, 4) * 0.08 +
      (assessment.sizeLabel ? 0.1 : 0) -
      tensionPenalty -
      clippingPenalty,
    0.35,
    0.95,
  );
  return round(value);
};

const buildGarmentInstantFitExplanations = (
  assessment: GarmentFitAssessment,
  overallFit: GarmentFitOverall,
) => {
  const primary =
    assessment.dimensions.find((entry) => entry.key === assessment.limitingKeys[0]) ?? assessment.dimensions[0];
  const explanations: Array<{ ko: string; en: string }> = [];

  if (primary) {
    explanations.push({
      ko: `${bodyMeasurementLabels[primary.key].ko} 기준 여유는 ${round(primary.easeCm)}cm이며 현재 ${instantFitStateLabels[primary.state].ko} 상태다.`,
      en: `${bodyMeasurementLabels[primary.key].en} leads with ${round(primary.easeCm)}cm ease and currently reads ${instantFitStateLabels[primary.state].en}.`,
    });
  }

  if (assessment.tensionRisk === "low" && assessment.clippingRisk === "low") {
    explanations.push({
      ko: "현재 선택된 사이즈 기준으로 장력과 클리핑 위험은 낮다.",
      en: "Tension and clipping risk stay low for the currently selected size.",
    });
  } else {
    explanations.push({
      ko: `장력 위험 ${assessment.tensionRisk}, 클리핑 위험 ${assessment.clippingRisk}로 추가 확인이 필요하다.`,
      en: `Tension risk is ${assessment.tensionRisk} and clipping risk is ${assessment.clippingRisk}, so this fit needs extra review.`,
    });
  }

  if (assessment.sizeLabel) {
    explanations.push({
      ko: `현재 instant-fit 판단은 ${assessment.sizeLabel} 사이즈 기준이다.`,
      en: `The current instant-fit recommendation is based on size ${assessment.sizeLabel}.`,
    });
  }

  if (overallFit === "loose") {
    explanations.push({
      ko: "전반적으로 여유가 커서 실루엣이 의도보다 크게 읽힐 수 있다.",
      en: "The overall ease is generous enough that the silhouette may read looser than intended.",
    });
  }

  return explanations.slice(0, 4);
};

export const buildGarmentInstantFitReport = (
  assessment: GarmentFitAssessment | null,
): GarmentInstantFitReport | null => {
  if (!assessment) {
    return null;
  }

  const overallFit = resolveGarmentInstantFitOverall(assessment);
  const primary =
    assessment.dimensions.find((entry) => entry.key === assessment.limitingKeys[0]) ?? assessment.dimensions[0];
  const primaryRegionId = instantFitRegionIdsByMeasurement[primary.key];
  const summaryLabel = instantFitOverallLabels[overallFit];

  return garmentInstantFitReportSchema.parse({
    schemaVersion: garmentInstantFitSchemaVersion,
    sizeLabel: assessment.sizeLabel,
    overallFit,
    overallState: assessment.overallState,
    tensionRisk: assessment.tensionRisk,
    clippingRisk: assessment.clippingRisk,
    confidence: resolveGarmentInstantFitConfidence(assessment),
    primaryRegionId,
    summary: {
      ko: `${assessment.sizeLabel ? `${assessment.sizeLabel} · ` : ""}${bodyMeasurementLabels[primary.key].ko} 기준 ${summaryLabel.ko}`,
      en: `${assessment.sizeLabel ? `${assessment.sizeLabel} · ` : ""}${bodyMeasurementLabels[primary.key].en} ${summaryLabel.en}`,
    },
    explanations: buildGarmentInstantFitExplanations(assessment, overallFit),
    limitingKeys: assessment.limitingKeys,
    regions: assessment.dimensions.map((entry) => ({
      regionId: instantFitRegionIdsByMeasurement[entry.key],
      measurementKey: entry.key,
      fitState: entry.state,
      easeCm: entry.easeCm,
      isLimiting: assessment.limitingKeys.includes(entry.key),
    })),
  });
};

export const assessGarmentInstantFit = (
  garment: Pick<Asset | StarterGarment, "metadata" | "category">,
  profile: BodyProfile,
) => buildGarmentInstantFitReport(assessGarmentPhysicalFit(garment, profile));

export const buildFitMapSummary = (fitMap: FitMapArtifactData): FitMapSummary => {
  const dominantOverlay =
    [...fitMap.overlays].sort((left, right) => {
      if (right.maxRegionScore !== left.maxRegionScore) {
        return right.maxRegionScore - left.maxRegionScore;
      }
      return right.overallScore - left.overallScore;
    })[0] ?? fitMap.overlays[0];

  if (!dominantOverlay) {
    throw new Error("fitMap must contain at least one overlay.");
  }

  const dominantRegion =
    [...dominantOverlay.regions].sort((left, right) => right.score - left.score)[0] ??
    dominantOverlay.regions[0];

  if (!dominantRegion) {
    throw new Error("fitMap dominant overlay must contain at least one region.");
  }

  return fitMapSummarySchema.parse({
    dominantOverlayKind: dominantOverlay.kind,
    dominantRegionId: dominantRegion.regionId,
    dominantMeasurementKey: dominantRegion.measurementKey,
    dominantScore: dominantRegion.score,
    overlayScores: fitMap.overlays.map((overlay) => ({
      kind: overlay.kind,
      overallScore: overlay.overallScore,
      maxRegionScore: overlay.maxRegionScore,
    })),
  });
};

export const validateGarmentRuntimeBinding = (binding: GarmentRuntimeBinding) => {
  const issues: string[] = [];
  const skeletonProfile = freestyleSkeletonProfiles[binding.skeletonProfileId];
  const modelPaths = collectGarmentRuntimeModelPaths(binding);
  if (modelPaths.length === 0) {
    issues.push("at least one modelPath must point to a GLB asset.");
  }
  const invalidModelPaths = modelPaths.filter((path) => !path.endsWith(".glb"));
  if (invalidModelPaths.length > 0) {
    issues.push(`modelPath entries must point to GLB assets: ${invalidModelPaths.join(", ")}`);
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

    Object.entries(binding.poseTuning ?? {}).forEach(([poseId, entry]) => {
      const invalidPoseMaskZones = (entry?.extraBodyMaskZones ?? []).filter(
        (zone) => !skeletonProfile.bodyMaskZones.includes(zone),
      );
      if (invalidPoseMaskZones.length > 0) {
        issues.push(`invalid pose body mask zones for ${poseId}: ${invalidPoseMaskZones.join(", ")}`);
      }
    });
  }
  if (binding.surfaceClearanceCm <= 0) {
    issues.push("surfaceClearanceCm must be greater than zero.");
  }
  if (binding.secondaryMotion) {
    const motion = binding.secondaryMotion;
    if (motion.stiffness <= 0 || motion.damping <= 0 || motion.influence <= 0) {
      issues.push("secondaryMotion stiffness, damping, and influence must be greater than zero.");
    }
  }
  return issues;
};

export const validateStarterGarment = (item: StarterGarment) => {
  const issues = validateRuntimeGarmentAsset(item);
  if (item.source !== "starter") {
    issues.push(`${item.id}: starter garments must use source='starter'.`);
  }
  if (!item.metadata?.measurementModes) {
    issues.push(`${item.id}: starter garments must declare measurementModes.`);
  }
  if (!item.metadata?.sizeChart?.length) {
    issues.push(`${item.id}: starter garments must include a sizeChart.`);
  }
  if (!item.metadata?.selectedSizeLabel) {
    issues.push(`${item.id}: starter garments must declare selectedSizeLabel.`);
  }
  if (!item.metadata?.physicalProfile) {
    issues.push(`${item.id}: starter garments must declare physicalProfile.`);
  }
  if (!item.metadata?.correctiveFit) {
    issues.push(`${item.id}: starter garments must declare correctiveFit.`);
  }
  return issues;
};

const sortGarmentPatternSpecComparable = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortGarmentPatternSpecComparable);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortGarmentPatternSpecComparable(nestedValue)]),
    );
  }
  return value;
};

export const validateGarmentPatternSpecAgainstStarterCatalog = (
  patternSpec: GarmentPatternSpec,
  starterCatalog: readonly StarterGarment[] = starterGarmentCatalog,
) => {
  const issues: string[] = [];
  const starter = starterCatalog.find((item) => item.id === patternSpec.runtimeStarterId);

  if (!starter) {
    return [`pattern spec starter id ${patternSpec.runtimeStarterId} does not exist in starter catalog.`];
  }

  if (starter.category !== patternSpec.category) {
    issues.push(
      `pattern spec category ${patternSpec.category} does not match starter catalog category ${starter.category}.`,
    );
  }

  const metadata = starter.metadata ?? {};
  const checks: Array<[label: string, runtimeValue: unknown, patternValue: unknown]> = [
    ["measurements", metadata.measurements ?? null, patternSpec.measurements],
    ["measurementModes", metadata.measurementModes ?? null, patternSpec.measurementModes],
    ["sizeChart", metadata.sizeChart ?? null, patternSpec.sizeChart],
    ["selectedSizeLabel", metadata.selectedSizeLabel ?? null, patternSpec.selectedSizeLabel],
    ["physicalProfile", metadata.physicalProfile ?? null, patternSpec.physicalProfile],
    [
      "anchorIds",
      (starter.runtime.anchorBindings ?? []).map((entry) => entry.id).sort(),
      [...patternSpec.anchorIds].sort(),
    ],
  ];

  for (const [label, runtimeValue, patternValue] of checks) {
    if (
      JSON.stringify(sortGarmentPatternSpecComparable(runtimeValue)) !==
      JSON.stringify(sortGarmentPatternSpecComparable(patternValue))
    ) {
      issues.push(`pattern spec ${label} does not match starter runtime metadata.`);
    }
  }

  return issues;
};

export const validateGarmentAuthoringBundleAgainstStarterCatalog = (
  bundle: {
    patternSpec: GarmentPatternSpec;
    materialProfile: GarmentMaterialProfile;
    simProxy: GarmentSimProxy;
    collisionProxy: GarmentCollisionProxy;
    hqArtifact: GarmentHQArtifactSpec;
  },
  starterCatalog: readonly StarterGarment[] = starterGarmentCatalog,
) => {
  const issues = validateGarmentPatternSpecAgainstStarterCatalog(bundle.patternSpec, starterCatalog);
  const starter = starterCatalog.find((item) => item.id === bundle.patternSpec.runtimeStarterId);

  if (!starter) {
    return issues;
  }

  const sidecars = [
    ["materialProfile", bundle.materialProfile.runtimeStarterId, bundle.materialProfile.category],
    ["simProxy", bundle.simProxy.runtimeStarterId, bundle.simProxy.category],
    ["collisionProxy", bundle.collisionProxy.runtimeStarterId, bundle.collisionProxy.category],
    ["hqArtifact", bundle.hqArtifact.runtimeStarterId, bundle.hqArtifact.category],
  ] as const;

  sidecars.forEach(([label, starterId, category]) => {
    if (starterId !== bundle.patternSpec.runtimeStarterId) {
      issues.push(`${label} starter id ${starterId} does not match pattern spec starter id ${bundle.patternSpec.runtimeStarterId}.`);
    }
    if (category !== bundle.patternSpec.category) {
      issues.push(`${label} category ${category} does not match pattern spec category ${bundle.patternSpec.category}.`);
    }
  });

  if (bundle.materialProfile.materialPresetId !== bundle.patternSpec.materialPreset.presetId) {
    issues.push("materialProfile materialPresetId does not match pattern spec material preset.");
  }
  if (bundle.materialProfile.fabricFamily !== bundle.patternSpec.materialPreset.fabricFamily) {
    issues.push("materialProfile fabricFamily does not match pattern spec material preset.");
  }
  if (bundle.materialProfile.stretchProfile !== bundle.patternSpec.materialPreset.stretchProfile) {
    issues.push("materialProfile stretchProfile does not match pattern spec material preset.");
  }
  if (Math.abs(bundle.materialProfile.thicknessMm - bundle.patternSpec.materialPreset.thicknessMm) > 0.0001) {
    issues.push("materialProfile thicknessMm does not match pattern spec material preset.");
  }

  const patternAnchors = [...bundle.patternSpec.anchorIds].sort();
  const simAnchors = [...bundle.simProxy.pinnedAnchorIds].sort();
  const collisionAnchors = [...bundle.collisionProxy.anchorIds].sort();
  if (JSON.stringify(patternAnchors) !== JSON.stringify(simAnchors)) {
    issues.push("simProxy pinnedAnchorIds do not match pattern spec anchorIds.");
  }
  if (JSON.stringify(patternAnchors) !== JSON.stringify(collisionAnchors)) {
    issues.push("collisionProxy anchorIds do not match pattern spec anchorIds.");
  }

  const runtimeZones = new Set(starter.runtime.collisionZones);
  bundle.collisionProxy.colliders.forEach((collider) => {
    if (!runtimeZones.has(collider.zone)) {
      issues.push(`collisionProxy collider zone ${collider.zone} is not present in starter runtime collision zones.`);
    }
  });

  const expectedArtifacts = ["draped_glb", "fit_map_json", "preview_png", "metrics_json"];
  expectedArtifacts.forEach((kind) => {
    if (!bundle.hqArtifact.expectedArtifacts.includes(kind as (typeof bundle.hqArtifact.expectedArtifacts)[number])) {
      issues.push(`hqArtifact expectedArtifacts is missing ${kind}.`);
    }
  });

  const expectedCacheNamespace = `fit-sim:${bundle.patternSpec.runtimeStarterId}`;
  if (bundle.hqArtifact.cacheNamespace !== expectedCacheNamespace) {
    issues.push(`hqArtifact cacheNamespace ${bundle.hqArtifact.cacheNamespace} does not match ${expectedCacheNamespace}.`);
  }

  return issues;
};

export const validateRuntimeGarmentAsset = (item: RuntimeGarmentAsset) => {
  const issues = validateGarmentRuntimeBinding(item.runtime);
  if (!item.metadata?.fitProfile?.layer) {
    issues.push(`${item.id}: fitProfile.layer is required.`);
  }
  if (!item.metadata?.measurements) {
    issues.push(`${item.id}: measurements are required.`);
  }
  if (item.metadata?.correctiveFit) {
    const states = Object.keys(item.metadata.correctiveFit);
    if (states.length === 0) {
      issues.push(`${item.id}: correctiveFit must not be empty.`);
    }
  }
  if (item.metadata?.sizeChart?.length) {
    const labels = new Set(item.metadata.sizeChart.map((entry) => entry.label));
    if (labels.size !== item.metadata.sizeChart.length) {
      issues.push(`${item.id}: sizeChart labels must be unique.`);
    }
    if (
      item.metadata.selectedSizeLabel &&
      !item.metadata.sizeChart.some((entry) => entry.label === item.metadata?.selectedSizeLabel)
    ) {
      issues.push(`${item.id}: selectedSizeLabel must exist in sizeChart.`);
    }

    const rowByLabel = new Map(item.metadata.sizeChart.map((entry) => [entry.label, entry] as const));
    const monotonicRows = ["M", "L", "XL"]
      .map((label) => rowByLabel.get(label))
      .filter((entry): entry is GarmentSizeSpec => Boolean(entry));
    if (monotonicRows.length === 3) {
      const [mRow, lRow, xlRow] = monotonicRows;
      const keys = new Set([
        ...Object.keys(mRow.measurements),
        ...Object.keys(lRow.measurements),
        ...Object.keys(xlRow.measurements),
      ]);
      for (const key of keys) {
        const mValue = mRow.measurements[key as GarmentMeasurementKey];
        const lValue = lRow.measurements[key as GarmentMeasurementKey];
        const xlValue = xlRow.measurements[key as GarmentMeasurementKey];
        if (typeof mValue !== "number" || typeof lValue !== "number" || typeof xlValue !== "number") {
          continue;
        }
        if (mValue > lValue || lValue > xlValue) {
          issues.push(`${item.id}: sizeChart must stay monotonic for ${key} across M/L/XL.`);
        }
      }
    }

    if (item.metadata.selectedSizeLabel && ["tops", "bottoms", "outerwear"].includes(item.category)) {
      const selected = rowByLabel.get(item.metadata.selectedSizeLabel);
      if (selected) {
        for (const [key, selectedValue] of Object.entries(selected.measurements)) {
          const metadataValue = item.metadata.measurements?.[key as GarmentMeasurementKey];
          if (typeof selectedValue !== "number" || typeof metadataValue !== "number") {
            continue;
          }
          const metadataMode = item.metadata.measurementModes?.[key as GarmentMeasurementKey];
          if (!metadataMode) {
            continue;
          }
          const selectedMode = selected.measurementModes?.[key as GarmentMeasurementKey];
          const normalizedSelected = normalizeMeasurementForComparison(selectedValue, selectedMode);
          const normalizedMetadata = normalizeMeasurementForComparison(metadataValue, metadataMode);
          if (Math.abs(normalizedSelected - normalizedMetadata) > 0.01) {
            issues.push(
              `${item.id}: metadata.measurements.${key} must align with selected size row ${item.metadata.selectedSizeLabel}.`,
            );
          }
        }
      }
    }
  }
  return issues;
};

export type GarmentCorrectiveTransform = {
  widthScale: number;
  depthScale: number;
  heightScale: number;
  clearanceBiasCm: number;
  offsetY: number;
};

export const computeGarmentCorrectiveTransform = (
  garment: Pick<Asset | StarterGarment, "metadata" | "category">,
  profile: BodyProfile,
): GarmentCorrectiveTransform => {
  const assessment = assessGarmentPhysicalFit(garment, profile);
  const base = assessment
    ? garment.metadata?.correctiveFit?.[assessment.overallState]
    : undefined;

  const fallbackByState: Record<GarmentFitState, GarmentCorrectiveTransform> = {
    compression: { widthScale: 0.994, depthScale: 0.992, heightScale: 0.998, clearanceBiasCm: -0.12, offsetY: 0 },
    snug: { widthScale: 0.998, depthScale: 0.998, heightScale: 1, clearanceBiasCm: -0.04, offsetY: 0 },
    regular: { widthScale: 1, depthScale: 1, heightScale: 1, clearanceBiasCm: 0, offsetY: 0 },
    relaxed: { widthScale: 1.012, depthScale: 1.01, heightScale: 1.003, clearanceBiasCm: 0.12, offsetY: 0 },
    oversized: { widthScale: 1.026, depthScale: 1.02, heightScale: 1.006, clearanceBiasCm: 0.26, offsetY: 0 },
  };

  const fallback = fallbackByState[assessment?.overallState ?? "regular"];
  const categoryMultiplier =
    garment.category === "outerwear"
      ? 1.18
      : garment.category === "bottoms"
        ? 1.06
        : garment.category === "shoes"
          ? 0.55
          : garment.category === "accessories" || garment.category === "hair"
            ? 0.24
          : 1;

  return {
    widthScale: round(((base?.widthScale ?? fallback.widthScale) - 1) * categoryMultiplier + 1),
    depthScale: round(((base?.depthScale ?? fallback.depthScale) - 1) * categoryMultiplier + 1),
    heightScale: round(base?.heightScale ?? fallback.heightScale),
    clearanceBiasCm: round((base?.clearanceBiasCm ?? fallback.clearanceBiasCm) * categoryMultiplier),
    offsetY: round(base?.offsetY ?? fallback.offsetY),
  };
};

const garmentManifestCategoryDefaults: Partial<Record<GarmentCategory, GarmentManifest["fitPolicyCategory"]>> = {
  tops: "tight_top",
  bottoms: "pants",
  outerwear: "loose_top",
  shoes: "shoes",
  accessories: "accessories",
};

export const resolveStarterGarmentFitPolicyCategory = (
  category: GarmentCategory,
): GarmentManifest["fitPolicyCategory"] | null => garmentManifestCategoryDefaults[category] ?? null;

const toCertificationRuntimeLodPaths = (value: GarmentRuntimeLodPaths | undefined) => {
  if (!value?.lod1 || !value?.lod2) {
    return undefined;
  }

  return {
    lod1: value.lod1,
    lod2: value.lod2,
  };
};

const toCertificationRuntimePaths = (
  runtime: StarterGarment["runtime"],
  authoredVariantIds: readonly AvatarRenderVariantId[],
) => {
  const modelPathByVariantEntries = authoredVariantIds.flatMap((variantId) => {
    const value = runtime.modelPathByVariant?.[variantId];
    return value ? [[variantId, value] as const] : [];
  });
  const lodModelPathsByVariantEntries = authoredVariantIds.flatMap((variantId) => {
    const value = toCertificationRuntimeLodPaths(runtime.lodModelPathsByVariant?.[variantId]);
    return value ? [[variantId, value] as const] : [];
  });

  return {
    modelPath: runtime.modelPath,
    ...(modelPathByVariantEntries.length > 0
      ? { modelPathByVariant: Object.fromEntries(modelPathByVariantEntries) }
      : {}),
    ...(toCertificationRuntimeLodPaths(runtime.lodModelPaths)
      ? { lodModelPaths: toCertificationRuntimeLodPaths(runtime.lodModelPaths) }
      : {}),
    ...(lodModelPathsByVariantEntries.length > 0
      ? { lodModelPathsByVariant: Object.fromEntries(lodModelPathsByVariantEntries) }
      : {}),
  };
};

export const buildStarterGarmentCertificationSeed = (
  item: Pick<StarterGarment, "id" | "category" | "runtime" | "metadata">,
  options: { authoredVariantIds: readonly AvatarRenderVariantId[] },
): Pick<
  GarmentCertificationReportItem,
  "id" | "category" | "fitPolicyCategory" | "selectedSizeLabel" | "sizeChartLabels" | "runtimePaths"
> | null => {
  const fitPolicyCategory = resolveStarterGarmentFitPolicyCategory(item.category);
  if (!fitPolicyCategory) {
    return null;
  }

  return {
    id: item.id,
    category: item.category,
    fitPolicyCategory,
    selectedSizeLabel: item.metadata?.selectedSizeLabel ?? null,
    sizeChartLabels: item.metadata?.sizeChart?.map((entry) => entry.label) ?? [],
    runtimePaths: toCertificationRuntimePaths(item.runtime, options.authoredVariantIds),
  };
};

const buildPublishedGarmentManifestRoot = (id: string) => `/assets/viewer-manifests/garments/${id}`;

const buildPublishedGarmentLodPath = (modelPath: string, suffix: "lod1" | "lod2") => {
  const normalized = modelPath.trim();
  if (normalized.endsWith(".glb")) {
    return normalized.replace(/\.glb$/u, `.${suffix}.glb`);
  }

  return `${normalized}.${suffix}.glb`;
};

export const buildDefaultPublishedGarmentViewerManifest = (
  item: Pick<PublishedGarmentAsset, "id" | "category" | "runtime" | "publication">,
) => {
  const fitPolicyCategory = resolveStarterGarmentFitPolicyCategory(item.category);
  if (!fitPolicyCategory) {
    return null;
  }

  const root = buildPublishedGarmentManifestRoot(item.id);

  return garmentManifestSchema.parse({
    id: item.id,
    schemaVersion: garmentManifestSchemaVersion,
    production: {
      approvalState: item.publication.approvalState ?? "DRAFT",
      approvedAt: item.publication.approvedAt,
      approvedBy: item.publication.approvedBy,
      reviewNotes: [],
      certificationNotes: item.publication.certificationNotes ?? [],
    },
    fitPolicyCategory,
    display: {
      lod0: item.runtime.modelPath,
      lod1: buildPublishedGarmentLodPath(item.runtime.modelPath, "lod1"),
      lod2: buildPublishedGarmentLodPath(item.runtime.modelPath, "lod2"),
    },
    fit: {
      fitMesh: `${root}/fit/fit_mesh.glb`,
      panelGroups: `${root}/fit/panel_groups.json`,
      seamGraph: `${root}/fit/seam_graph.json`,
      anchors: `${root}/fit/anchors.json`,
      constraints: `${root}/fit/constraints.json`,
      sizeMapping: `${root}/fit/size_mapping.json`,
      bodyMaskPolicy: `${root}/fit/body_mask_policy.json`,
      collisionPolicy: `${root}/fit/collision_policy.json`,
    },
    material: {
      visualMaterial: `${root}/material/visual_material.json`,
      physicalMaterial: `${root}/material/physical_material.json`,
    },
    textures: {
      baseColor: `${root}/textures/basecolor.ktx2`,
      normal: `${root}/textures/normal.ktx2`,
      orm: `${root}/textures/orm.ktx2`,
      detailNormal: `${root}/textures/detail_normal.ktx2`,
    },
    quality: {
      topologyReport: `${root}/quality/topology_report.json`,
      materialReport: `${root}/quality/material_report.json`,
      fitReport: `${root}/quality/fit_report.json`,
      visualReport: `${root}/quality/visual_report.json`,
      performanceReport: `${root}/quality/performance_report.json`,
      goldenFitResult: `${root}/quality/golden_fit_result.json`,
    },
  });
};

export const synchronizePublishedGarmentViewerManifest = (
  item: PublishedGarmentAsset,
  options?: { autofillMissing?: boolean },
): PublishedGarmentAsset => {
  const fallbackManifest = buildDefaultPublishedGarmentViewerManifest(item);
  const sourceManifest = item.viewerManifest ?? (options?.autofillMissing ? fallbackManifest : null);

  if (!sourceManifest) {
    return item;
  }

  const mergedManifest = garmentManifestSchema.parse({
    ...(fallbackManifest ?? sourceManifest),
    ...sourceManifest,
    id: item.id,
    schemaVersion: garmentManifestSchemaVersion,
    production: {
      ...((fallbackManifest ?? sourceManifest).production ?? {
        approvalState: item.publication.approvalState ?? "DRAFT",
        reviewNotes: [],
        certificationNotes: [],
      }),
      ...sourceManifest.production,
      approvalState: item.publication.approvalState ?? sourceManifest.production.approvalState ?? "DRAFT",
      approvedAt: item.publication.approvedAt ?? sourceManifest.production.approvedAt,
      approvedBy: item.publication.approvedBy ?? sourceManifest.production.approvedBy,
      certificationNotes: item.publication.certificationNotes ?? sourceManifest.production.certificationNotes ?? [],
    },
    display: {
      ...((fallbackManifest ?? sourceManifest).display ?? sourceManifest.display),
      ...sourceManifest.display,
      lod0: sourceManifest.display?.lod0 ?? item.runtime.modelPath,
    },
    fit: {
      ...((fallbackManifest ?? sourceManifest).fit ?? sourceManifest.fit),
      ...sourceManifest.fit,
    },
    material: {
      ...((fallbackManifest ?? sourceManifest).material ?? sourceManifest.material),
      ...sourceManifest.material,
    },
    textures: {
      ...((fallbackManifest ?? sourceManifest).textures ?? sourceManifest.textures),
      ...sourceManifest.textures,
    },
    quality: {
      ...((fallbackManifest ?? sourceManifest).quality ?? sourceManifest.quality),
      ...sourceManifest.quality,
    },
  });

  return {
    ...item,
    publication: {
      ...item.publication,
      viewerManifestVersion: mergedManifest.schemaVersion,
    },
    viewerManifest: mergedManifest,
  };
};

export const validatePublishedGarmentAsset = (item: PublishedGarmentAsset) => {
  const issues = validateRuntimeGarmentAsset(item);
  if (!item.publication) {
    issues.push(`${item.id}: publication metadata is required.`);
  }
  if (item.source !== "inventory" && item.source !== "import") {
    issues.push(`${item.id}: published runtime garments must use source='inventory' or 'import'.`);
  }
  if (item.viewerManifest) {
    const parsedViewerManifest = garmentManifestSchema.safeParse(item.viewerManifest);
    if (!parsedViewerManifest.success) {
      issues.push(...parsedViewerManifest.error.issues.map((issue) => `${item.id}: ${issue.message}`));
    } else {
      if (parsedViewerManifest.data.id !== item.id) {
        issues.push(`${item.id}: viewerManifest.id must match the published garment id.`);
      }
      if (!item.publication.viewerManifestVersion) {
        issues.push(`${item.id}: publication.viewerManifestVersion is required when viewerManifest is present.`);
      } else if (item.publication.viewerManifestVersion !== parsedViewerManifest.data.schemaVersion) {
        issues.push(`${item.id}: publication.viewerManifestVersion must match viewerManifest.schemaVersion.`);
      }

      const expectedApprovalState = item.publication.approvalState ?? "DRAFT";
      if (parsedViewerManifest.data.production.approvalState !== expectedApprovalState) {
        issues.push(`${item.id}: viewerManifest.production.approvalState must match publication.approvalState.`);
      }
    }
  }
  return issues;
};

export const validatePublishedGarmentCertificationState = (item: PublishedGarmentAsset) => {
  const issues: string[] = [];
  const approvalState = item.publication.approvalState ?? "DRAFT";
  const hasCanonicalManifestSupport = buildDefaultPublishedGarmentViewerManifest(item) !== null;

  if (hasCanonicalManifestSupport && requiresCanonicalManifestForApprovalState(approvalState)) {
    if (!item.viewerManifest) {
      issues.push(
        `${item.id}: viewerManifest is required once approvalState reaches ${approvalState}.`,
      );
    }
    if (!item.publication.viewerManifestVersion) {
      issues.push(
        `${item.id}: publication.viewerManifestVersion is required once approvalState reaches ${approvalState}.`,
      );
    }
  }

  if (requiresCertificationMetadataForApprovalState(approvalState)) {
    if (!item.publication.approvedAt) {
      issues.push(`${item.id}: publication.approvedAt is required when approvalState is ${approvalState}.`);
    }
    if (!item.publication.approvedBy) {
      issues.push(`${item.id}: publication.approvedBy is required when approvalState is ${approvalState}.`);
    }
    if (!item.publication.certificationNotes?.length) {
      issues.push(
        `${item.id}: publication.certificationNotes must contain at least one note when approvalState is ${approvalState}.`,
      );
    }
  }

  return issues;
};

export const isRuntimeGarmentAsset = (value: Asset | RuntimeGarmentAsset): value is RuntimeGarmentAsset =>
  typeof (value as RuntimeGarmentAsset).runtime === "object" &&
  Array.isArray((value as RuntimeGarmentAsset).palette);

export const computeGarmentEaseSummary = (
  garment: Pick<Asset | StarterGarment, "metadata" | "category">,
  profile: BodyProfile,
) => {
  const assessment = assessGarmentPhysicalFit(garment, profile);
  const byKey = new Map(assessment?.dimensions.map((entry) => [entry.key, entry] as const) ?? []);

  return {
    bustEaseCm: clamp(Math.round(byKey.get("chestCm")?.easeCm ?? 0), -24, 36),
    waistEaseCm: clamp(Math.round(byKey.get("waistCm")?.easeCm ?? 0), -24, 36),
    hipEaseCm: clamp(Math.round(byKey.get("hipCm")?.easeCm ?? 0), -24, 36),
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
  const height = 0.94 + avatarParams.torsoLength * 0.06;

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

export const getCatalogByCategory = (
  category: GarmentCategory | "all",
  catalog: RuntimeGarmentAsset[] = starterGarmentCatalog,
) => (category === "all" ? catalog : catalog.filter((item) => item.category === category));

export const getEquippedGarments = (
  sceneState: ClosetSceneState,
  catalog: RuntimeGarmentAsset[] = starterGarmentCatalog,
) => {
  const byId = createRuntimeGarmentLookup(catalog);
  return Object.values(sceneState.equippedItemIds)
    .map((id) => (id ? byId.get(id) ?? null : null))
    .filter((item): item is RuntimeGarmentAsset => Boolean(item));
};

export {
  defaultSkeletonProfile,
  defaultSkeletonProfileId,
  freestyleSkeletonProfiles,
} from "./skeleton-profiles.js";

export const getSurfaceBadgeTone = (source: Asset["source"]) =>
  source === "starter" ? rgba("#1d2430", 0.1) : rgba("#d2b48c", 0.16);
