# Deploy Runbook

## 1. DB Migration
1. Apply SQL in order:
- `supabase/migrations/001_core_tables.sql`
- `supabase/migrations/002_jobs_tables.sql`
- `supabase/migrations/003_rls_policies.sql`
- `supabase/migrations/004_indexes.sql`
- `supabase/migrations/005_outfits_user_ownership.sql`
2. Verify tables and RPC functions exist.
3. Verify `outfits.user_id` is populated and indexed before deploying the new `/v1/outfits` API.

## 2. Railway Deploy
1. Deploy `api` service.
2. 기본 운영은 `worker_importer` 단일 통합 worker만 배포/상시 실행한다.
3. `worker_importer` 환경 변수:
- `WORKER_NAME=worker`
- `WORKER_JOB_TYPES=all`
- `WORKER_POLL_INTERVAL_MS=3000`
- `WORKER_CLAIM_BATCH=5`
4. Main Railway project production topology is `api + worker_importer` only. This was re-verified after live cleanup on `2026-04-14`.
5. If legacy services reappear in a cloned environment, remove `worker_background_removal`, `worker_asset_processor`, `worker_evaluator`, and `worker_tryon` before calling the environment clean.
6. Verify the remaining services have required environment variables.
7. 원격 서비스 삭제가 막히면 `railway login`으로 owner session을 다시 연결한 뒤 정리한다.

## 3. Vercel Deploy
1. Run Vercel deploys from the monorepo root, not from an app subdirectory.
2. Product project `freestyle` must keep root directory `apps/web`.
3. Admin project `freestyleadmin` must keep root directory `apps/admin`.
4. Set both frontend projects `BACKEND_ORIGIN` to the Railway API domain.
5. Set admin `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_AUTH_REQUIRED=true`.
6. Deploy both surfaces and run smoke tests.
7. If preview envs are needed, add them with explicit branch scope in the Vercel CLI or set them in the dashboard.

## 4. Smoke Tests
- `GET /healthz`
- `GET /readyz`
- `POST /v1/jobs/import/product`
- `GET /v1/jobs/:job_id`
- `GET /v1/assets`
- `POST /v1/outfits`
- `GET /v1/outfits`
- `GET /v1/outfits/share/:slug`
- `POST /v1/jobs/evaluations`
- `POST /v1/jobs/tryons`
