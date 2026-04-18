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
- current persistence: local JSON repository behind the API boundary
- intended future persistence: dedicated admin domain backing store
- accessory-oriented size keys `headCircumferenceCm` and `frameWidthCm` are valid in the canonical garment measurement contract

#### `GET /v1/closet/runtime-garments`
- auth: same as other `/v1/closet/*` routes
- response:
```json
{
  "items": [
    {
      "id": "published-top-precision-tee",
      "name": "Precision Tee",
      "category": "tops",
      "source": "inventory",
      "runtime": {
        "modelPath": "/assets/garments/partner/precision-tee.glb",
        "skeletonProfileId": "freestyle-humanoid-v1",
        "anchorBindings": [
          { "id": "leftShoulder", "weight": 0.3 }
        ],
        "collisionZones": ["torso", "arms"],
        "bodyMaskZones": [],
        "surfaceClearanceCm": 1.2,
        "renderPriority": 1
      },
      "publication": {
        "sourceSystem": "admin-domain",
        "publishedAt": "2026-04-14T12:00:00.000Z",
        "assetVersion": "precision-tee@1.0.0",
        "measurementStandard": "body-garment-v1"
      }
    }
  ],
  "total": 1
}
```

#### `POST /v1/admin/garments`
- auth: same as other product routes for now; later admin-domain auth will replace this
- request body must satisfy `PublishedGarmentAsset`
- duplicate `id` returns `409 CONFLICT`
- response:
```json
{
  "item": {
    "id": "published-top-precision-tee"
  }
}
```

#### `PUT /v1/admin/garments/:id`
- auth: same as other product routes for now; later admin-domain auth will replace this
- request body must satisfy `PublishedGarmentAsset`
- route `:id` must match `body.id`
- response:
```json
{
  "item": {
    "id": "published-top-precision-tee"
  }
}
```

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
- `idempotency_key`가 같은 배치 재전송은 동일 URL 기준으로 job 중복 생성을 줄인다.
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
  "status": "queued",
  "progress": 20,
  "result": {},
  "error": null,
  "created_at": "...",
  "updated_at": "...",
  "completed_at": null
}
```

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

### `GET /v1/tryons/:id`
- user-owned tryon row 반환

## Health
- `GET /healthz`
- `GET /readyz`
