# Rollback Runbook

## Strategy
- Non-destructive rollback first: traffic routing rollback + workers disable.
- DB schema는 첫 릴리즈에서 destructive drop을 금지한다.

## Procedure
1. Vercel 환경 변수 `BACKEND_ORIGIN`을 이전 API로 되돌린다.
2. Railway 신규 worker 서비스들을 scale-to-zero 한다.
3. 신규 API 서비스 장애 시 이전 안정 버전으로 redeploy 한다.
4. `jobs` 테이블 처리 중인 항목을 분석 후 재큐잉 또는 취소 처리한다.

## Verification
- 사용자별 `assets`, `jobs`, `tryons` 조회가 정상인지 확인
- 에러율/지연율 정상화 확인
