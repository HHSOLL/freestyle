# Architecture (Vercel + Railway + Supabase)

## Topology
- User -> Vercel Web (`apps/web`) -> Railway API (`apps/api`) -> Railway Workers (`workers/*`) -> Supabase (DB/Auth/Storage)
- 무거운 처리(이미지 파싱/누끼/임베딩/평가/VTO)는 전부 worker에서 수행한다.

## Service Boundaries
- Web: UI, 인증 세션, job 생성 요청, 상태 폴링, 결과 렌더
- Web auth flow:
  - Email/Kakao -> Supabase session
  - Naver -> Railway OAuth bridge -> Supabase admin magic link -> Supabase session
- API: 인증/입력 검증/행 생성/잡 enqueue/status 조회
- Workers:
  - 기본 운영: runtime worker 1개가 importer/background_removal/asset_processor/evaluator/tryon을 모두 라우팅
  - 확장 운영: 병목 단계만 전용 worker로 분리

> 참고: 기존 루트 `src/app/api/*` 레거시 핸들러는 저장소 호환성 때문에 남아 있을 수 있으나, 프로덕션 런타임 소유권은 Railway `apps/api`의 `/v1/*` 계약으로 고정한다.

## Queue Model
- BullMQ/Redis를 크리티컬 패스에서 제거
- Postgres `jobs` 테이블 폴링 + `FOR UPDATE SKIP LOCKED`
- 공유 런타임 규약:
  - Poll interval: `WORKER_POLL_INTERVAL_MS` (default 750ms)
  - Claim batch: `WORKER_CLAIM_BATCH` (default 10)
  - Heartbeat: `WORKER_HEARTBEAT_SEC` (default 10s)
  - Stale timeout: `WORKER_STALE_JOB_MINUTES` (default 5m)
  - Route filter: `WORKER_JOB_TYPES` (`all` 또는 comma-separated job types)

## Data Isolation
- 모든 사용자 데이터 테이블은 `user_id` 소유권 기반
- RLS 정책은 `auth.uid() = user_id`
- API/Workers는 service-role 키로 동작 (RLS bypass)
- 브라우저 redirect/OAuth callback은 `site_url`, `uri_allow_list`, `CORS_ORIGIN`, `CORS_ORIGIN_PATTERNS`를 함께 맞춰야 한다.

## Pipeline
1. Importer
- Product URL/Cart URL/Upload image를 처리해 `products`, `product_images`, `assets(original)` 생성
- 다음 단계 `background_removal.process` enqueue

2. Background Removal
- 배경제거 provider 호출 후 cutout 저장
- `assets.cutout_image_url` 업데이트
- 다음 단계 `asset_processor.process` enqueue

3. Asset Processor
- 썸네일, 카테고리, pHash 계산
- `assets.status=ready`

4. Evaluator
- 코디 payload 평가 후 `outfit_evaluations` 업데이트

5. Try-on
- 입력 이미지 + asset 기반 결과 생성/저장 후 `tryons` 업데이트
