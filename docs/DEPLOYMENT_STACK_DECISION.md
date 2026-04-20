# Deployment Stack Decision

Date: 2026-03-05  
Status: Accepted (updated)

## 1. 결정 요약
운영 스택을 아래 조합으로 고정한다.

1. Frontend(Product): Vercel (`apps/web`, project `freestyle`)
2. Frontend(Admin): Vercel (`apps/admin`, project `freestyleadmin`)
3. Backend(API): Railway (`apps/api`, Fastify `/v1/*`)
4. Background Processing: Railway Worker
   - 기본 운영: `worker_importer` 서비스를 단일 통합 worker로 사용
   - 현재 정책: 별도 stage worker Railway 서비스는 운영 토폴로지에서 제거
4. Queue: Supabase Postgres `jobs` polling (`FOR UPDATE SKIP LOCKED`)
5. Data/Auth/Storage: Supabase

## 2. 채택 이유
- Next.js UI 배포 DX와 글로벌 엣지 전달은 Vercel이 가장 효율적이다.
- Postgres `jobs` polling은 Redis 인프라 의존성을 제거하면서도 worker 분리를 유지할 수 있다.
- 통합 worker 모드는 Railway 서비스 수를 줄여 고정비를 가장 크게 절감한다.
- 현재 메인 제품은 `api + worker_importer`만으로도 충분하며, lab/legacy 전용 worker 서비스를 상시 운영할 이유가 없다.
- Supabase는 Postgres/Auth/Storage를 한 번에 제공해 데이터 계층 일관성이 높다.
- 프론트와 API를 물리 분리해 장애 전파 범위를 줄일 수 있다.

## 3. 코드 반영 원칙
1. 프론트의 `/api/*`, `/v1/*` 요청은 `BACKEND_ORIGIN` rewrite를 통해 Railway `/v1/*` API로 전달한다.
2. product 실코드 기준 경로는 `apps/web/src/**`이며, 클라이언트 API 호출은 `apps/web/src/lib/clientApi.ts`(`apiFetch`, `apiFetchJson`, `buildApiPath`)를 사용한다.
3. admin 실코드 기준 경로는 `apps/admin/src/**`이며, 클라이언트 API 호출은 `apps/admin/src/lib/adminApi.ts`를 사용한다.
4. API와 worker는 `packages/{shared,db,queue,storage}` 공통 계층을 통해 동작한다.
5. heavy task는 worker에서만 수행하고 API는 job 생성/조회만 담당한다.
6. 비용 최소화 기본값은 `api + 통합 worker 1개`이며, 메인 Railway 프로젝트에는 이 토폴로지만 유지한다.
7. lab 실험용 전용 worker가 필요하면 별도 임시 환경에서만 띄우고, main Railway 프로젝트에는 남기지 않는다.

## 4. 환경 변수 분리 원칙
1. Vercel(product frontend)
- Project Root: `apps/web`
- `BACKEND_ORIGIN=https://<railway-api-domain>`
- (선택) `NEXT_PUBLIC_API_BASE_URL` 직접 호출이 필요할 때만 사용

2. Vercel(admin frontend)
- Project Root: `apps/admin`
- Production URL: `https://freestyleadmin.vercel.app`
- `BACKEND_ORIGIN=https://<railway-api-domain>`
- `NEXT_PUBLIC_API_BASE_URL=https://<railway-api-domain>`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH_REQUIRED=true`

3. Railway(api/worker)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `STORAGE_PROVIDER=supabase|s3`
- `BG_REMOVAL_API_KEY`(or `REMOVE_BG_API_KEY`)
- `GEMINI_API_KEY` (공통 기본값) 또는 `EVALUATOR_GEMINI_API_KEY`, `TRYON_GEMINI_API_KEY`
- `EVALUATOR_MODEL=gemini-3.1-flash-lite-preview`, `TRYON_MODEL=gemini-3.1-flash-image-preview`
- `WORKER_POLL_INTERVAL_MS`, `WORKER_CLAIM_BATCH`, `WORKER_HEARTBEAT_SEC`
- `WORKER_JOB_TYPES=all` (통합 worker 기본값)

## 5. 비교 후보와 보류 사유
1. Railway 올인원
- 장점: 단일 벤더 단순성
- 보류: 프론트 배포 DX/캐시 전략에서 Vercel 이점이 더 큼

2. Vercel 단독 + 외부 큐 서비스 최소화
- 장점: 단순 배포
- 보류: 장시간 백그라운드 작업 안정성/제어가 제한됨

3. Cloud Run + GCP managed services
- 장점: 고확장/세밀 제어
- 보류: 현재 팀 운영 복잡도 대비 과투자

## 6. 배포 직전 체크
1. Vercel product/admin 프로젝트의 `BACKEND_ORIGIN` rewrite 정상 동작 확인
2. Railway API health + 통합 worker 프로세스 기동 확인
3. `jobs` RPC(`claim_jobs`, `heartbeat_jobs`, `requeue_stale_jobs`) smoke test
4. Supabase Auth/Storage/Postgres 권한(RLS/서비스키) 확인
5. `lint + typecheck + build` 및 주요 API smoke 테스트 통과

## 7. RC Freeze Reference
현재 release-candidate 기준 연결 리소스는 아래 조합으로 고정한다.

1. Vercel product project: `freestyle`
2. Vercel admin project: `freestyleadmin`
3. Railway production project/environment: `freestyle / production`
4. Railway production services: `api`, `worker_importer`
5. Supabase production project ref: `yczpjbwsszikuljstphi` (`fsp`)
6. Active RC evidence note: `docs/qa/phase6-batch2-release-evidence-2026-04-20.md`
