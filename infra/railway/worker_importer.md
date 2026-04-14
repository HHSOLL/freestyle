# Railway Service: worker_importer

## Runtime
- Dockerfile: `infra/docker/railway/worker-importer.Dockerfile`
- Start Command: `npm run serve:worker`
- 기본값: `WORKER_JOB_TYPES=all` (통합 worker 모드)

## Handles
- `import.product_url`
- `import.cart_url`
- `import.upload_image`
- `background_removal.process`
- `asset_processor.process`
- `evaluator.outfit`
- `tryon.generate`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`
- `SUPABASE_STORAGE_BUCKET` (if provider=supabase)

## Optional
- `WORKER_POLL_INTERVAL_MS=3000` (저비용 기본 추천)
- `WORKER_CLAIM_BATCH=5` (저비용 기본 추천)
- `WORKER_HEARTBEAT_SEC=10`
- `WORKER_JOB_TYPES=all|job_type,...`
- `RAILWAY_DOCKERFILE_PATH=infra/docker/railway/worker-importer.Dockerfile`

## Cost Optimization
- 기본 운영은 이 서비스 하나만 상시 실행한다.
- `worker_background_removal`, `worker_asset_processor`, `worker_evaluator`, `worker_tryon`는 main Railway 프로젝트에서 제거 대상이다.
- `2026-04-14` 기준 main `freestyle` Railway 프로젝트의 실서비스 토폴로지는 `api + worker_importer`로 정리되었다.
