import assert from "node:assert/strict";
import test from "node:test";
import { createStudioBackdropPalette, resolveStudioLightingRigSpec } from "./studio-lighting-rig-policy.js";

test("resolveStudioLightingRigSpec keeps avatar-only lighting warm and accented", () => {
  const spec = resolveStudioLightingRigSpec({
    avatarOnly: true,
    qualityTier: "high",
  });

  assert.equal(spec.mode, "avatar-only");
  assert.equal(spec.exposure, 1.16);
  assert.equal(spec.environmentIntensity, 0.05);
  assert.equal(spec.directional.color, "#fff9f2");
  assert.equal(spec.avatarOnlyAccent?.directionalIntensity, 0.46);
});

test("resolveStudioLightingRigSpec keeps dressed lighting neutral and non-accented", () => {
  const spec = resolveStudioLightingRigSpec({
    avatarOnly: false,
    qualityTier: "balanced",
  });

  assert.equal(spec.mode, "dressed");
  assert.equal(spec.exposure, 1.06);
  assert.equal(spec.environmentIntensity, 0.07);
  assert.equal(spec.directional.color, "#ffffff");
  assert.equal(spec.avatarOnlyAccent, null);
});

test("createStudioBackdropPalette derives stable studio colors from the base background", () => {
  const palette = createStudioBackdropPalette("#d3e2ff", true);

  assert.equal(palette.backgroundColor, "#d3e2ff");
  assert.equal(palette.fogColor, "#d5e3ff");
  assert.equal(palette.backdrop.wallColor, "#dae7ff");
  assert.equal(palette.backdrop.floorColor, "#deeaff");
  assert.equal(palette.backdrop.ringColor, "#e2ecff");
});
