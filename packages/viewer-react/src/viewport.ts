import type { FreestyleViewerViewportInput } from "@freestyle/viewer-core";

export type ViewerViewportMeasurementTarget = {
  clientWidth: number;
  clientHeight: number;
};

export const measureViewerViewport = (
  element: ViewerViewportMeasurementTarget,
  devicePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
): FreestyleViewerViewportInput => ({
  widthCssPx: Math.max(1, Math.floor(element.clientWidth || 1)),
  heightCssPx: Math.max(1, Math.floor(element.clientHeight || 1)),
  devicePixelRatio,
});

export const hasViewerViewportChanged = (
  previous: FreestyleViewerViewportInput | null,
  next: FreestyleViewerViewportInput,
) =>
  previous?.widthCssPx !== next.widthCssPx ||
  previous?.heightCssPx !== next.heightCssPx ||
  previous?.devicePixelRatio !== next.devicePixelRatio;
