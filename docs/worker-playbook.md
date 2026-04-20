# Worker Playbook

## Common Runtime
- Queue source: Postgres `jobs` table
- Claim: RPC `claim_jobs(worker, job_types, batch)`
- Heartbeat: RPC `heartbeat_jobs(worker, job_ids)`
- Reaper: RPC `requeue_stale_jobs(stale_before, limit)`
- 기본 운영 모드: `workers/runtime/src/worker.ts`가 모든 job type을 한 프로세스에서 라우팅
- `WORKER_JOB_TYPES`를 지정하면 특정 job type만 처리하는 전용 worker로도 동일 런타임을 재사용
- queued payload contract: `job-payload.v1`
  - fields: `schema_version`, `job_type`, `trace_id`, optional `idempotency_key`, `data`
  - legacy bare payload rows are still read, but workers normalize them before handling
- stored worker result contract: `job-result.v1`
  - fields: `schema_version`, `job_type`, `trace_id`, optional `progress`, `artifacts`, `metrics`, `warnings`, `data`
  - legacy raw result blobs are still readable, but queue writes now store canonical envelopes
- reserved offline simulation contract: `fit_simulate_hq_v1`
  - versioned request/result schemas now exist in `packages/contracts`
  - no active handler is registered yet, so this job type should not be routed in production until the worker batch lands

## Job Handler Matrix
1. `worker_importer` handler
- 기본 운영에서는 이 이름을 통합 worker Railway 서비스 이름으로 재사용
- Job types: `import.product_url`, `import.cart_url`, `import.upload_image`
- Output: `products`, `product_images`, `assets(original)`
- Next: `background_removal.process`

2. `worker_background_removal` handler
- Job type: `background_removal.process`
- Output: `assets.cutout_image_url`, `assets.mask_url`
- Next: `asset_processor.process`

3. `worker_asset_processor` handler
- Job type: `asset_processor.process`
- Output: thumbnails, category, pHash
- Final: `assets.status='ready'`

4. `worker_evaluator` handler
- Job type: `evaluator.outfit`
- Output: `outfit_evaluations.compatibility_score`, `explanation`
- current runtime note: queued evaluator payloads are normalized through the canonical job envelope before handling
- failure handling also marks `outfit_evaluations.status='failed'` so lab detail reads do not stay stuck in `processing`

5. `worker_tryon` handler
- Job type: `tryon.generate`
- Output: `tryons.output_image_url`, `status='succeeded'`
- current runtime note: queued try-on payloads are normalized through the canonical job envelope before handling
- failure handling also marks `tryons.status='failed'` and writes `error_message`

6. reserved `worker_fit_simulate_hq` contract
- Reserved job type: `fit_simulate_hq_v1`
- Expected output artifact kinds: `draped_glb`, `fit_map_json`, `preview_png`
- Status: contract only; handler, storage write path, and production routing are not implemented yet

## Recommended Railway Layout
1. 최소 비용 운영
- `api`
- `worker_importer` only
  - `WORKER_NAME=worker`
  - `WORKER_JOB_TYPES=all`

2. main Railway 운영 원칙
- `worker_importer` 외의 별도 worker 서비스는 main Railway 프로젝트에 남기지 않는다.
- `worker_background_removal`, `worker_asset_processor`, `worker_evaluator`, `worker_tryon`는 handler 이름으로는 유지되지만, 별도 Railway 서비스로는 과거 분리 운영의 잔재로 간주하고 제거한다.
- 특정 job type만 분리 실험해야 하면 별도 임시 환경에서만 사용한다.

## Error Handling Rules
- Retryable: transient network/provider errors -> `queued` + backoff
- Terminal: `attempt >= max_attempts` -> `failed`
- Poison payload은 `error_code`, `error_message`에 기록
- duplicate prevention is now user-scoped: `(user_id, job_type, idempotency_key)`

## Observability
- 모든 success/failure 로그에 `job_id`, `user_id`, `worker_name`, `job_type`, `trace_id` 포함
- canonical payload metadata가 있으면 `idempotency_key`도 함께 남긴다
- 장애시 `jobs` 테이블 분포와 stale 상태를 먼저 확인
