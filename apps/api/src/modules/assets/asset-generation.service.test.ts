import assert from "node:assert/strict";
import test from "node:test";
import { assetGenerationCreateResponseSchema } from "@freestyle/contracts";
import {
  createAssetGenerationRequest,
  listAssetGenerationRequests,
  resetAssetGenerationRequestsForTest,
} from "./asset-generation.service.js";
import {
  getConfiguredAi3DProvider,
  resetAi3DProviderStateForTest,
} from "./ai-3d-providers.js";

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
};

test.beforeEach(() => {
  resetAssetGenerationRequestsForTest();
  resetAi3DProviderStateForTest();
  delete process.env.AI_3D_PROVIDER;
  delete process.env.ASSET_GENERATION_AI_3D_PROVIDER;
  delete process.env.MESHY_API_KEY;
  delete process.env.TRIPO_API_KEY;
  delete process.env.RODIN_API_KEY;
});

test("external asset generation requests remain TECH_CANDIDATE after provider submission", async () => {
  process.env.AI_3D_PROVIDER = "meshy";
  process.env.MESHY_API_KEY = "test-meshy-key";

  const response = assetGenerationCreateResponseSchema.parse(
    await createAssetGenerationRequest(candidateRequest, "admin-user"),
  );

  assert.equal(response.item.approval_state, "TECH_CANDIDATE");
  assert.equal(response.item.status, "submitted");
  assert.equal(response.item.certification_gate.auto_publish_allowed, false);
  assert.deepEqual(response.item.certification_gate.required_artifacts, [
    "display_glb",
    "fit_mesh_glb",
    "material_json",
    "body_mask_policy_json",
    "collision_policy_json",
    "fit_metrics_json",
    "golden_fit_report",
  ]);
  assert.match(response.item.provider_task?.provider_task_id ?? "", /^meshy-multi-view-to-3d-/);
  assert.equal(
    response.item.certification_gate.hard_blockers.includes(
      "Vendor or AI-generated assets need license metadata before production registration.",
    ),
    true,
  );
  assert.equal(
    response.item.certification_gate.hard_blockers.includes(
      "Vendor or AI-generated assets need source metadata before production registration.",
    ),
    true,
  );
});

test("asset generation list can filter by provider", async () => {
  process.env.AI_3D_PROVIDER = "meshy";
  process.env.MESHY_API_KEY = "test-meshy-key";

  await createAssetGenerationRequest(candidateRequest, "admin-user");
  const list = listAssetGenerationRequests({ provider: "external-api" });
  assert.equal(list.total, 1);
  assert.equal(list.items.every((item) => item.provider === "external-api"), true);
});

test("asset generation rejects non-https source images", async () => {
  await assert.rejects(
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
        "admin-user",
      ),
    /source image URL must use HTTPS/,
  );
});

test("external asset generation fails closed when provider credentials are missing", async () => {
  await assert.rejects(
    () => createAssetGenerationRequest(candidateRequest, "admin-user"),
    /AI 3D provider is not configured|provider is not configured/,
  );
});

test("provider draft registration forbids CERTIFIED or PUBLISHED promotion", () => {
  process.env.AI_3D_PROVIDER = "meshy";
  process.env.MESHY_API_KEY = "test-meshy-key";

  const provider = getConfiguredAi3DProvider();
  assert.throws(
    () =>
      provider.registerDraftAsset({
        assetName: "Generated top candidate",
        desiredApprovalState: "PUBLISHED",
        sourceKind: "ai-generated",
        licenseMetadata: { id: "vendor-license-1" },
        sourceMetadata: { providerAssetId: "vendor-asset-1" },
      }),
    /only be registered as DRAFT or TECH_CANDIDATE/,
  );
});

test("configured provider supports create and poll while download fails until a model exists", async () => {
  process.env.AI_3D_PROVIDER = "meshy";
  process.env.MESHY_API_KEY = "test-meshy-key";

  const provider = getConfiguredAi3DProvider();
  const task = await provider.createTextTo3DTask({
    assetName: "Generated top candidate",
    prompt: "relaxed cotton shirt",
  });
  const pollResult = await provider.pollTask(task.provider_task_id);

  assert.equal(pollResult.ready, false);
  assert.equal(pollResult.modelUrl, null);
  await assert.rejects(
    () =>
      provider.downloadModel({
        providerTaskId: task.provider_task_id,
      }),
    /not ready for download/,
  );
});
