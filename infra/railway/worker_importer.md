# Railway Service: worker_importer

## Runtime
- Entry: `node dist/workers/importer/src/worker.js`

## Handles
- `import.product_url`
- `import.cart_url`
- `import.upload_image`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`
- `SUPABASE_STORAGE_BUCKET` (if provider=supabase)

## Optional
- `WORKER_POLL_INTERVAL_MS=750`
- `WORKER_CLAIM_BATCH=10`
- `WORKER_HEARTBEAT_SEC=10`
