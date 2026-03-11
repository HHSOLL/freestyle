# Railway Service: worker_evaluator

## Runtime
- Dockerfile: `infra/docker/railway/worker-evaluator.Dockerfile`
- Start Command: `npm run serve:worker:evaluator`

## Handles
- `evaluator.outfit`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Optional
- `EVALUATOR_PROVIDER`
- `EVALUATOR_MODEL`
- Worker polling envs (`WORKER_*`)
- `RAILWAY_DOCKERFILE_PATH=infra/docker/railway/worker-evaluator.Dockerfile`
