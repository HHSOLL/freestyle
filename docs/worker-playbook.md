# Worker Playbook

## Common Runtime
- Queue source: Postgres `jobs` table
- Claim: RPC `claim_jobs(worker, job_types, batch)`
- Heartbeat: RPC `heartbeat_jobs(worker, job_ids)`
- Reaper: RPC `requeue_stale_jobs(stale_before, limit)`

## Worker Matrix
1. `worker_importer`
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

## Error Handling Rules
- Retryable: transient network/provider errors -> `queued` + backoff
- Terminal: `attempt >= max_attempts` -> `failed`
- Poison payload은 `error_code`, `error_message`에 기록

## Observability
- 모든 로그에 `job_id`, `user_id`, `worker_name`, `job_type` 포함
- 장애시 `jobs` 테이블 분포와 stale 상태를 먼저 확인
