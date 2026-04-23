import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  applyRuntimeMaterialCalibration,
  inferRuntimeMaterialClass,
  resolveRuntimeMaterialCalibration,
} from "./material-system.js";

test("inferRuntimeMaterialClass separates skin, hair, eyes, denim, footwear, and default cloth", () => {
  assert.equal(inferRuntimeMaterialClass("Body:skin"), "skin");
  assert.equal(inferRuntimeMaterialClass("hair_long01:mat"), "hair");
  assert.equal(inferRuntimeMaterialClass("eye_iris"), "eye");
  assert.equal(inferRuntimeMaterialClass("bottom_denim_034"), "denim");
  assert.equal(inferRuntimeMaterialClass("shoe_sole_rubber"), "rubber");
  assert.equal(inferRuntimeMaterialClass("top_soft_casual"), "cotton");
});

test("resolveRuntimeMaterialCalibration keeps avatar-only skin warmer and more reflective than dressed cloth", () => {
  const skin = resolveRuntimeMaterialCalibration({
    name: "body:skin",
    avatarOnly: true,
    qualityTier: "high",
  });
  const cloth = resolveRuntimeMaterialCalibration({
    name: "top_soft_casual",
    avatarOnly: false,
    qualityTier: "balanced",
  });

  assert.equal(skin.materialClass, "skin");
  assert.equal(skin.envMapIntensity, 1.12);
  assert.ok(skin.emissive);
  assert.equal(cloth.materialClass, "cotton");
  assert.equal(cloth.envMapIntensity, 1.04);
  assert.equal(cloth.emissive, undefined);
});

test("applyRuntimeMaterialCalibration updates standard materials without touching shared source assumptions", () => {
  const material = new THREE.MeshStandardMaterial({
    color: "#777777",
    roughness: 0.12,
    metalness: 0.4,
  });
  const calibration = resolveRuntimeMaterialCalibration({
    name: "hair_long01",
    avatarOnly: true,
    qualityTier: "balanced",
  });

  applyRuntimeMaterialCalibration(material, calibration);

  assert.equal(material.side, THREE.DoubleSide);
  assert.equal(material.transparent, false);
  assert.ok(material.roughness >= 0.18);
  assert.ok(material.metalness <= 0.08);
  assert.equal(material.alphaTest, 0.46);
});
