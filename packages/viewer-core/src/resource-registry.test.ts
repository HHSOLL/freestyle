import assert from "node:assert/strict";
import test from "node:test";
import { createResourceRegistry } from "./resource-registry.js";

test("ResourceRegistry tracks owners and blocks disposal while referenced", () => {
  let disposed = 0;
  const registry = createResourceRegistry({ now: () => 1 });

  registry.register({
    id: "texture:denim-basecolor",
    kind: "texture",
    byteSize: 12,
    dispose: () => {
      disposed += 1;
    },
  });

  registry.acquire("texture:denim-basecolor", "garment:denim-skirt");
  assert.deepEqual(registry.snapshot(), {
    resources: [
      {
        id: "texture:denim-basecolor",
        kind: "texture",
        refCount: 1,
        byteSize: 12,
        lastTouchedAt: 1,
        disposed: false,
        owners: ["garment:denim-skirt"],
      },
    ],
    totalBytes: 12,
    retainedBytes: 12,
    releasableBytes: 0,
    unreleasedCount: 1,
  });

  assert.throws(() => registry.dispose("texture:denim-basecolor"), /active references/);
  registry.release("texture:denim-basecolor", "garment:denim-skirt");
  assert.equal(registry.dispose("texture:denim-basecolor"), true);
  assert.equal(disposed, 1);
  assert.equal(registry.get("texture:denim-basecolor"), null);
});

test("ResourceRegistry evicts only unreferenced resources by LRU order", () => {
  let tick = 0;
  const disposed: string[] = [];
  const registry = createResourceRegistry({
    now: () => {
      tick += 1;
      return tick;
    },
  });

  registry.register({
    id: "geometry:old",
    kind: "geometry",
    byteSize: 50,
    dispose: () => disposed.push("geometry:old"),
  });
  registry.register({
    id: "texture:hot",
    kind: "texture",
    byteSize: 40,
    dispose: () => disposed.push("texture:hot"),
  });
  registry.register({
    id: "material:warm",
    kind: "material",
    byteSize: 30,
    dispose: () => disposed.push("material:warm"),
  });

  registry.acquire("texture:hot", "current-outfit");
  registry.release("texture:hot", "current-outfit");
  registry.acquire("material:warm", "current-outfit");

  assert.deepEqual(registry.evictLRU(70), ["geometry:old"]);
  assert.deepEqual(disposed, ["geometry:old"]);
  assert.equal(registry.snapshot().totalBytes, 70);

  assert.deepEqual(registry.evictLRU(0), ["texture:hot"]);
  assert.equal(registry.get("material:warm")?.refCount, 1);
});

test("ResourceRegistry fails closed on unknown owners and duplicate registrations", () => {
  const registry = createResourceRegistry();
  registry.register({ id: "decoder:meshopt", kind: "decoder" });
  registry.acquire("decoder:meshopt", "loader-registry");

  assert.throws(() => registry.register({ id: "decoder:meshopt", kind: "decoder" }), /already registered/);
  assert.throws(() => registry.release("decoder:meshopt", "wrong-owner"), /not owned/);
  assert.throws(() => registry.release("unknown", "loader-registry"), /not registered/);
});
