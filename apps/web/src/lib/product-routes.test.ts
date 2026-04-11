import test from "node:test";
import assert from "node:assert/strict";
import { legacyRedirects } from "../../route-map.mjs";
import { primaryNavigation, resolveSurfaceFromPath } from "./product-routes.js";

test("primary navigation exposes the five product surfaces in order", () => {
  assert.deepEqual(
    primaryNavigation.map((item) => item.id),
    ["closet", "fitting", "canvas", "discover", "profile"],
  );
});

test("route smoke maps app URLs to the expected product surfaces", () => {
  assert.equal(resolveSurfaceFromPath("/app/closet"), "closet");
  assert.equal(resolveSurfaceFromPath("/app/fitting"), "fitting");
  assert.equal(resolveSurfaceFromPath("/app/canvas/look-1"), "canvas");
  assert.equal(resolveSurfaceFromPath("/app/discover"), "discover");
  assert.equal(resolveSurfaceFromPath("/app/profile"), "profile");
});

test("legacy routes are isolated away from the main product IA", () => {
  const redirectTargets = new Map(legacyRedirects.map((entry) => [entry.source, entry.destination]));

  assert.equal(redirectTargets.get("/studio"), "/app/fitting");
  assert.equal(redirectTargets.get("/trends"), "/app/discover");
  assert.equal(redirectTargets.get("/examples"), "/app/discover");
  assert.equal(redirectTargets.get("/app/journal"), "/app/profile");
});
