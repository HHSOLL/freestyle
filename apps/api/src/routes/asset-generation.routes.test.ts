import assert from "node:assert/strict";
import test from "node:test";
import {
  assetGenerationCreateResponseSchema,
  assetGenerationListResponseSchema,
} from "@freestyle/contracts";
import { resetAssetGenerationRequestsForTest } from "../modules/assets/asset-generation.service.js";
import { buildServer } from "../main.js";

const adminUserId = "00000000-0000-4000-8000-000000000111";

const candidateRequest = {
  provider: "external-api",
  intent: "garment-from-reference-images",
  category: "tops",
  garment_id: "generated-route-top-candidate",
  name: "Generated route top candidate",
  material_class: "cotton",
  source_images: [
    {
      url: "https://assets.example.com/generated-route-top-front.png",
      view: "front",
    },
    {
      url: "https://assets.example.com/generated-route-top-back.png",
      view: "back",
    },
  ],
  source_context: {
    source_type: "brand-catalog",
    source_label: "Partner Spring 2026 line sheet",
    source_page_url: "https://brand.example.com/line-sheet/spring-2026/top-m",
    license_type: "licensed",
    license_reference: "license-asset-gen-top-2026-04",
    authorized_by: "partner-ops@freestyle.test",
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

const withFrontSourceUrl = (url: string) => ({
  ...candidateRequest,
  source_images: candidateRequest.source_images.map((image) =>
    image.view === "front" ? { ...image, url } : image,
  ),
});

test.beforeEach(() => {
  resetAssetGenerationRequestsForTest();
  process.env.DEV_BYPASS_USER_ID = adminUserId;
  process.env.ADMIN_USER_IDS = adminUserId;
});

test.after(() => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;
});

test("asset generation admin routes create intake candidates without publish rights", async () => {
  const app = buildServer();

  const createResponse = await app.inject({
    method: "POST",
    url: "/v1/admin/asset-generation",
    payload: candidateRequest,
  });

  assert.equal(createResponse.statusCode, 202);
  assert.equal(createResponse.headers["x-freestyle-surface"], "product");
  const createPayload = assetGenerationCreateResponseSchema.parse(createResponse.json());
  assert.equal(createPayload.item.status, "submitted");
  assert.equal(createPayload.item.approval_state, "TECH_CANDIDATE");
  assert.equal(createPayload.item.certification_gate.auto_publish_allowed, false);
  assert.equal(createPayload.item.output_requirements.require_fit_mesh, true);
  assert.match(createPayload.item.provider_task?.provider_task_id ?? "", /^external-pending-/);

  const listResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/asset-generation?provider=external-api",
  });

  assert.equal(listResponse.statusCode, 200);
  const listPayload = assetGenerationListResponseSchema.parse(listResponse.json());
  assert.equal(listPayload.total, 1);
  assert.equal(listPayload.items[0]?.id, createPayload.item.id);

  const detailResponse = await app.inject({
    method: "GET",
    url: `/v1/admin/asset-generation/${createPayload.item.id}`,
  });

  assert.equal(detailResponse.statusCode, 200);
  assert.equal(
    assetGenerationCreateResponseSchema.parse(detailResponse.json()).item.id,
    createPayload.item.id,
  );

  await app.close();
});

test("asset generation admin routes reject unsafe source image URLs", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: "/v1/admin/asset-generation",
    payload: {
      ...candidateRequest,
      source_images: [
        {
          url: "http://assets.example.com/generated-route-top-front.png",
          view: "front",
        },
      ],
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");

  await app.close();
});

test("asset generation admin routes reject private source image hosts", async () => {
  const app = buildServer();
  const unsafeUrls = [
    "https://127.0.0.1/generated-route-top-front.png",
    "https://10.0.0.1/generated-route-top-front.png",
    "https://172.16.0.1/generated-route-top-front.png",
    "https://192.168.1.1/generated-route-top-front.png",
    "https://169.254.169.254/generated-route-top-front.png",
    "https://[::]/generated-route-top-front.png",
    "https://[::1]/generated-route-top-front.png",
    "https://[fc00::1]/generated-route-top-front.png",
    "https://[fd00::1]/generated-route-top-front.png",
    "https://[fe80::1]/generated-route-top-front.png",
    "https://[::ffff:127.0.0.1]/generated-route-top-front.png",
    "https://[::ffff:10.0.0.1]/generated-route-top-front.png",
    "https://[::ffff:169.254.169.254]/generated-route-top-front.png",
    "https://[::ffff:192.168.1.10]/generated-route-top-front.png",
    "https://[::ffff:172.16.0.1]/generated-route-top-front.png",
  ];

  for (const url of unsafeUrls) {
    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/asset-generation",
      payload: withFrontSourceUrl(url),
    });

    assert.equal(response.statusCode, 400, url);
    assert.equal(response.json().error, "VALIDATION_ERROR", url);
    assert.match(response.json().issues.join("\n"), /public remote host/, url);
  }

  await app.close();
});

test("asset generation admin routes reject publish-state escalation and auto publish", async () => {
  const app = buildServer();

  const response = await app.inject({
    method: "POST",
    url: "/v1/admin/asset-generation",
    payload: {
      ...candidateRequest,
      output_requirements: {
        ...candidateRequest.output_requirements,
        allow_auto_publish: true,
      },
      certification_request: {
        requested_approval_state: "PUBLISHED",
        review_notes: ["Trying to bypass certification."],
      },
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, "VALIDATION_ERROR");

  await app.close();
});

test("asset generation admin routes reject anonymous callers", async () => {
  delete process.env.DEV_BYPASS_USER_ID;
  delete process.env.ADMIN_USER_IDS;

  const app = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/asset-generation",
  });

  assert.equal(response.statusCode, 401);

  await app.close();
});
