import assert from "node:assert/strict";
import test from "node:test";
import { MeshPhysicalMaterial } from "three";
import { createViewerMaterial, resolveProxyMaterialClass } from "./material-system.js";
import { inferProxyGarmentKind, resolveProxyCameraOrbit, viewerProxyOrbitLimits, viewerProxyPolarLimits } from "./proxy-stage.js";

test("inferProxyGarmentKind classifies common starter garment ids", () => {
  assert.equal(inferProxyGarmentKind("starter-hair-long-wave"), "hair");
  assert.equal(inferProxyGarmentKind("starter-top-soft-casual"), "top");
  assert.equal(inferProxyGarmentKind("starter-outer-tailored-layer"), "outerwear");
  assert.equal(inferProxyGarmentKind("starter-bottom-denim-034"), "bottom");
  assert.equal(inferProxyGarmentKind("starter-shoe-soft-day"), "shoes");
  assert.equal(inferProxyGarmentKind("starter-accessory-city-bucket-hat"), "accessory");
  assert.equal(inferProxyGarmentKind("mystery-item"), "unknown");
});

test("resolveProxyCameraOrbit keeps preset camera states explicit", () => {
  assert.deepEqual(resolveProxyCameraOrbit("full-body-front"), {
    radius: 6.8,
    polar: 1.04,
    azimuth: 0,
    targetY: 1.3,
  });
  assert.deepEqual(resolveProxyCameraOrbit("full-body-three-quarter"), {
    radius: 7.1,
    polar: 1.02,
    azimuth: -0.52,
    targetY: 1.28,
  });
  assert.deepEqual(resolveProxyCameraOrbit("full-body-front-tight"), {
    radius: 5.7,
    polar: 1.08,
    azimuth: 0,
    targetY: 1.34,
  });
});

test("proxy control limits stay bounded for pointer orbit input", () => {
  assert.deepEqual(viewerProxyOrbitLimits, {
    min: 2.1,
    max: 5.8,
  });
  assert.deepEqual(viewerProxyPolarLimits, {
    min: 0.55,
    max: 1.45,
  });
});

test("resolveProxyMaterialClass separates hair, fabrics, and footwear families", () => {
  assert.equal(resolveProxyMaterialClass("starter-hair-long-fall", "hair"), "hair");
  assert.equal(resolveProxyMaterialClass("starter-bottom-denim-034", "bottom"), "denim");
  assert.equal(resolveProxyMaterialClass("starter-top-knit-soft", "top"), "knit");
  assert.equal(resolveProxyMaterialClass("starter-shoe-soft-day", "shoes"), "rubber");
  assert.equal(resolveProxyMaterialClass("starter-boot-leather-city", "shoes"), "leather");
});

test("createViewerMaterial returns a physical material with highlighted finish support", () => {
  const material = createViewerMaterial("leather", { highlighted: true });

  assert.ok(material instanceof MeshPhysicalMaterial);
  assert.ok(material.clearcoat > 0.2);
  assert.ok(material.emissiveIntensity > 0);
});
