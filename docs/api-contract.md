# API Contract (`/v1`)

## Auth
- 모든 endpoint는 `Authorization: Bearer <supabase_jwt>` 필요
- 실패 시 `401 UNAUTHORIZED`

## Jobs Import

### `POST /v1/jobs/import/product`
Request
```json
{
  "product_url": "https://example.com/product/123",
  "category_hint": "jacket",
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
- file + optional `category_hint`, `idempotency_key`

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

## Evaluations

### `POST /v1/jobs/evaluations`
Request
```json
{
  "request_payload": {
    "asset_ids": ["uuid-1", "uuid-2"]
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

### `GET /v1/tryons/:id`
- user-owned tryon row 반환

## Health
- `GET /healthz`
- `GET /readyz`
