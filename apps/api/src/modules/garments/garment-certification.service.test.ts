import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { resolveGarmentCertificationBundlePath } from "./garment-certification.service.js";

test("resolveGarmentCertificationBundlePath defaults to the repo output bundle under the current working directory", () => {
  const previous = process.env.GARMENT_CERTIFICATION_BUNDLE_PATH;
  delete process.env.GARMENT_CERTIFICATION_BUNDLE_PATH;

  assert.equal(
    resolveGarmentCertificationBundlePath("/tmp/freestyle-repo"),
    path.join("/tmp/freestyle-repo", "output/garment-certification/latest.json"),
  );

  if (previous === undefined) {
    delete process.env.GARMENT_CERTIFICATION_BUNDLE_PATH;
  } else {
    process.env.GARMENT_CERTIFICATION_BUNDLE_PATH = previous;
  }
});

test("resolveGarmentCertificationBundlePath honors explicit environment overrides", () => {
  const previous = process.env.GARMENT_CERTIFICATION_BUNDLE_PATH;
  process.env.GARMENT_CERTIFICATION_BUNDLE_PATH = "/tmp/custom/garment-certification.json";

  assert.equal(
    resolveGarmentCertificationBundlePath("/tmp/freestyle-repo"),
    "/tmp/custom/garment-certification.json",
  );

  if (previous === undefined) {
    delete process.env.GARMENT_CERTIFICATION_BUNDLE_PATH;
  } else {
    process.env.GARMENT_CERTIFICATION_BUNDLE_PATH = previous;
  }
});
