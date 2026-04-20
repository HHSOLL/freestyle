# Phase 6 Batch 2 Release Evidence (2026-04-20)

## Verdict

- `PASS`

## Scope

- 대상: `Phase 6 / Batch 2`
- 범위: env-backed lab create/status smoke, RLS/key-separation release checklist hardening, RC deployment freeze note

## Environment

- branch: `codex/phase6-batch2-security-rc`
- base commit: `67ad410`
- OS/CPU: `Darwin arm64`
- Node path: `/opt/homebrew/bin/node` via `PATH="/opt/homebrew/bin:$PATH"`
- linked product Vercel project: `freestyle`
- linked Railway project/environment: `freestyle / production`
- linked Supabase project ref: `yczpjbwsszikuljstphi`

## Command Evidence

1. Baseline gate
- `PATH="/opt/homebrew/bin:$PATH" npm run check`
- 결과:
  - `lint`, `typecheck`, `typecheck:admin`, `test:core`, `validate:garment3d`, `validate:avatar3d`, `validate:fit-calibration`, `build:services`, `build`, `build:admin` 통과

2. Focused compatibility regressions
- `PATH="/opt/homebrew/bin:$PATH" ./node_modules/.bin/tsx --test packages/db/src/assets-schema-compat.test.ts apps/api/src/modules/jobs/jobs.service.test.ts`
- 결과:
  - remote `assets` schema drift fallback
  - legacy job-status timestamp normalization
  - 두 회귀 모두 통과

3. Live env-backed lab smoke
- `PATH="/opt/homebrew/bin:$PATH" railway service link api`
- `PATH="/opt/homebrew/bin:$PATH" railway run ./node_modules/.bin/tsx --test apps/api/src/routes/product-boundary.routes.test.ts`
- 결과:
  - `8 passed, 0 failed, 0 skipped`
  - `POST /v1/lab/jobs/evaluations`
  - `POST /v1/lab/jobs/tryons`
  - `GET /v1/legacy/jobs/:job_id`
  - `GET /v1/lab/evaluations/:id`
  - `GET /v1/lab/tryons/:id`
  - 모두 linked Railway `api` service가 주입한 real `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 기반으로 검증

4. Remote env posture check
- `PATH="/opt/homebrew/bin:$PATH" vercel env ls development`
- `PATH="/opt/homebrew/bin:$PATH" vercel env ls preview`
- `PATH="/opt/homebrew/bin:$PATH" vercel env ls production`
- `PATH="/opt/homebrew/bin:$PATH" railway variable list --json`
- 결과:
  - Vercel browser surfaces에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `BACKEND_ORIGIN`만 존재함
  - `SUPABASE_SERVICE_ROLE_KEY`는 Railway backend env에만 존재함

## Screenshot Evidence

- this batch changed no product/admin UI code
- current visual evidence therefore reuses the `Phase 6 / Batch 1` screenshot set:
  - [Home](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/home.png)
  - [Closet](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/closet.png)
  - [Canvas](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/canvas.png)
  - [Community](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/community.png)
  - [Profile](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/profile.png)

## Security / RLS Acceptance

1. Browser / backend key separation
- browser-facing Vercel env keeps low-privilege Supabase vars only
- backend-only `SUPABASE_SERVICE_ROLE_KEY` remains on Railway `api`

2. Published garment persistence posture
- `published_runtime_garments` remains authenticated-read only
- writes remain API/service-role mediated as documented in [docs/api-contract.md](/Users/sol/Desktop/fsp/docs/api-contract.md)

3. Admin authz posture
- `/v1/admin/garments*` rejection of anonymous fallback and non-admin callers remains covered by the current route suite and baseline `test:core`

4. Trace artifact rule
- no browser smoke retry/failure occurred in this batch, so no new trace artifact was produced
- active release docs now require trace retention on future retry/failure runs

## Drift Found And Closed

1. Remote `assets` insert compatibility
- live smoke exposed a production-store drift where optional post-migration asset columns were absent from the remote schema cache
- the DB layer now retries asset creation with the legacy-required column set so the queued lab path remains functional against older remote stores

2. Legacy job-status timestamp compatibility
- live smoke exposed offset-formatted timestamps from the remote store on `/v1/legacy/jobs/:job_id`
- the jobs read adapter now normalizes those timestamps into canonical ISO `...Z` strings before public schema parsing

## RC Freeze Note

- stack reference is frozen in [docs/DEPLOYMENT_STACK_DECISION.md](/Users/sol/Desktop/fsp/docs/DEPLOYMENT_STACK_DECISION.md)
- current active RC evidence for the hardening program is this file plus [Phase 6 Batch 1 Release Evidence](/Users/sol/Desktop/fsp/docs/qa/phase6-batch1-release-evidence-2026-04-19.md)
