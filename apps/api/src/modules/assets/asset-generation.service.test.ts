import assert from "node:assert/strict";
import test from "node:test";
import { assetGenerationCreateResponseSchema } from "@freestyle/contracts";
import {
  createAssetGenerationRequest,
  listAssetGenerationRequests,
  resetAssetGenerationRequestsForTest,
} from "./asset-generation.service.js";

const candidateRequest = {
  provider: "external-api",
  intent: "garment-from-reference-images",
  category: "tops",
  garment_id: "generated-top-candidate",
  name: "Generated top candidate",
  material_class: "cotton",
  source_images: [
    {
      url: "https://assets.example.com/top-front.png",
      view: "front",
    },
    {
      url: "https://assets.example.com/top-back.png",
      view: "back",
    },
  ],
  source_context: {
    source_type: "brand-catalog",
    source_label: "Service test source catalog",
    source_page_url: "https://assets.example.com/generated-top",
    license_type: "licensed",
    license_reference: "license-service-test-top-2026-04",
    authorized_by: "admin-user",
  },
  measurement_constraints: {
    size_label: "M",
    measurements: {
      chestCm: 52,
      shoulderCm: 43,
      lengthCm: 64,
    },
    measurement_tolerance_mm: 4,
  },
  output_requirements: {
    target_formats: ["glb"],
    topology: "quad",
    target_polycount: 30000,
    require_pbr: true,
    require_fit_mesh: true,
    require_collision_policy: true,
    allow_auto_publish: false,
  },
  certification_request: {
    requested_approval_state: "TECH_CANDIDATE",
    review_notes: ["Seed technical review only. Publish remains blocked pending certification."],
  },
};

test.beforeEach(() => {
  resetAssetGenerationRequestsForTest();
});

test("external asset generation requests remain TECH_CANDIDATE after provider submission", () => {
  const response = assetGenerationCreateResponseSchema.parse(
    createAssetGenerationRequest(candidateRequest, "00000000-0000-4000-8000-000000000001"),
  );

  assert.equal(response.item.approval_state, "TECH_CANDIDATE");
  assert.equal(response.item.status, "submitted");
  assert.equal(response.item.certification_gate.auto_publish_allowed, false);
  assert.deepEqual(response.item.certification_gate.required_evidence, [
    "license-attestation",
    "source-provenance",
    "technical-review",
  ]);
  assert.match(response.item.provider_task?.provider_task_id ?? "", /^external-pending-/);
});

test("asset generation list can filter by provider", () => {
  createAssetGenerationRequest(candidateRequest, "00000000-0000-4000-8000-000000000001");
  const list = listAssetGenerationRequests({ provider: "external-api" });
  assert.equal(list.total, 1);
  assert.equal(list.items.every((item) => item.provider === "external-api"), true);
});

test("asset generation rejects non-https source images", () => {
  assert.throws(
    () =>
      createAssetGenerationRequest(
        {
          ...candidateRequest,
          source_images: [
            {
              url: "http://assets.example.com/top-front.png",
              view: "front",
            },
          ],
        },
        "00000000-0000-4000-8000-000000000001",
      ),
    /source_images\[0\]\.url must use https/,
  );
});
