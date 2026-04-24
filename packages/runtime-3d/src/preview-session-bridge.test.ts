import assert from "node:assert/strict";
import test from "node:test";
import { starterGarmentCatalog } from "@freestyle/domain-garment";
import { defaultBodyProfile } from "@freestyle/shared-types";
import {
  buildRuntimePreviewBodySignature,
  buildRuntimePreviewCollisionBody,
  buildRuntimePreviewFitMesh,
  buildRuntimePreviewMaterialProfile,
  buildRuntimePreviewWorkerSetupMessages,
  buildRuntimePreviewXpbdFitMesh,
} from "./preview-session-bridge.js";

test("preview session bridge builds a canonical body signature from body profile", () => {
  const signature = buildRuntimePreviewBodySignature(defaultBodyProfile);

  assert.equal(signature.version, "body-signature.v1");
  assert.equal(signature.measurements.heightCm, defaultBodyProfile.simple.heightCm);
  assert.equal(typeof signature.hash, "string");
  assert.ok(signature.hash.length > 0);
});

test("preview session bridge derives collision, fit mesh, and material inputs for runtime garments", () => {
  const item = starterGarmentCatalog.find((entry) => entry.id === "starter-top-soft-casual");
  assert.ok(item);

  const bodySignature = buildRuntimePreviewBodySignature(defaultBodyProfile);
  const collisionBody = buildRuntimePreviewCollisionBody({
    avatarVariantId: "female-base",
    bodyProfile: defaultBodyProfile,
    bodySignature,
  });
  const fitMesh = buildRuntimePreviewFitMesh({
    item,
    avatarVariantId: "female-base",
  });
  const materialProfile = buildRuntimePreviewMaterialProfile(item);
  const xpbdFitMesh = buildRuntimePreviewXpbdFitMesh({
    item,
    bodyProfile: defaultBodyProfile,
  });

  assert.equal(collisionBody.schemaVersion, "preview-body-collision.v1");
  assert.equal(collisionBody.avatarId, "female-base");
  assert.ok(collisionBody.colliders.length >= 3);
  assert.equal(fitMesh.runtimeStarterId, "starter-top-soft-casual");
  assert.equal(
    fitMesh.meshRelativePathByVariant["female-base"],
    "apps/web/public/assets/garments/mpfb/female/top_soft_casual_v4.glb",
  );
  assert.equal(materialProfile.runtimeStarterId, "starter-top-soft-casual");
  assert.equal(materialProfile.intendedUse, "solver-authoring");
  assert.equal(xpbdFitMesh.schemaVersion, "preview-xpbd-fit-mesh.v1");
  assert.equal(xpbdFitMesh.positions.length % 3, 0);
  assert.equal(xpbdFitMesh.inverseMasses.length, xpbdFitMesh.positions.length / 3);
  assert.ok(xpbdFitMesh.constraints.some((constraint) => constraint.kind === "pin"));
  assert.ok(xpbdFitMesh.constraints.some((constraint) => constraint.kind === "sphere-collision"));
});

test("preview session bridge emits protocol setup messages in solver bootstrap order", () => {
  const item = starterGarmentCatalog.find((entry) => entry.id === "starter-top-soft-casual");
  assert.ok(item);

  const setup = buildRuntimePreviewWorkerSetupMessages({
    avatarVariantId: "female-base",
    bodyProfile: defaultBodyProfile,
    item,
  });

  assert.equal(setup.messages[0]?.type, "INIT_SOLVER");
  assert.equal(setup.messages[1]?.type, "SET_BODY_SIGNATURE");
  assert.equal(setup.messages[2]?.type, "SET_COLLISION_BODY");
  assert.equal(setup.messages[3]?.type, "SET_GARMENT_FIT_MESH");
  assert.equal(setup.messages[4]?.type, "SET_MATERIAL_PHYSICS");
  assert.equal(setup.bodySignature.hash, setup.messages[1]?.bodySignature.hash);
  assert.equal(setup.messages[3]?.xpbdFitMesh?.schemaVersion, "preview-xpbd-fit-mesh.v1");
});
