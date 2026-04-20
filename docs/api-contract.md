# API Contract (`/v1`)

## Scope Note
- This document mixes current product/admin contracts with historical compatibility contracts.
- The active boundary source of truth is `docs/product-boundaries.md`.
- Current product/admin routes live under `/v1/profile/*`, `/v1/closet/*`, `/v1/canvas/*`, `/v1/community/*`, and `/v1/admin/*`.
- Widget, legacy asset, and old `/v1/jobs/*` sections in this document should be read as historical compatibility context unless the task explicitly targets `Legacy` or `Lab`.

## Auth
- 기본적으로 `Authorization: Bearer <supabase_jwt>`를 사용한다.
- `ALLOW_ANONYMOUS_USER=true`일 때는 브라우저가 보내는 `x-anonymous-user-id: <uuid>`로도 user-owned endpoint를 사용할 수 있다.
- 실패 시 `401 UNAUTHORIZED`
- browser-facing product/admin clients use `NEXT_PUBLIC_SUPABASE_URL` plus a low-privilege browser key. The current repo still names that browser key `NEXT_PUBLIC_SUPABASE_ANON_KEY` for compatibility, but its intended posture is public/publishable only.
- `SUPABASE_SERVICE_ROLE_KEY` is backend-only for Railway API / worker surfaces and must never be injected into Vercel/browser runtimes.
- 예외:
  - `GET /v1/auth/naver/start`
  - `GET /v1/auth/naver/callback`
  - 로그인 시작/콜백용 공개 endpoint

### `GET /v1/auth/naver/start?redirect_to=https://<web-origin>/auth/callback?next=%2Fstudio`
- `redirect_to`는 절대 URL이어야 함
- API의 `CORS_ORIGIN`, `CORS_ORIGIN_PATTERNS` allowlist를 통과해야 함
- 성공 시 Naver authorize URL로 `302 redirect`

### `GET /v1/auth/naver/callback`
- Naver callback 공개 endpoint
- 성공 시 Supabase admin magic link(`action_link`)로 `302 redirect`
- 실패 시 가능한 경우 `redirect_to`에 `error_description`을 붙여 다시 redirect

## Canonical Domain Contracts

### `/v1` compatibility notes
- `/v1` 런타임 endpoint 동작은 유지한다. 현재 저장/조회 중인 garment-side contract는 계속 `assets.metadata.measurements`, `assets.metadata.fitProfile`, `assets.metadata.garmentProfile`을 포함하고, 여기에 optional physical-fit fields인 `assets.metadata.measurementModes`, `assets.metadata.sizeChart`, `assets.metadata.selectedSizeLabel`, `assets.metadata.physicalProfile`가 추가되었다.
- canonical schema source는 `@freestyle/contracts`다. `@freestyle/shared`는 동일 contract를 소비/re-export하지만 shape를 별도로 정의하지 않는다.
- 기존 shape assumption은 유지한다. `measurements`는 기존 cm 필드(`chestCm`, `waistCm`, `hipCm`, `shoulderCm`, `sleeveLengthCm`, `lengthCm`, `inseamCm`, `riseCm`, `hemCm`)를 그대로 사용한다.

### Historical body profile reservation note
- The active product body profile route is `GET/PUT /v1/profile/body-profile`.
- The older `GET/PUT /v1/body-profiles/me` note below is a historical reservation point only. Do not use it for new product callers.
- canonical `BodyProfile` shape는 flat object가 아니라 envelope다: `{ simple, detailed? }`.
- active product payloads may also include `version: 2`, `gender`, and `bodyFrame`; the current product route preserves those fields.
- `simple`은 필수 numeric cm 필드 `heightCm`, `shoulderCm`, `chestCm`, `waistCm`, `hipCm`, `inseamCm`를 가진다.
- `detailed`는 optional object이며 `neckCm`, `torsoLengthCm`, `armLengthCm`, `sleeveLengthCm`, `bicepCm`, `forearmCm`, `wristCm`, `riseCm`, `outseamCm`, `thighCm`, `kneeCm`, `calfCm`, `ankleCm`를 optional numeric cm 필드로 가진다.
- 클라이언트 localStorage migration을 위해 legacy flat payload는 읽기 시 정규화할 수 있지만, canonical reserved contract는 envelope 기준으로 정의한다.
- planned reservation: `GET /v1/body-profiles/me`, `PUT /v1/body-profiles/me`
- historical status: reserved only, not implemented on the current mannequin-first product surface.

#### `GET /v1/profile/body-profile`
- auth: same as other `/v1/profile/*` routes
- response:
```json
{
  "bodyProfile": {
    "profile": {
      "version": 2,
      "gender": "female",
      "bodyFrame": "balanced",
      "simple": {
        "heightCm": 172,
        "shoulderCm": 44,
        "chestCm": 91,
        "waistCm": 74,
        "hipCm": 95,
        "inseamCm": 79
      }
    },
    "version": 2,
    "updatedAt": "2026-04-19T10:00:00.000Z"
  }
}
```
- when no persisted record exists, `bodyProfile` is `null`

#### `PUT /v1/profile/body-profile`
- auth: same as other `/v1/profile/*` routes
- request body must satisfy the active `BodyProfileUpsertInput` contract from `@freestyle/contracts`
- current compatibility rule: both canonical envelope payloads and legacy flat body-profile payloads are normalized into the canonical envelope before persistence
- current implementation detail: server persistence is now behind an API-side `BodyProfile` persistence port with a versioned file adapter, so backing-store replacement does not require route contract changes
- response body satisfies the active `BodyProfileRecord` contract from `@freestyle/contracts`

### Admin garment publication boundary
- garment generation itself should happen in a separate admin/publishing surface, not in `Closet`.
- implemented local-first endpoints:
  - `POST /v1/admin/garments`
  - `GET /v1/admin/garments`
  - `GET /v1/admin/garments/:id`
  - `PUT /v1/admin/garments/:id`
  - `GET /v1/closet/runtime-garments`
- still reserved for future workflow expansion:
  - `POST /v1/admin/garments/:id/publish`
- expected published payload shape is the runtime garment contract:
  - asset fields
  - `runtime`
  - `palette`
  - `publication`
  - garment measurement and size-chart metadata
- canonical success response envelopes are defined in `@freestyle/contracts`:
  - `publishedRuntimeGarmentListResponseSchema`
  - `publishedRuntimeGarmentItemResponseSchema`
- current persistence: API-side publication port with a Supabase-backed table or file fallback, selected by `GARMENT_PUBLICATION_PERSISTENCE_DRIVER`
- current remote store: `published_runtime_garments`
- current implementation detail: published runtime-garment persistence now sits behind an API-side replaceable port with both a Supabase-backed adapter and a versioned file adapter
- current RLS posture: the remote table enables RLS and exposes authenticated read only; writes remain API/service-role mediated and are not delegated to browser-held keys
- local fallback: versioned JSON repository for isolated dev/test workflows
- accessory-oriented size keys `headCircumferenceCm` and `frameWidthCm` are valid in the canonical garment measurement contract
- current read compatibility rule:
  - malformed persisted publication rows are filtered from list responses instead of zeroing the whole catalog
  - semantically invalid persisted publication rows are filtered from list responses and treated as missing on detail reads

### Job status compatibility note
- `/v1/legacy/jobs/:job_id` remains a compatibility status-read surface for queued lab jobs.
- current read compatibility rule:
  - payload/result bodies are normalized into canonical job envelopes before emission
  - timestamp fields from remote stores are normalized into canonical ISO `...Z` strings before they hit the public response schema

### Lab HQ fit-simulation boundary
- implemented lab endpoints:
  - `POST /v1/lab/jobs/fit-simulations`
  - `GET /v1/lab/fit-simulations/:id`
- auth: same as other `/v1/lab/*` routes
- current implementation detail:
  - the create route requires an existing persisted `BodyProfile`
  - the create route requires a published runtime garment id
  - the create route resolves snapshot-based `bodyVersionId`, `garmentVariantId`, `avatarManifestUrl`, and `garmentManifestUrl` before queueing `fit_simulate_hq_v1`
  - the detail route reads the API-side fit-simulation persistence port, not the legacy job table directly
  - the baseline worker currently persists typed `fit_map_json` plus `preview_png`; `draped_glb` remains a future output
  - the detail route now also returns the persisted typed `fitMap` snapshot directly in the record, so lab consumers can read overlay evidence without dereferencing the artifact URL first
- canonical response schemas are now defined in `@freestyle/contracts`:
  - `fitSimulationCreateResponseSchema`
  - `fitSimulationGetResponseSchema`

#### `POST /v1/lab/jobs/fit-simulations`
- request body must satisfy:
```json
{
  "garment_id": "published-top-phase-d-smoke",
  "quality_tier": "fast",
  "material_preset": "knit_medium",
  "idempotency_key": "fit-sim-123"
}
```
- `material_preset` is optional; the current baseline service infers a conservative preset string from the published garment metadata when it is omitted
- missing `BodyProfile` returns `409 PRECONDITION_FAILED`
- unknown garment id returns `404 NOT_FOUND`
- success response satisfies `fitSimulationCreateResponseSchema`
- example:
```json
{
  "job_id": "00000000-0000-4000-8000-000000000024",
  "fit_simulation_id": "00000000-0000-4000-8000-000000000025"
}
```

#### `GET /v1/lab/fit-simulations/:id`
- response body satisfies `fitSimulationGetResponseSchema`
- example:
```json
{
  "fitSimulation": {
    "id": "00000000-0000-4000-8000-000000000025",
    "jobId": "00000000-0000-4000-8000-000000000024",
    "status": "succeeded",
    "avatarVariantId": "female-base",
    "bodyVersionId": "body-profile:user-id:2026-04-20T10:00:00.000Z",
    "garmentVariantId": "published-top-phase-d-smoke",
    "avatarManifestUrl": "https://freestyle.local/assets/avatars/mpfb-female-base.glb",
    "garmentManifestUrl": "https://freestyle.local/assets/garments/partner/phase-d-smoke-tee.glb",
    "materialPreset": "knit_medium",
    "qualityTier": "fast",
    "instantFit": {
      "schemaVersion": "garment-instant-fit-report.v1",
      "overallFit": "good",
      "confidence": 0.79,
      "primaryRegionId": "length"
    },
    "fitMap": {
      "schemaVersion": "fit-map-json.v1",
      "overlays": [
        { "kind": "easeMap" },
        { "kind": "stretchMap" },
        { "kind": "collisionRiskMap" },
        { "kind": "confidenceMap" }
      ]
    },
    "artifacts": [
      {
        "kind": "fit_map_json",
        "url": "https://freestyle.local/fit-simulations/00000000-0000-4000-8000-000000000025/fit-map.json"
      },
      {
        "kind": "preview_png",
        "url": "https://freestyle.local/fit-simulations/00000000-0000-4000-8000-000000000025/preview.png"
      }
    ],
    "metrics": {
      "durationMs": 842,
      "penetrationRate": 0.061,
      "maxStretchRatio": 1.02
    },
    "warnings": [
      "Baseline Phase D worker emits fit_map_json plus preview_png; draped_glb remains pending."
    ],
    "errorMessage": null,
    "createdAt": "2026-04-20T10:00:00.000Z",
    "updatedAt": "2026-04-20T10:00:00.842Z",
    "completedAt": "2026-04-20T10:00:00.842Z"
  }
}
```

#### `GET /v1/closet/runtime-garments`
- auth: same as other `/v1/closet/*` routes
- product consumer rule:
  - `items` are consumed as product-only `{ item, instantFit }` entries
  - `item` is the canonical camelCase `PublishedGarmentAsset` payload
  - `instantFit` is derived from the current persisted `BodyProfile` when present, otherwise `null`
  - legacy snake_case asset rows are not a supported shape for this route
  - malformed or semantically invalid persisted publication rows are filtered before the response is emitted
- response body satisfies `closetRuntimeGarmentListResponseSchema`
- example:
```json
{
  "items": [
    {
      "item": {
        "id": "published-top-precision-tee",
        "name": "Precision Tee",
        "imageSrc": "/assets/demo/precision-tee.png",
        "category": "tops",
        "source": "inventory",
        "runtime": {
          "modelPath": "/assets/garments/partner/precision-tee.glb",
          "skeletonProfileId": "freestyle-rig-v2",
          "anchorBindings": [
            { "id": "leftShoulder", "weight": 0.3 }
          ],
          "collisionZones": ["torso", "arms"],
          "bodyMaskZones": [],
          "surfaceClearanceCm": 1.2,
          "renderPriority": 1
        },
        "palette": ["#f5f5f5", "#10161f"],
        "publication": {
          "sourceSystem": "admin-domain",
          "publishedAt": "2026-04-14T12:00:00.000Z",
          "assetVersion": "precision-tee@1.0.0",
          "measurementStandard": "body-garment-v1"
        }
      },
      "instantFit": {
        "schemaVersion": "garment-instant-fit-report.v1",
        "overallFit": "good",
        "confidence": 0.79,
        "primaryRegionId": "length"
      }
    }
  ],
  "total": 1
}
```

#### `GET /v1/admin/garments`
- auth:
  - bearer-token backed admin access only
  - anonymous `x-anonymous-user-id` fallback is rejected
  - local non-production `DEV_BYPASS_USER_ID` can still reach the route only when it is also allowlisted through `ADMIN_USER_IDS` (or when the allowlist is unset)
- response body satisfies `publishedRuntimeGarmentListResponseSchema`
- malformed or semantically invalid persisted publication rows are filtered before the response is emitted

#### `GET /v1/admin/garments/:id`
- auth: same admin-only rule as `GET /v1/admin/garments`
- response body satisfies `publishedRuntimeGarmentItemResponseSchema`
- if the stored row for `:id` is malformed or fails semantic garment validation, the route returns `404 NOT_FOUND`

#### `POST /v1/admin/garments`
- auth: same admin-only rule as `GET /v1/admin/garments`
- request body must satisfy `PublishedGarmentAsset`
- duplicate `id` returns `409 CONFLICT`
- response body satisfies `publishedRuntimeGarmentItemResponseSchema`
- example:
```json
{
  "item": {
    "id": "published-top-precision-tee",
    "name": "Precision Tee",
    "imageSrc": "/assets/demo/precision-tee.png",
    "category": "tops",
    "source": "inventory",
    "runtime": {
      "modelPath": "/assets/garments/partner/precision-tee.glb",
      "skeletonProfileId": "freestyle-rig-v2",
      "anchorBindings": [
        { "id": "leftShoulder", "weight": 0.3 }
      ],
      "collisionZones": ["torso", "arms"],
      "bodyMaskZones": [],
      "surfaceClearanceCm": 1.2,
      "renderPriority": 1
    },
    "palette": ["#f5f5f5", "#10161f"],
    "publication": {
      "sourceSystem": "admin-domain",
      "publishedAt": "2026-04-14T12:00:00.000Z",
      "assetVersion": "precision-tee@1.0.0",
      "measurementStandard": "body-garment-v1"
    }
  }
}
```

#### `PUT /v1/admin/garments/:id`
- auth: same admin-only rule as `GET /v1/admin/garments`
- request body must satisfy `PublishedGarmentAsset`
- route `:id` must match `request body.id`
- response body satisfies `publishedRuntimeGarmentItemResponseSchema`

### Canvas look boundary
- implemented product endpoints:
  - `POST /v1/canvas/looks`
  - `GET /v1/canvas/looks`
  - `GET /v1/canvas/looks/:id`
  - `DELETE /v1/canvas/looks/:id`
- auth: same as other `/v1/canvas/*` product routes
- canonical schema source: `@freestyle/contracts`
- request body for `POST /v1/canvas/looks` must satisfy `CanvasLookInput`
- current rule for `CanvasLookInput.data`:
  - must be the canonical `CanvasComposition` snapshot
  - top-level `title` must match `data.title`
- current read compatibility rule:
  - stored legacy or malformed `outfits.data` rows are degraded to `data: null` on detail read instead of being re-emitted as arbitrary JSON

#### `POST /v1/canvas/looks`
Request
```json
{
  "title": "Studio composition",
  "description": null,
  "previewImage": "data:image/png;base64,...",
  "data": {
    "version": 1,
    "id": "composition-1",
    "title": "Studio composition",
    "stageColor": "#eef1f4",
    "createdAt": "2026-04-19T12:00:00.000Z",
    "updatedAt": "2026-04-19T12:00:00.000Z",
    "bodyProfile": {
      "version": 2,
      "simple": {
        "heightCm": 171,
        "shoulderCm": 43,
        "chestCm": 94,
        "waistCm": 76,
        "hipCm": 99,
        "inseamCm": 80
      }
    },
    "closetState": {
      "version": 1,
      "avatarVariantId": "female-base",
      "poseId": "neutral",
      "activeCategory": "tops",
      "selectedItemId": "starter-top-ivory-tee",
      "equippedItemIds": {
        "tops": "starter-top-ivory-tee"
      },
      "qualityTier": "balanced"
    },
    "items": []
  },
  "isPublic": true
}
```
Response
```json
{
  "id": "uuid",
  "shareSlug": "abc123xyz"
}
```

#### `GET /v1/canvas/looks`
Response
```json
{
  "looks": [
    {
      "id": "uuid",
      "shareSlug": "abc123xyz",
      "title": "Studio composition",
      "previewImage": "data:image/png;base64,...",
      "createdAt": "2026-04-19T12:00:00.000Z"
    }
  ]
}
```

#### `GET /v1/canvas/looks/:id`
Response
```json
{
  "look": {
    "id": "uuid",
    "shareSlug": "abc123xyz",
    "title": "Studio composition",
    "description": null,
    "previewImage": "data:image/png;base64,...",
    "data": null,
    "isPublic": true,
    "createdAt": "2026-04-19T12:00:00.000Z",
    "updatedAt": "2026-04-19T12:00:00.000Z"
  }
}
```

#### `DELETE /v1/canvas/looks/:id`
Response
```json
{
  "status": "deleted"
}
```

Notes
- `previewImage`는 현재 canvas export 결과(`data:image/...`)를 그대로 저장한다.
- route success payloads are emitted through canonical response envelope schemas, not ad hoc objects.
- historical outfit-style blobs remain documented under `POST /v1/outfits`; they are not valid create payloads for the active `/v1/canvas/looks` route.

## Historical Compatibility Appendices

The sections below are kept for `Legacy` and `Lab` maintenance. Do not treat them as the default product surface contract unless the task explicitly targets those namespaces.

## Widget

- Historical rollout-time path: `GET /v1/widget/config?tenant_id=<tenant>&product_id=<product>&widget_id=<optional>`
- Current namespace location: `GET /v1/legacy/widget/config?tenant_id=<tenant>&product_id=<product>&widget_id=<optional>`

### `GET /v1/widget/config?tenant_id=<tenant>&product_id=<product>&widget_id=<optional>`
Notes
- default self-hosted asset endpoints are `GET /widget/sdk.js` and `GET /widget/sdk.css`.
- iframe bootstrap endpoint is `GET /widget/frame`.
- when config uses the default self-hosted asset URLs, `script_integrity` and `stylesheet_integrity` are derived from the exact bytes served by those endpoints.
- default self-hosted `script_url`/`stylesheet_url` include an integrity-derived `?v=<version>` query to keep immutable caching and SRI aligned across deploys.
- self-hosted iframe mode resolves its frame bootstrap and telemetry endpoint on the widget API origin only; cross-origin absolute URLs are rejected at runtime.
- `phase_0_5_canary_enabled` is sampled deterministically when `WIDGET_PHASE_0_5_CANARY_PERCENTAGE` is set (`1|5|25|100`); `phase_0_5_kill_switch` always overrides to disabled.

Response
```json
{
  "widget_id": "freestyle-widget",
  "tenant_id": "tenant-a",
  "product_id": "sku-123",
  "api_base_url": "https://api.example.com/v1",
  "events_endpoint": "/v1/widget/events",
  "script_url": "https://api.example.com/widget/sdk.js?v=7c99f10495e5bb4a",
  "script_integrity": "sha384-abc123...",
  "stylesheet_url": "https://api.example.com/widget/sdk.css?v=7c99f10495e5bb4a",
  "stylesheet_integrity": "sha384-def456...",
  "asset_base_url": "https://api.example.com/assets",
  "widget_version_policy": "immutable",
  "allowed_origins": ["https://shop.example.com"],
  "feature_flags": {
    "phase_0_5_canary_enabled": false
  },
  "theme": {
    "mode": "auto",
    "accent": "#D1B278"
  },
  "expires_at": "2026-04-01T10:00:00.000Z",
  "dedupe_window_seconds": 86400,
  "partial_accept": true,
  "rate_limit": {
    "max_events": 60,
    "window_seconds": 60
  },
  "error_codes": [
    "WIDGET_CONFIG_NOT_FOUND",
    "WIDGET_ORIGIN_DENIED",
    "WIDGET_EVENT_INVALID",
    "WIDGET_EVENT_RATE_LIMITED",
    "WIDGET_MOUNT_FAILED",
    "WIDGET_ASSET_LOAD_FAILED"
  ]
}
```

### `POST /v1/widget/events`
- Historical rollout-time path. Current namespace location: `POST /v1/legacy/widget/events`.
Request
```json
{
  "tenant_id": "tenant-a",
  "product_id": "sku-123",
  "events": [
    {
      "event_id": "evt_001",
      "event_name": "widget_loaded",
      "tenant_id": "tenant-a",
      "product_id": "sku-123",
      "idempotency_key": "optional-key",
      "page_url": "https://shop.example.com/products/sku-123",
      "payload": {
        "mode": "iframe"
      }
    }
  ]
}
```

Response (`202 Accepted` partial-accept)
```json
{
  "request_id": "req-1",
  "received_count": 1,
  "accepted_count": 1,
  "duplicate_count": 0,
  "rejected_count": 0,
  "accepted": [
    {
      "event_id": "evt_001",
      "status": "accepted"
    }
  ],
  "rejected": []
}
```

Notes
- origin allowlist를 통과하지 못하면 `403 WIDGET_ORIGIN_DENIED`.
- `event_id`는 필수, `idempotency_key`는 optional.
- dedupe window는 24시간.
- `occurred_at`가 있으면 replay 방어를 위해 과거 24시간/미래 5분 허용 창을 벗어난 이벤트는 `WIDGET_EVENT_INVALID`로 reject한다.
- 동일 요청 안에서도 invalid event는 reject하고 valid event는 수용하는 partial-accept 정책이다.
- `tenant_id`/`product_id` 불일치 event는 `WIDGET_EVENT_INVALID`.
- iframe 모드 postMessage 신뢰 판단은 payload 필드가 아니라 runtime `event.origin`으로만 수행한다.
- iframe 모드 메시지 계약은 `{ type, version, eventId, payload }` shape를 사용하며, SDK는 `event.source === iframe.contentWindow`와 shape validation을 모두 통과한 메시지만 처리한다.
- self-hosted/browser SDK는 `events_endpoint`가 `api_base_url`과 다른 origin으로 해석되면 전송하지 않고 `WIDGET_ORIGIN_DENIED`로 실패시킨다.

### `GET /widget/sdk.js`
- widget browser runtime JavaScript asset served directly from the API origin
- response type: `application/javascript`
- default config `script_url` points here when `WIDGET_SCRIPT_URL` is not overridden

### `GET /widget/sdk.css`
- widget browser runtime stylesheet served directly from the API origin
- response type: `text/css`
- default config `stylesheet_url` points here when `WIDGET_STYLESHEET_URL` is not overridden

### `GET /widget/frame?tenant_id=<tenant>&product_id=<product>`
- iframe bootstrap HTML served directly from the API origin
- response type: `text/html`
- iframe mode SDK uses this endpoint instead of navigating directly to the JavaScript asset
- response headers include a conservative `Content-Security-Policy` (`default-src 'none'`, inline `style`/`script` allowlist for the bootstrap shell, CSP `sandbox allow-scripts allow-same-origin`)
- when widget origin allowlists are configured, `frame-ancestors` is narrowed to exact configured origins plus the current request origin if it matches an allow-pattern; wildcard patterns are not emitted directly into CSP
- response also sets `Referrer-Policy: no-referrer` and `X-Content-Type-Options: nosniff`
- the bootstrap frame posts its `widget.ready` message with `targetOrigin="*"`; host trust still depends on the parent SDK validating runtime `event.origin` and `event.source`

## Jobs Import

- Historical compatibility namespace. Current routes are mounted under `/v1/legacy/jobs/*` or `/v1/lab/*` depending on the feature.

### `POST /v1/jobs/import/product`
Request
```json
{
  "product_url": "https://example.com/product/123",
  "category_hint": "jacket",
  "item_name": "Black leather bomber",
  "idempotency_key": "optional-key"
}
```
Response
```json
{
  "job_id": "uuid",
  "product_id": "uuid"
}
```

### `POST /v1/jobs/import/products/batch`
Request
```json
{
  "product_urls": [
    "https://example.com/product/123",
    "https://example.com/product/456"
  ],
  "category_hint": "jacket",
  "idempotency_key": "optional-key"
}
```
Response
```json
{
  "requested_count": 2,
  "queued_count": 2,
  "failed_count": 0,
  "items": [
    {
      "product_url": "https://example.com/product/123",
      "product_id": "uuid",
      "job_id": "uuid"
    }
  ],
  "failed": []
}
```

Notes
- 브라우저 브리지/확장 프로그램이 무신사 좋아요나 장바구니에서 추출한 `product_url[]`를 전달하는 용도로 적합하다.
- `idempotency_key` 재사용은 사용자 범위 안에서만 dedupe 된다. 현재 queue uniqueness 기준은 `(user_id, job_type, idempotency_key)`다.
- 배치 item fan-out 시 각 child job은 배치 key + normalized URL digest를 붙인 child idempotency key를 사용한다.
- 일부 URL만 queue 생성에 성공하면 응답은 `207 Multi-Status`가 될 수 있다.

### `POST /v1/jobs/import/cart`
Request
```json
{
  "cart_url": "https://example.com/cart",
  "max_items": 20,
  "idempotency_key": "optional-key"
}
```
Response
```json
{
  "job_id": "uuid"
}
```

### `POST /v1/jobs/import/upload`
- multipart form-data
- file + optional `category_hint`, `item_name`, `idempotency_key`

Response
```json
{
  "job_id": "uuid",
  "product_id": "uuid",
  "uploaded_image_url": "https://..."
}
```

### `GET /v1/jobs/:job_id`
Response
```json
{
  "id": "uuid",
  "job_type": "import.product_url",
  "trace_id": "uuid",
  "status": "queued",
  "progress": 20,
  "result": {
    "schema_version": "job-result.v1",
    "job_type": "import.product_url",
    "trace_id": "uuid",
    "progress": 20,
    "artifacts": [],
    "metrics": {},
    "warnings": [],
    "data": {}
  },
  "error": null,
  "created_at": "...",
  "updated_at": "...",
  "completed_at": null
}
```

Notes
- current status response shape is validated against the canonical `jobStatusResponseSchema`
- stored worker results are normalized to the canonical `job-result.v1` envelope on both write and read paths
- legacy raw result blobs are still read for compatibility, but they are upgraded into the canonical envelope before response emission
- the queued payload stored in `jobs.payload` is also canonicalized internally as `job-payload.v1` with `trace_id`, `job_type`, optional `idempotency_key`, and `data`

## Assets

- Historical compatibility namespace. Current asset maintenance work should default to `Legacy`, not the product surface.

### `GET /v1/assets?status=ready&category=jacket&page=1&page_size=20`
Response
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

Notes
- 각 asset row는 `metadata`에 원본 크기, cutout trim/quality, 측정치(`measurements`), fit profile, dominant color를 포함할 수 있다.
- `metadata.cutout`에는 `strategy`, `fallbackUsed`, `quality`, `trimRect`가 포함될 수 있다.
- asset row는 `name`, `brand`, `source_url` top-level 필드도 유지하며, Studio/Closet UI는 이 값과 `metadata.sourceTitle/sourceBrand/sourceUrl`을 함께 fallback으로 사용한다.
- `/v1` 호환성 기준으로 garment domain payload의 canonical 정의는 `@freestyle/contracts`를 따르며, live API shape 자체는 변경하지 않는다.

### `GET /v1/assets/:id`
Response
- 현재 사용자(또는 익명 UUID)가 소유한 asset row를 반환

Failure
- 소유하지 않았거나 존재하지 않는 asset은 `404`

### `PATCH /v1/assets/:id`
Request
```json
{
  "metadata": {
    "measurements": {
      "chestCm": 112,
      "lengthCm": 74
    },
    "fitProfile": {
      "silhouette": "relaxed",
      "layer": "mid"
    },
    "garmentProfile": {
      "version": 1,
      "category": "outerwear"
    }
  }
}
```

Response
- 현재 사용자(또는 익명 UUID)가 소유한 updated asset row 반환

Notes
- 이 endpoint는 Studio/Closet fitting lab에서 의류 측정치와 fit profile을 저장하는 주 경로다.
- `BodyProfile`은 이 endpoint에서 저장하지 않는다. Product persistence는 `GET/PUT /v1/profile/body-profile`을 기준으로 보며, `GET/PUT /v1/body-profiles/me`는 historical reservation note로만 남아 있다.

## Outfits

- Historical compatibility namespace. Check `docs/product-boundaries.md` before wiring new callers here.

### `POST /v1/outfits`
Request
```json
{
  "title": "Minimal denim look",
  "previewImage": "data:image/png;base64,...",
  "data": {
    "items": [
      {
        "assetId": "uuid",
        "name": "Black jacket",
        "category": "outerwear",
        "imageSrc": "https://..."
      }
    ],
    "textItems": [],
    "canvas": {
      "background": "#F8F9FA",
      "size": "square"
    },
    "modelPhoto": null
  }
}
```
Response
```json
{
  "id": "uuid",
  "shareSlug": "abc123xyz"
}
```

Notes
- 저장 row는 `user_id` 기준으로 소유된다.
- `previewImage`는 현재 Studio canvas export 결과(`data:image/...`)를 그대로 저장한다.

### `GET /v1/outfits`
- 현재 사용자(또는 익명 UUID)의 outfit 목록만 반환

### `GET /v1/outfits/:id`
- 현재 사용자(또는 익명 UUID)가 소유한 outfit row만 반환

### `DELETE /v1/outfits/:id`
- 현재 사용자(또는 익명 UUID)가 소유한 outfit row만 삭제

### `GET /v1/outfits/share/:slug`
- public share read endpoint

## Evaluations

- Lab-only compatibility namespace. Do not treat these as current product routes.

### `POST /v1/jobs/evaluations`
Request
```json
{
  "request_payload": {
    "imageDataUrl": "data:image/png;base64,...",
    "items": [
      {
        "name": "블랙 후드 집업",
        "category": "상의",
        "sourceUrl": "https://www.musinsa.com/products/5911845"
      }
    ],
    "occasion": "daily",
    "language": "Korean"
  },
  "idempotency_key": "optional-key"
}
```
Response
```json
{
  "job_id": "uuid",
  "evaluation_id": "uuid"
}
```

Notes
- 현재 evaluator worker는 `request_payload.imageDataUrl`를 필수로 사용한다.
- `asset_ids`만 전달하는 방식은 현재 런타임 구현과 맞지 않으며, 캔버스 렌더 결과를 `data:image/...` 형태로 전달해야 한다.
- `idempotency_key`는 사용자 범위 안에서만 dedupe 된다. 현재 evaluator queue uniqueness 기준은 `(user_id, job_type, idempotency_key)`다.

### `GET /v1/evaluations/:id`
- user-owned evaluation row 반환

## Try-ons

- Lab-only compatibility namespace. Do not treat these as current product routes.

### `POST /v1/jobs/tryons`
Request
```json
{
  "asset_id": "uuid",
  "input_image_url": "https://...",
  "idempotency_key": "optional-key"
}
```
Response
```json
{
  "job_id": "uuid",
  "tryon_id": "uuid"
}
```

Notes
- 이 endpoint는 여전히 포토 AI try-on 용도다.
- 실시간 3D 마네킹 피팅은 `GET/PATCH /v1/assets`로 읽어온 asset metadata와 Studio 클라이언트 body profile 계산을 사용한다.
- 현재 계약은 metadata 기반 preview를 위한 것이며, 패턴/원단 물성 기반 cloth simulation API는 아직 없다.
- body profile persistence endpoint(`GET/PUT /v1/body-profiles/me`)는 historical reservation note이며 현재 try-on/runtime 경로에는 연결되어 있지 않다.
- `idempotency_key`는 사용자 범위 안에서만 dedupe 된다. 현재 try-on queue uniqueness 기준은 `(user_id, job_type, idempotency_key)`다.

### `GET /v1/tryons/:id`
- user-owned tryon row 반환

## Health
- `GET /healthz`
- `GET /readyz`
