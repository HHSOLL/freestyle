# Railway Service: worker_tryon

## Runtime
- Dockerfile: `infra/docker/railway/worker-tryon.Dockerfile`
- Start Command: `npm run serve:worker:tryon`

## Handles
- `tryon.generate`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`

## Optional
- `TRYON_PROVIDER`
- Worker polling envs (`WORKER_*`)
- `RAILWAY_DOCKERFILE_PATH=infra/docker/railway/worker-tryon.Dockerfile`
