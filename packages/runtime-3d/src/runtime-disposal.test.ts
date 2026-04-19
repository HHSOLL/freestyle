import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { disposeRuntimeOwnedMaterials, ensureRuntimeOwnedMaterials } from "./runtime-disposal.js";

test("ensureRuntimeOwnedMaterials clones runtime materials only once per mesh", () => {
  const original = new THREE.MeshStandardMaterial({ color: "#888888" });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), original);

  ensureRuntimeOwnedMaterials(mesh);
  const preparedMaterial = mesh.material as THREE.Material;

  assert.notEqual(preparedMaterial, original);

  ensureRuntimeOwnedMaterials(mesh);
  assert.equal(mesh.material, preparedMaterial);
});

test("disposeRuntimeOwnedMaterials disposes prepared cloned materials and leaves shared source materials alone", () => {
  const sourceMaterial = new THREE.MeshStandardMaterial({ color: "#999999" });
  const sourceDisposeEvents: string[] = [];
  sourceMaterial.addEventListener("dispose", () => {
    sourceDisposeEvents.push("source");
  });

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial);
  ensureRuntimeOwnedMaterials(mesh);
  const preparedMaterial = mesh.material as THREE.Material;
  const preparedDisposeEvents: string[] = [];
  preparedMaterial.addEventListener("dispose", () => {
    preparedDisposeEvents.push("prepared");
  });

  disposeRuntimeOwnedMaterials(mesh);

  assert.equal(preparedDisposeEvents.length, 1);
  assert.equal(sourceDisposeEvents.length, 0);
});

test("disposeRuntimeOwnedMaterials handles multi-material meshes", () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [
    new THREE.MeshStandardMaterial({ color: "#333333" }),
    new THREE.MeshStandardMaterial({ color: "#666666" }),
  ]);

  ensureRuntimeOwnedMaterials(mesh);
  const preparedMaterials = mesh.material as THREE.Material[];
  const disposeEvents: string[] = [];
  preparedMaterials.forEach((material, index) => {
    material.addEventListener("dispose", () => {
      disposeEvents.push(`material-${index}`);
    });
  });

  disposeRuntimeOwnedMaterials(mesh);

  assert.deepEqual(disposeEvents, ["material-0", "material-1"]);
});
