# Incident Runbook

## Primary Signals
- Job backlog 증가 (`queued` 급증)
- `processing` stale 증가 (`heartbeat_at` 지연)
- 특정 worker 실패율 급증

## Triage
1. `api /readyz` 상태 확인
2. `jobs` 상태 분포 확인
3. worker 로그에서 `job_id`, `user_id`, `worker_name` 기반 추적

## Common Mitigations
- 외부 API 장애: 해당 worker만 일시 중지
- stale jobs: `requeue_stale_jobs` 호출 확인
- 특정 payload poison: max_attempts 도달 후 `failed` 처리 확인

## Postmortem Checklist
- 원인 분류(코드/환경/외부 의존성)
- 영향 범위(user/job count)
- 재발 방지 액션(코드/알람/런북)
