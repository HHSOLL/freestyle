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
2. Deploy workers in order:
- importer
- background_removal
- asset_processor
- evaluator
- tryon
3. Verify each service has required environment variables.

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
