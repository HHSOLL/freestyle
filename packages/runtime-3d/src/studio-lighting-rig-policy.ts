import type { QualityTier } from "@freestyle/shared-types";

export type StudioLightingRigMode = "avatar-only" | "dressed";

export type StudioLightingRigSpec = {
  mode: StudioLightingRigMode;
  environmentIntensity: number;
  exposure: number;
  ambientIntensity: number;
  hemisphere: {
    skyColor: string;
    groundColor: string;
    intensity: number;
  };
  directional: {
    intensity: number;
    color: string;
    shadowMapSize: number;
  };
  leftSpot: {
    intensity: number;
    color: string;
  };
  rightSpot: {
    intensity: number;
    color: string;
  };
  point: {
    intensity: number;
    color: string;
  };
  avatarOnlyAccent: {
    directionalIntensity: number;
    directionalColor: string;
    spotIntensity: number;
    spotColor: string;
  } | null;
};

export type StudioBackdropColors = {
  wallColor: string;
  floorColor: string;
  ringColor: string;
  orbColor: string;
};

const studioLightingRigPresets: Record<StudioLightingRigMode, Omit<StudioLightingRigSpec, "mode" | "environmentIntensity" | "exposure">> =
  {
    "avatar-only": {
      ambientIntensity: 0.4,
      hemisphere: {
        skyColor: "#fff8f1",
        groundColor: "#cabfae",
        intensity: 0.62,
      },
      directional: {
        intensity: 1.46,
        color: "#fff9f2",
        shadowMapSize: 2048,
      },
      leftSpot: {
        intensity: 0.56,
        color: "#f3e6d8",
      },
      rightSpot: {
        intensity: 0.62,
        color: "#efe2d6",
      },
      point: {
        intensity: 0.14,
        color: "#f3e6da",
      },
      avatarOnlyAccent: {
        directionalIntensity: 0.46,
        directionalColor: "#fff2e6",
        spotIntensity: 0.26,
        spotColor: "#fff7f0",
      },
    },
    dressed: {
      ambientIntensity: 0.34,
      hemisphere: {
        skyColor: "#edf2fb",
        groundColor: "#bcc5d2",
        intensity: 0.56,
      },
      directional: {
        intensity: 1.42,
        color: "#ffffff",
        shadowMapSize: 2048,
      },
      leftSpot: {
        intensity: 0.5,
        color: "#e0e8f7",
      },
      rightSpot: {
        intensity: 0.58,
        color: "#dbe3f5",
      },
      point: {
        intensity: 0.14,
        color: "#d9e2f0",
      },
      avatarOnlyAccent: null,
    },
  };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 208, g: 212, b: 219 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixRgb = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, ratio: number) => ({
  r: a.r + (b.r - a.r) * ratio,
  g: a.g + (b.g - a.g) * ratio,
  b: a.b + (b.b - a.b) * ratio,
});

export const createStudioBackdropPalette = (baseColor: string, avatarOnly: boolean) => {
  const base = hexToRgb(baseColor);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 18, g: 22, b: 28 };

  return {
    backgroundColor: baseColor,
    fogColor: rgbToHex(mixRgb(base, white, avatarOnly ? 0.04 : 0.06)),
    backdrop: {
      wallColor: rgbToHex(mixRgb(base, white, avatarOnly ? 0.16 : 0.18)),
      floorColor: rgbToHex(mixRgb(base, white, avatarOnly ? 0.26 : 0.24)),
      ringColor: rgbToHex(mixRgb(base, white, avatarOnly ? 0.34 : 0.3)),
      orbColor: rgbToHex(mixRgb(mixRgb(base, white, 0.16), black, avatarOnly ? 0.12 : 0.16)),
    },
  };
};

export const resolveStudioLightingRigSpec = ({
  avatarOnly,
  qualityTier,
}: {
  avatarOnly: boolean;
  qualityTier: QualityTier;
}): StudioLightingRigSpec => {
  const mode: StudioLightingRigMode = avatarOnly ? "avatar-only" : "dressed";
  const preset = studioLightingRigPresets[mode];

  return {
    mode,
    environmentIntensity: avatarOnly ? (qualityTier === "high" ? 0.05 : 0.04) : qualityTier === "high" ? 0.08 : 0.07,
    exposure: avatarOnly ? (qualityTier === "high" ? 1.16 : 1.1) : qualityTier === "high" ? 1.12 : 1.06,
    ...preset,
  };
};
