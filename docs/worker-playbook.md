# Worker Playbook

## Common Runtime
- Queue source: Postgres `jobs` table
- Claim: RPC `claim_jobs(worker, job_types, batch)`
- Heartbeat: RPC `heartbeat_jobs(worker, job_ids)`
- Reaper: RPC `requeue_stale_jobs(stale_before, limit)`
- 기본 운영 모드: `workers/runtime/src/worker.ts`가 모든 job type을 한 프로세스에서 라우팅
- `WORKER_JOB_TYPES`를 지정하면 특정 job type만 처리하는 전용 worker로도 동일 런타임을 재사용

## Worker Matrix
1. `worker_importer` (기본 운영에서는 통합 worker 서비스 이름으로 재사용)
- Job types: `import.product_url`, `import.cart_url`, `import.upload_image`
- Output: `products`, `product_images`, `assets(original)`
- Next: `background_removal.process`

2. `worker_background_removal`
- Job type: `background_removal.process`
- Output: `assets.cutout_image_url`, `assets.mask_url`
- Next: `asset_processor.process`

3. `worker_asset_processor`
- Job type: `asset_processor.process`
- Output: thumbnails, category, pHash
- Final: `assets.status='ready'`

4. `worker_evaluator`
- Job type: `evaluator.outfit`
- Output: `outfit_evaluations.compatibility_score`, `explanation`

5. `worker_tryon`
- Job type: `tryon.generate`
- Output: `tryons.output_image_url`, `status='succeeded'`

## Recommended Railway Layout
1. 최소 비용 운영
- `api`
- `worker_importer` only
  - `WORKER_NAME=worker`
  - `WORKER_JOB_TYPES=all`

2. 확장 운영
- 병목 단계만 별도 서비스로 분리
- 분리 후에도 통합 worker는 남기지 말고 job type 소유권을 명확히 나눈다.

## Error Handling Rules
- Retryable: transient network/provider errors -> `queued` + backoff
- Terminal: `attempt >= max_attempts` -> `failed`
- Poison payload은 `error_code`, `error_message`에 기록

## Observability
- 모든 로그에 `job_id`, `user_id`, `worker_name`, `job_type` 포함
- 장애시 `jobs` 테이블 분포와 stale 상태를 먼저 확인
