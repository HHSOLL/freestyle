# Railway Service: worker_asset_processor

## Runtime
- Entry: `node dist/workers/asset_processor/src/worker.js`

## Handles
- `asset_processor.process`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`

## Optional
- `EMBEDDING_MODEL`
- Worker polling envs (`WORKER_*`)
