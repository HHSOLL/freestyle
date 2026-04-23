import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBodyProfile } from "@freestyle/contracts";
import { getPublishedRuntimeAvatarCatalogItemById } from "@freestyle/runtime-3d/avatar-publication-catalog";
import { resolvePublishedAvatarSimulationInput } from "./fit-simulations.service.js";

test("resolvePublishedAvatarSimulationInput uses the published runtime avatar catalog", () => {
  const profile = normalizeBodyProfile({
    gender: "female",
    bodyFrame: "balanced",
    simple: {
      heightCm: 172,
      shoulderCm: 44,
      chestCm: 91,
      waistCm: 74,
      hipCm: 95,
      inseamCm: 79,
    },
  });

  const resolved = resolvePublishedAvatarSimulationInput(profile);
  const publishedAvatar = getPublishedRuntimeAvatarCatalogItemById("female-base");

  assert.ok(publishedAvatar);
  assert.equal(resolved.avatarVariantId, publishedAvatar.id);
  assert.equal(
    resolved.avatarManifestUrl,
    new URL(publishedAvatar.modelPath, "https://freestyle.local").toString(),
  );
});
