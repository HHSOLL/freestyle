import assert from "node:assert/strict";
import test from "node:test";
import { runtimeAvatarRenderManifestSchemaVersion } from "@freestyle/shared-types";
import { publishedRuntimeAvatarCatalogItemSchema } from "@freestyle/contracts";
import {
  avatarPublicationCatalogMetadata,
  publishedRuntimeAvatarCatalog,
} from "./avatar-publication-catalog.js";
import { resolveAvatarRuntimeModelPath } from "./avatar-manifest.js";

test("avatar publication catalog stays in parity with runtime avatar model resolution", () => {
  assert.equal(avatarPublicationCatalogMetadata.schemaVersion, "avatar-publication-catalog.v1");
  assert.equal(publishedRuntimeAvatarCatalog.length, 2);

  for (const item of publishedRuntimeAvatarCatalog) {
    const parsed = publishedRuntimeAvatarCatalogItemSchema.parse(item);
    assert.equal(parsed.publication.runtimeManifestVersion, runtimeAvatarRenderManifestSchemaVersion);
    assert.equal(parsed.publication.approvalState, "PUBLISHED");
    assert.equal(parsed.modelPath, resolveAvatarRuntimeModelPath(parsed.id, "high"));
    assert.equal(parsed.lodModelPaths?.lod1, resolveAvatarRuntimeModelPath(parsed.id, "balanced"));
    assert.equal(parsed.lodModelPaths?.lod2, resolveAvatarRuntimeModelPath(parsed.id, "low"));
    assert.match(parsed.evidence.visualReportPath, new RegExp(`${parsed.id}\\.visual-report\\.json$`, "u"));
    assert.match(
      parsed.evidence.fitCompatibilityReportPath,
      new RegExp(`${parsed.id}\\.fit-compatibility-report\\.json$`, "u"),
    );
  }
});
