import test from "node:test";
import assert from "node:assert/strict";
import { legacyRedirects } from "../../route-map.mjs";
import { primaryNavigation, resolveSurfaceFromPath } from "./product-routes.js";

test("primary navigation exposes the four app surfaces in order", () => {
  assert.deepEqual(
    primaryNavigation.map((item) => item.id),
    ["closet", "canvas", "community", "profile"],
  );
});

test("route smoke maps app URLs to the expected product surfaces", () => {
  assert.equal(resolveSurfaceFromPath("/app/closet"), "closet");
  assert.equal(resolveSurfaceFromPath("/app/fitting"), "closet");
  assert.equal(resolveSurfaceFromPath("/app/canvas/look-1"), "canvas");
  assert.equal(resolveSurfaceFromPath("/app/community"), "community");
  assert.equal(resolveSurfaceFromPath("/app/discover"), "community");
  assert.equal(resolveSurfaceFromPath("/app/profile"), "profile");
});

test("legacy routes are isolated away from the main product IA", () => {
  const redirectTargets = new Map(legacyRedirects.map((entry) => [entry.source, entry.destination]));

  assert.equal(redirectTargets.get("/studio"), "/app/closet");
  assert.equal(redirectTargets.get("/app/fitting"), "/app/closet");
  assert.equal(redirectTargets.get("/trends"), "/app/community");
  assert.equal(redirectTargets.get("/examples"), "/app/community");
  assert.equal(redirectTargets.get("/app/journal"), "/app/profile");
});
