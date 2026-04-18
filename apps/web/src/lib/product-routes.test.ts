import test from "node:test";
import assert from "node:assert/strict";
import { legacyRedirects, primaryNavItems } from "../../route-map.mjs";
import { primaryNavigation, resolveSurfaceFromPath } from "./product-routes.js";

const materializePathPattern = (pattern: string) => pattern.replace(/:[^/]+/g, "sample");

test("primary navigation exposes the four app surfaces in order", () => {
  assert.deepEqual(primaryNavigation, primaryNavItems);
});

test("route smoke maps app URLs to the expected product surfaces", () => {
  assert.equal(resolveSurfaceFromPath("/app/closet"), "closet");
  assert.equal(resolveSurfaceFromPath("/app/fitting"), "closet");
  assert.equal(resolveSurfaceFromPath("/app/canvas/look-1"), "canvas");
  assert.equal(resolveSurfaceFromPath("/app/community"), "community");
  assert.equal(resolveSurfaceFromPath("/app/discover"), "community");
  assert.equal(resolveSurfaceFromPath("/app/profile"), "profile");
  assert.equal(resolveSurfaceFromPath("/app/lab"), null);
  assert.equal(resolveSurfaceFromPath("/app"), null);
  assert.equal(resolveSurfaceFromPath("/unexpected/path"), null);
});

test("compatibility redirects resolve to the same surface as their route-map destination", () => {
  for (const entry of legacyRedirects) {
    const expectedSurface = resolveSurfaceFromPath(entry.destination);
    assert.notEqual(expectedSurface, null, `redirect destination ${entry.destination} must resolve to a product surface`);

    assert.equal(
      resolveSurfaceFromPath(materializePathPattern(entry.source)),
      expectedSurface,
      `redirect source ${entry.source} should resolve to ${expectedSurface}`,
    );
  }
});
