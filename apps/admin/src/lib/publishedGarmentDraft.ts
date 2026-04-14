import type {
  AssetCategory,
  AvatarAnchorId,
  GarmentCollisionZone,
  GarmentMeasurementKey,
  GarmentMeasurementMode,
  GarmentPublicationRecord,
  GarmentSizeSpec,
  PublishedGarmentAsset,
} from "@freestyle/shared-types";

export const DRAFT_SELECTION_ID = "__draft__";

export const CATEGORY_FILTERS: Array<{ id: AssetCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "outerwear", label: "Outerwear" },
  { id: "shoes", label: "Shoes" },
  { id: "accessories", label: "Accessories" },
  { id: "hair", label: "Hair" },
];

export const EDITABLE_CATEGORY_OPTIONS: Array<{ id: AssetCategory; label: string }> = [
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "outerwear", label: "Outerwear" },
  { id: "shoes", label: "Shoes" },
  { id: "accessories", label: "Accessories" },
  { id: "hair", label: "Hair" },
  { id: "custom", label: "Custom" },
];

export const SOURCE_FILTERS: Array<{ id: GarmentPublicationRecord["sourceSystem"] | "all"; label: string }> = [
  { id: "all", label: "All Sources" },
  { id: "admin-domain", label: "Admin Domain" },
  { id: "starter-catalog", label: "Starter" },
  { id: "api-published", label: "API Published" },
];

export const PUBLISHED_SOURCE_OPTIONS: Array<{ id: PublishedGarmentAsset["source"]; label: string }> = [
  { id: "inventory", label: "Inventory" },
  { id: "import", label: "Import" },
];

export const PUBLICATION_SOURCE_OPTIONS: Array<{ id: GarmentPublicationRecord["sourceSystem"]; label: string }> = [
  { id: "admin-domain", label: "Admin Domain" },
  { id: "api-published", label: "API Published" },
  { id: "starter-catalog", label: "Starter Catalog" },
];

export const SIZE_SOURCE_OPTIONS: Array<{ id: NonNullable<GarmentSizeSpec["source"]>; label: string }> = [
  { id: "product-detail", label: "Product Detail" },
  { id: "authoring", label: "Authoring" },
  { id: "estimated", label: "Estimated" },
];

export const COLLISION_ZONE_OPTIONS: Array<{ id: GarmentCollisionZone; label: string }> = [
  { id: "torso", label: "Torso" },
  { id: "arms", label: "Arms" },
  { id: "hips", label: "Hips" },
  { id: "legs", label: "Legs" },
  { id: "feet", label: "Feet" },
];

export const MEASUREMENT_MODE_OPTIONS: Array<{ id: GarmentMeasurementMode; label: string }> = [
  { id: "body-circumference", label: "Body Circ." },
  { id: "flat-half-circumference", label: "Flat Half" },
  { id: "linear-length", label: "Linear" },
];

export const MEASUREMENT_LABELS: Record<GarmentMeasurementKey, string> = {
  chestCm: "Chest",
  waistCm: "Waist",
  hipCm: "Hip",
  headCircumferenceCm: "Head Circ.",
  frameWidthCm: "Frame Width",
  shoulderCm: "Shoulder",
  sleeveLengthCm: "Sleeve",
  lengthCm: "Length",
  inseamCm: "Inseam",
  riseCm: "Rise",
  hemCm: "Hem",
};

const MEASUREMENT_KEYS_BY_CATEGORY: Record<AssetCategory, GarmentMeasurementKey[]> = {
  tops: ["chestCm", "shoulderCm", "sleeveLengthCm", "lengthCm", "hemCm"],
  bottoms: ["waistCm", "hipCm", "riseCm", "inseamCm", "hemCm"],
  outerwear: ["chestCm", "shoulderCm", "sleeveLengthCm", "lengthCm", "hemCm"],
  shoes: ["lengthCm", "hemCm"],
  accessories: ["headCircumferenceCm", "frameWidthCm"],
  hair: ["headCircumferenceCm"],
  custom: ["chestCm", "waistCm", "hipCm", "shoulderCm", "lengthCm"],
};

const DEFAULT_MEASUREMENT_VALUES: Record<GarmentMeasurementKey, number> = {
  chestCm: 56,
  waistCm: 41,
  hipCm: 55,
  headCircumferenceCm: 58,
  frameWidthCm: 14.5,
  shoulderCm: 49,
  sleeveLengthCm: 22,
  lengthCm: 68,
  inseamCm: 76,
  riseCm: 31,
  hemCm: 24,
};

const DEFAULT_MEASUREMENT_MODES: Record<GarmentMeasurementKey, GarmentMeasurementMode> = {
  chestCm: "flat-half-circumference",
  waistCm: "flat-half-circumference",
  hipCm: "flat-half-circumference",
  headCircumferenceCm: "body-circumference",
  frameWidthCm: "linear-length",
  shoulderCm: "linear-length",
  sleeveLengthCm: "linear-length",
  lengthCm: "linear-length",
  inseamCm: "linear-length",
  riseCm: "linear-length",
  hemCm: "linear-length",
};

const DEFAULT_ANCHOR_BINDINGS: Record<AssetCategory, AvatarAnchorId[]> = {
  tops: ["leftShoulder", "rightShoulder", "chestCenter", "waistCenter"],
  bottoms: ["waistCenter", "hipCenter", "leftKnee", "rightKnee"],
  outerwear: ["leftShoulder", "rightShoulder", "chestCenter", "waistCenter"],
  shoes: ["leftFoot", "rightFoot", "leftAnkle", "rightAnkle"],
  accessories: ["headCenter", "leftTemple", "rightTemple", "foreheadCenter"],
  hair: ["headCenter", "leftTemple", "rightTemple", "foreheadCenter"],
  custom: ["chestCenter", "waistCenter", "hipCenter"],
};

const DEFAULT_COLLISION_ZONES: Record<AssetCategory, GarmentCollisionZone[]> = {
  tops: ["torso", "arms"],
  bottoms: ["hips", "legs"],
  outerwear: ["torso", "arms"],
  shoes: ["feet"],
  accessories: [],
  hair: [],
  custom: ["torso"],
};

const DEFAULT_BODY_MASK_ZONES: Record<AssetCategory, GarmentCollisionZone[]> = {
  tops: ["torso"],
  bottoms: ["hips", "legs"],
  outerwear: ["torso", "arms"],
  shoes: ["feet"],
  accessories: [],
  hair: [],
  custom: [],
};

export const getMeasurementKeysForCategory = (category: AssetCategory) =>
  MEASUREMENT_KEYS_BY_CATEGORY[category] ?? MEASUREMENT_KEYS_BY_CATEGORY.custom;

export const getDefaultMeasurements = (category: AssetCategory) => {
  const next: Partial<Record<GarmentMeasurementKey, number>> = {};
  getMeasurementKeysForCategory(category).forEach((key) => {
    next[key] = DEFAULT_MEASUREMENT_VALUES[key];
  });
  return next;
};

export const getDefaultMeasurementModes = (category: AssetCategory) => {
  const next: Partial<Record<GarmentMeasurementKey, GarmentMeasurementMode>> = {};
  getMeasurementKeysForCategory(category).forEach((key) => {
    next[key] = DEFAULT_MEASUREMENT_MODES[key];
  });
  return next;
};

export const createDefaultSizeRow = (category: AssetCategory, label = "M"): GarmentSizeSpec => ({
  label,
  measurements: getDefaultMeasurements(category),
  measurementModes: getDefaultMeasurementModes(category),
  source: "product-detail",
  notes: "Entered from product-detail size chart.",
});

const createDefaultRuntime = (category: AssetCategory, id: string) => ({
  modelPath: `/assets/garments/partners/${id}.glb`,
  skeletonProfileId: "freestyle-humanoid-v1",
  anchorBindings: DEFAULT_ANCHOR_BINDINGS[category].map((anchorId) => ({ id: anchorId, weight: 0.25 })),
  collisionZones: DEFAULT_COLLISION_ZONES[category],
  bodyMaskZones: DEFAULT_BODY_MASK_ZONES[category],
  surfaceClearanceCm: category === "accessories" ? 0.3 : category === "hair" ? 0.16 : category === "outerwear" ? 1.6 : 1.1,
  renderPriority: category === "outerwear" ? 3 : category === "accessories" ? 4 : category === "hair" ? 2 : 2,
});

export const buildBlankPublishedGarment = (category: AssetCategory = "tops"): PublishedGarmentAsset => {
  const id = `partner-${category}-new`;
  const sizeRow = createDefaultSizeRow(category);
  return {
    id,
    name: "New Garment",
    imageSrc: `/assets/garments/partners/${id}.png`,
    category,
    brand: "Partner Sample",
    source: "inventory",
    sourceUrl: "https://partner.example.com/products/new-garment",
    metadata: {
      measurements: { ...sizeRow.measurements },
      measurementModes: { ...sizeRow.measurementModes },
      sizeChart: [sizeRow],
      selectedSizeLabel: sizeRow.label,
      physicalProfile: {
        materialStretchRatio: 0.06,
        maxComfortStretchRatio: 0.03,
      },
      fitProfile: {
        silhouette: category === "outerwear" ? "relaxed" : "regular",
        layer: category === "outerwear" ? "outer" : category === "accessories" || category === "shoes" || category === "hair" ? "base" : "base",
        structure: category === "outerwear" ? "structured" : "balanced",
        stretch: 0.08,
        drape: 0.18,
      },
      dominantColor: "#d8d7d3",
    },
    runtime: createDefaultRuntime(category, id),
    palette: ["#d8d7d3", "#6e6b66", "#191c23"],
    publication: {
      sourceSystem: "admin-domain",
      publishedAt: new Date().toISOString(),
      assetVersion: `${id}@1.0.0`,
      measurementStandard: "body-garment-v1",
      provenanceUrl: "https://partner.example.com/garments/new-garment",
    },
  };
};

export const sortPublishedGarments = (items: PublishedGarmentAsset[]) =>
  [...items].sort((left, right) => right.publication.publishedAt.localeCompare(left.publication.publishedAt));

export const duplicateSizeRow = (row: GarmentSizeSpec | undefined, category: AssetCategory, label: string): GarmentSizeSpec => {
  if (!row) {
    return createDefaultSizeRow(category, label);
  }

  return {
    ...row,
    label,
    measurements: { ...row.measurements },
    measurementModes: row.measurementModes ? { ...row.measurementModes } : getDefaultMeasurementModes(category),
  };
};

export const normalizeDraftForCategory = (item: PublishedGarmentAsset, category: AssetCategory) => {
  const sizeChart = item.metadata?.sizeChart?.length
    ? item.metadata.sizeChart.map((row) => ({
        ...row,
        measurementModes: row.measurementModes ?? getDefaultMeasurementModes(category),
      }))
    : [createDefaultSizeRow(category)];
  const selectedSizeLabel = item.metadata?.selectedSizeLabel ?? sizeChart[0]?.label ?? "M";
  const activeRow = sizeChart.find((row) => row.label === selectedSizeLabel) ?? sizeChart[0];

  return {
    ...item,
    category,
    metadata: {
      ...item.metadata,
      measurements: activeRow?.measurements ? { ...activeRow.measurements } : getDefaultMeasurements(category),
      measurementModes: activeRow?.measurementModes ? { ...activeRow.measurementModes } : getDefaultMeasurementModes(category),
      sizeChart,
      selectedSizeLabel,
    },
    runtime: {
      ...item.runtime,
      skeletonProfileId: item.runtime.skeletonProfileId || "freestyle-humanoid-v1",
      anchorBindings:
        item.runtime.anchorBindings?.length
          ? item.runtime.anchorBindings
          : createDefaultRuntime(category, item.id).anchorBindings,
      collisionZones:
        item.runtime.collisionZones?.length
          ? item.runtime.collisionZones
          : createDefaultRuntime(category, item.id).collisionZones,
      bodyMaskZones:
        item.runtime.bodyMaskZones?.length
          ? item.runtime.bodyMaskZones
          : createDefaultRuntime(category, item.id).bodyMaskZones,
    },
  };
};
