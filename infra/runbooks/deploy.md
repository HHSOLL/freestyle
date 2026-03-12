# Deploy Runbook

## 1. DB Migration
1. Apply SQL in order:
- `supabase/migrations/001_core_tables.sql`
- `supabase/migrations/002_jobs_tables.sql`
- `supabase/migrations/003_rls_policies.sql`
- `supabase/migrations/004_indexes.sql`
2. Verify tables and RPC functions exist.

## 2. Railway Deploy
1. Deploy `api` service.
2. 기본 운영은 `worker_importer`만 배포/상시 실행한다.
3. `worker_importer` 환경 변수:
- `WORKER_NAME=worker`
- `WORKER_JOB_TYPES=all`
- `WORKER_POLL_INTERVAL_MS=3000`
- `WORKER_CLAIM_BATCH=5`
4. 고부하가 확인될 때만 stage별 worker를 추가 배포한다.
5. Verify each service has required environment variables.

## 3. Vercel Deploy
1. Set root directory to `apps/web`.
2. Set `BACKEND_ORIGIN` to Railway API domain.
3. Deploy and run smoke tests.

## 4. Smoke Tests
- `GET /healthz`
- `GET /readyz`
- `POST /v1/jobs/import/product`
- `GET /v1/jobs/:job_id`
- `GET /v1/assets`
- `POST /v1/jobs/evaluations`
- `POST /v1/jobs/tryons`
