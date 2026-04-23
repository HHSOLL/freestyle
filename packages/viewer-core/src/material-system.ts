import { ColorRepresentation, MeshPhysicalMaterial } from "three";

export type ViewerMaterialClass =
  | "skin"
  | "hair"
  | "cotton"
  | "denim"
  | "leather"
  | "rubber"
  | "knit"
  | "silk"
  | "synthetic"
  | "metal"
  | "plastic";

export type ViewerMaterialPreset = {
  color: ColorRepresentation;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenRoughness?: number;
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
};

export const viewerMaterialPresets: Record<ViewerMaterialClass, ViewerMaterialPreset> = {
  skin: {
    color: "#dfb199",
    roughness: 0.78,
    metalness: 0.02,
    clearcoat: 0.02,
    clearcoatRoughness: 0.88,
    sheen: 0.08,
    sheenRoughness: 0.92,
  },
  hair: {
    color: "#4c3e36",
    roughness: 0.38,
    metalness: 0.04,
    clearcoat: 0.08,
    clearcoatRoughness: 0.34,
  },
  cotton: {
    color: "#7b8fa4",
    roughness: 0.78,
    metalness: 0.04,
    sheen: 0.18,
    sheenRoughness: 0.9,
  },
  denim: {
    color: "#536d8d",
    roughness: 0.72,
    metalness: 0.05,
    sheen: 0.12,
    sheenRoughness: 0.86,
  },
  leather: {
    color: "#6b4e44",
    roughness: 0.46,
    metalness: 0.08,
    clearcoat: 0.22,
    clearcoatRoughness: 0.36,
  },
  rubber: {
    color: "#4a5560",
    roughness: 0.9,
    metalness: 0.02,
  },
  knit: {
    color: "#8b6d7e",
    roughness: 0.82,
    metalness: 0.03,
    sheen: 0.26,
    sheenRoughness: 0.88,
  },
  silk: {
    color: "#d2c1cf",
    roughness: 0.34,
    metalness: 0.04,
    sheen: 0.62,
    sheenRoughness: 0.28,
  },
  synthetic: {
    color: "#6e7287",
    roughness: 0.58,
    metalness: 0.06,
    sheen: 0.14,
    sheenRoughness: 0.64,
  },
  metal: {
    color: "#a9acb7",
    roughness: 0.24,
    metalness: 0.92,
  },
  plastic: {
    color: "#c6ccd4",
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.14,
    clearcoatRoughness: 0.3,
  },
};

const highlightedMaterialModifiers = {
  clearcoat: 0.08,
  emissive: "#d7e5ff",
  emissiveIntensity: 0.32,
} as const;

export const resolveProxyMaterialClass = (garmentId: string, kind: string): ViewerMaterialClass => {
  const normalized = garmentId.toLowerCase();

  if (kind === "hair") return "hair";
  if (kind === "shoes") {
    if (normalized.includes("leather") || normalized.includes("boot")) return "leather";
    if (normalized.includes("sandal") || normalized.includes("flat") || normalized.includes("soft")) return "rubber";
    return "plastic";
  }
  if (kind === "accessory") {
    if (normalized.includes("metal")) return "metal";
    return "plastic";
  }
  if (normalized.includes("denim")) return "denim";
  if (normalized.includes("leather")) return "leather";
  if (normalized.includes("knit")) return "knit";
  if (normalized.includes("silk")) return "silk";
  if (normalized.includes("synthetic") || normalized.includes("nylon")) return "synthetic";
  if (kind === "outerwear") return "synthetic";
  return "cotton";
};

export const createViewerMaterial = (
  materialClass: ViewerMaterialClass,
  options?: {
    color?: ColorRepresentation;
    highlighted?: boolean;
  },
) => {
  const preset = viewerMaterialPresets[materialClass];
  const highlighted = options?.highlighted === true;

  return new MeshPhysicalMaterial({
    color: options?.color ?? preset.color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    ...((preset.clearcoat ?? 0) > 0 || highlighted
      ? {
          clearcoat: (preset.clearcoat ?? 0) + (highlighted ? highlightedMaterialModifiers.clearcoat : 0),
        }
      : {}),
    ...(typeof preset.clearcoatRoughness === "number" ? { clearcoatRoughness: preset.clearcoatRoughness } : {}),
    ...(typeof preset.sheen === "number" ? { sheen: preset.sheen } : {}),
    ...(typeof preset.sheenRoughness === "number" ? { sheenRoughness: preset.sheenRoughness } : {}),
    ...(highlighted || preset.emissive ? { emissive: highlighted ? highlightedMaterialModifiers.emissive : preset.emissive } : {}),
    ...(highlighted || typeof preset.emissiveIntensity === "number"
      ? { emissiveIntensity: highlighted ? highlightedMaterialModifiers.emissiveIntensity : preset.emissiveIntensity }
      : {}),
  });
};

export const createViewerSkinMaterial = (tone: ColorRepresentation) =>
  createViewerMaterial("skin", {
    color: tone,
  });
