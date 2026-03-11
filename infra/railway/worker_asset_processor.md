# Railway Service: worker_asset_processor

## Runtime
- Dockerfile: `infra/docker/railway/worker-asset-processor.Dockerfile`
- Start Command: `npm run serve:worker:asset-processor`

## Handles
- `asset_processor.process`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`

## Optional
- `EMBEDDING_MODEL`
- Worker polling envs (`WORKER_*`)
- `RAILWAY_DOCKERFILE_PATH=infra/docker/railway/worker-asset-processor.Dockerfile`
