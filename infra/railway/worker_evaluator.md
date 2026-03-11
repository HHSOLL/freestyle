# Railway Service: worker_evaluator

## Runtime
- Entry: `node dist/workers/evaluator/src/worker.js`

## Handles
- `evaluator.outfit`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Optional
- `EVALUATOR_PROVIDER`
- `EVALUATOR_MODEL`
- Worker polling envs (`WORKER_*`)
