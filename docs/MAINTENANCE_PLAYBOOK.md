# Maintenance Playbook

## 1. 일일 체크리스트
1. `docs/TECH_WATCH.md` 당일 점검 여부 확인
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. 주요 API smoke check
- `/healthz`
- `/readyz`
- `/v1/jobs/import/product`
- `/v1/jobs/{job_id}`
- `/v1/assets`
- `/v1/jobs/evaluations`
- `/v1/jobs/tryons`
- `/v1/auth/naver/start`
- `/auth/callback`

## 2. 배포 전 체크리스트
1. 환경 변수 확인
- Vercel 프론트의 `BACKEND_ORIGIN` 설정 여부(`/api/*` -> Railway `/v1/*` rewrite)
- Vercel 프론트의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 여부
- Vercel 프론트의 `NEXT_PUBLIC_AUTH_KAKAO_ENABLED`, `NEXT_PUBLIC_AUTH_NAVER_ENABLED` 설정 여부
- Vercel 프로젝트 루트가 `apps/web`인지, 또는 루트 배포 시 `npm run build`가 `@freestyle/web`를 호출하는지 확인
- `apps/web` 내부에 `postcss.config.mjs`와 Tailwind/PostCSS 의존성이 존재하는지 확인(독립 workspace 빌드 기준)
- Supabase 관련 키 (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`)
- Supabase Auth `site_url`, `uri_allow_list`에 현재 운영 도메인과 `/auth/callback`이 등록되어 있는지 확인
- Railway 각 서비스에 `RAILWAY_DOCKERFILE_PATH=infra/docker/railway/<service>.Dockerfile`가 설정되어 있는지 확인
- Railway API에 `API_PUBLIC_ORIGIN`, `CORS_ORIGIN`, `CORS_ORIGIN_PATTERNS`가 운영 도메인 정책과 일치하는지 확인
- Naver bridge를 쓰는 경우 Railway API에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_STATE_SECRET`가 설정되어 있는지 확인
- Storage provider 설정 (`STORAGE_PROVIDER=supabase|s3`, 필요 시 `S3_*`)
- AI provider 키 (`BG_REMOVAL_API_KEY`, `GEMINI_API_KEY` 또는 `EVALUATOR_GEMINI_API_KEY`/`TRYON_GEMINI_API_KEY`)
- Gemini image preview quota가 실제 활성 상태인지 확인 (`GEMINI_RATE_LIMITED` + `limit: 0`이면 코드 문제가 아니라 계정 quota/billing 문제로 간주)
- worker polling 설정 (`WORKER_POLL_INTERVAL_MS`, `WORKER_CLAIM_BATCH`, `WORKER_HEARTBEAT_SEC`)
2. 데이터 경로 확인
- Supabase Storage bucket 또는 S3 bucket 접근 권한
- Supabase Storage bucket(`freestyle-assets`) public URL이 유효한지 확인
3. 큐 워커 가동 확인
- 최소 비용 운영이면 `worker_importer`(통합 worker)만 상시 실행
- scale-out 운영이면 필요한 전용 worker만 추가 실행
- `WORKER_JOB_TYPES`가 운영 의도와 일치하는지 확인
- Railway restart policy는 worker/API 모두 `Always` 또는 장애 복구 가능한 값으로 유지하고, ephemeral filesystem에 결과물을 저장하지 않는다.
4. 오류 로그 확인
- 네트워크 타임아웃/외부 API 오류/스토리지 권한
- Vercel 프론트 5xx/404 발생 시 rewrite 대상(`BACKEND_ORIGIN`) 및 Railway API health 동시 확인
5. 품질 파이프라인 확인
- `.github/workflows/quality.yml` 성공 여부 확인

## 3. 장애 대응 가이드
1. 프론트/백엔드 라우팅 이슈
- 증상: Vercel 프론트에서 `/api/*` 요청이 404/5xx
- 점검: `BACKEND_ORIGIN` 값, Railway `api` 서비스 도메인/헬스체크, rewrite 적용 여부
- 점검: 필요 시 `NEXT_PUBLIC_API_BASE_URL` 직접 호출 모드로 우회하되 CORS 설정 동기화

1-1. 소셜 로그인/리다이렉트 이슈
- 증상: OAuth 후 로그인은 되었는데 엉뚱한 도메인/페이지로 이동하거나 바로 실패
- 점검: Supabase Auth `site_url`, `uri_allow_list`, Vercel 운영 도메인(`/auth/callback`)
- 점검: Kakao는 Supabase provider enabled 상태와 redirect URL 등록 여부
- 점검: Naver는 Railway `API_PUBLIC_ORIGIN`과 Naver developer console redirect URL 일치 여부
- 점검: `CORS_ORIGIN`, `CORS_ORIGIN_PATTERNS`에 현재 Vercel preview/production origin이 포함되는지 확인

2. Jobs polling 이슈
- 증상: job이 `queued`에서 오래 대기
- 점검: worker 프로세스 상태, `claim_jobs` RPC 권한, `jobs(status, run_after)` 인덱스
- 점검: 통합 worker 사용 중이면 `WORKER_JOB_TYPES=all` 또는 필요한 타입이 포함되어 있는지 확인
- 점검: stale job이 쌓이면 `requeue_stale_jobs` 동작/heartbeat 지연 여부 확인
- 호환 fallback: 원격 DB에 jobs RPC가 아직 없으면 워커는 optimistic claim fallback으로 구동된다. 다중 인스턴스 확장 전에는 반드시 `002_jobs_tables.sql`의 RPC를 원격 DB에 적용한다.

3. 배경 제거 실패
- 증상: `removedBackground=false`, 경고 반환
- 점검: `BG_REMOVAL_API_KEY`/`REMOVE_BG_API_KEY`, provider endpoint, 요청 제한(rate-limit)
- 누끼 워커 실패 시 `assets.status='failed'` 및 `jobs.error_*` 기록 확인

4. 리뷰 생성 실패
- 점검: evaluator worker 가동 여부, provider 키/모델명, payload 크기

5. 저장 실패
- Supabase 설정 유효성 확인
- Storage bucket 권한/공개 URL 정책 확인

6. 링크/장바구니 import 실패 코드
- `NO_IMAGE_FOUND`: 페이지에서 유효 후보 이미지를 찾지 못함
- `ONLY_MODEL_IMAGES_FOUND`: 후보는 있었지만 누끼 품질 검증에서 모델컷/과대 bbox로 판정
- `CUTOUT_NOT_AVAILABLE`: remove.bg 키 미설정 또는 배경 제거 서비스 사용 불가
- `CUTOUT_QUALITY_TOO_LOW`: 누끼 결과가 품질 임계치를 통과하지 못함
- `FETCH_BLOCKED_OR_LOGIN_REQUIRED`: 대상 페이지 접근 제한/로그인 필요
- `UNKNOWN_IMPORT_ERROR`: 상기 분류 외 예외
- `NO_IMPORTABLE_PRODUCTS`: 장바구니 import에서 모든 항목이 실패

무신사 상세페이지 품질 보강:
- `musinsa.com/products/*`는 구조화 스크립트 후보와 goods 경로 힌트를 우선해 단독 상품컷을 먼저 시도한다.
- 무신사 상품 상태 스크립트(`goodsImages`, `thumbnailImageUrl`)에서 추출한 후보를 우선 사용하며, 로고/배너/파비콘 경로는 후보에서 제외한다.
- 자동 판별 실패 시 후보 모달에는 무신사 상세 대표 이미지군을 넓게 노출해 사용자가 색상/컷을 직접 고를 수 있게 유지한다.
- 단독컷이 아닌 스타일/스냅 이미지가 계속 선택되면 `attempts`의 `candidateUrl`, `source`, `finalScore`를 확인해 키워드 가중치와 차단 패턴을 조정한다.
- 무신사 링크에서 `ONLY_MODEL_IMAGES_FOUND`가 반복되면 상위 후보 외 fallback 후보 재시도(확대된 후보 풀/시도 수) 결과를 우선 확인한다.
- URL import UI는 `ONLY_MODEL_IMAGES_FOUND` 시 후보 이미지 선택 모달을 제공한다. 사용자가 선택한 `selectedImageUrl` 재시도에서도 실패하면 `attempts`의 stage/quality를 확인해 임계값 또는 소스 스코어를 조정한다.
- 현재 `/v1/jobs/import/product`는 실패 시 `jobs.result.candidates`로 후보 목록을 반환하므로, UI가 뜨지 않으면 `GET /v1/jobs/:job_id` 응답의 `result` 필드를 먼저 확인한다.
- 수동 후보 선택에서도 실패가 반복되면 `attempts[].stage === "trim"` + `quality.reason`을 먼저 보고 `FOREGROUND_TOO_SMALL` 외 과검증 케이스인지 확인한다.

운영 원칙:
- 위 코드가 발생하면 실패 항목으로만 집계하고 에셋 저장은 하지 않는다.
- 장바구니 import는 부분 성공을 허용하며 실패 항목을 `failed[]`로 반환한다.
- 임포트는 기본적으로 `/v1/jobs/import/*` 비동기 큐 경로를 사용한다(대량 처리/타임아웃 회피).
- 프론트 실코드 기준 경로는 `apps/web/src/**`이며, 루트 `src/**` 수정은 레거시 유지보수가 아닌 이상 새 작업 기준으로 사용하지 않는다.
- 임포트/평가/트라이온은 `/v1/jobs/*` 경로를 통해 단일 jobs 상태 계약으로 처리한다.
- URL/장바구니 import로 저장된 asset은 `sourceUrl`을 유지하고, Studio 요약/캔버스에서 말풍선 링크로 노출한다(운영 중 링크 누락 시 저장 payload 점검).
- 로컬 `index.json` 저장은 프로세스 내 mutex + atomic write를 사용한다. 다중 인스턴스 운영에서는 DB/오브젝트 스토리지 기반 저장소를 기본으로 사용한다.
- 운영 환경 응답에서는 `attempts` 상세 디버그 정보 노출을 비활성화한다(개발 환경에서만 활성화).
- 운영에서는 `ALLOWED_IMAGE_HOSTS`를 반드시 설정해야 URL/장바구니 import API가 동작한다.
- `ALLOWED_IMAGE_HOSTS`에는 상품 페이지 도메인과 이미지 CDN 도메인을 모두 등록한다.
- 링크/이미지 fetch는 redirect hop 검증 + DNS private 대역 차단 + 헤더/바디 타임아웃을 모두 적용한다.
- 운영에서 `STRICT_NO_MODEL_IMPORT=true`를 유지해 모델컷 전용 후보 저장을 차단한다.
- 운영에서 `HUMAN_FACE_MODEL_SOURCE=local`을 권장하고, 모델 파일 경로를 배포 아티팩트에 포함한다.
- Railway 비용을 줄이려면 기본적으로 `api + worker_importer(통합 worker)`만 유지하고, 나머지 worker 서비스는 `scale 0` 또는 제거 상태로 관리한다.

## 4. 유지보수 원칙
- 작은 수정도 lint/typecheck/build를 통과시킨다.
- 사용자 영향이 있는 변경은 문서를 먼저/같이 갱신한다.
- 비동기 처리 경로는 timeout/재시도 정책을 명시한다.
- page 파일이 비대해지면 즉시 feature 컴포넌트로 분리한다.

## 5. PR/변경 로그 규칙
- 변경 목적, 영향 범위, 롤백 방법을 짧게 기록한다.
- 문서 변경 파일을 누락하지 않는다.
- UI 대형 변경 시 최소 한 번 수동 시나리오 확인 결과를 남긴다.
