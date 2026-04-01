# API Contract (`/v1`)

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

## Widget

### `GET /v1/widget/config?tenant_id=<tenant>&product_id=<product>&widget_id=<optional>`
Notes
- default self-hosted asset endpoints are `GET /widget/sdk.js` and `GET /widget/sdk.css`.
- iframe bootstrap endpoint is `GET /widget/frame`.
- when config uses the default self-hosted asset URLs, `script_integrity` and `stylesheet_integrity` are derived from the exact bytes served by those endpoints.
- default self-hosted `script_url`/`stylesheet_url` include an integrity-derived `?v=<version>` query to keep immutable caching and SRI aligned across deploys.
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

## Jobs Import

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

## Outfits

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

### `GET /v1/tryons/:id`
- user-owned tryon row 반환

## Health
- `GET /healthz`
- `GET /readyz`
