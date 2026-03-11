# Railway Service: worker_background_removal

## Runtime
- Dockerfile: `infra/docker/railway/worker-background-removal.Dockerfile`
- Start Command: `npm run serve:worker:background-removal`

## Handles
- `background_removal.process`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`
- `BG_REMOVAL_API_KEY` (or `REMOVE_BG_API_KEY`)

## Optional
- `BG_REMOVAL_ENDPOINT`
- `REMOVE_BG_ENDPOINT`
- `REMOVE_BG_SIZE`
- Worker polling envs (`WORKER_*`)
- `RAILWAY_DOCKERFILE_PATH=infra/docker/railway/worker-background-removal.Dockerfile`
