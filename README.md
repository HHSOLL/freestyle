# FreeStyle

AI 기반 스타일 큐레이션/가상 피팅 실험을 위한 Next.js 애플리케이션입니다.

## 핵심 기능
- Studio: 에셋 업로드/URL 임포트/장바구니 링크 임포트, 배경 제거, 캔버스 조합
  - 임포트는 `import-jobs` 큐를 통해 비동기 처리(대량/지연 작업 안정화)
  - 캔버스 아이템 선택/드래그는 이미지 알파 픽셀 기준 hit-test를 사용(투명 영역 클릭/드래그 방지)
  - 캔버스 비율(custom w:h)과 너비(%)를 조절해도 비율을 유지한 채 다운로드 가능
  - URL/장바구니 임포트는 다중 후보 수집(JSON-LD/meta/img/구조화 스크립트) + 스코어링 + 누끼 품질 검증 + 알파 기반 트리밍으로 저장
  - 무신사(`musinsa.com/products/*`) 링크는 상품 상태 스크립트(`goodsImages`, `thumbnailImageUrl`)와 구조화 스크립트 후보를 함께 수집하고, CDN 경로로 정규화해 상품 이미지를 우선 시도
  - 무신사 링크는 단독컷 누락을 줄이기 위해 후보 풀/시도 수를 확대하고 단독컷 패턴 후보를 보강 시도
  - 자동 판별 실패(`ONLY_MODEL_IMAGES_FOUND`) 시 대표 이미지 후보(무신사의 경우 상세 대표 이미지군 전체 우선)를 사용자에게 보여주고, 선택한 URL로 재시도 가능
  - URL/장바구니로 가져온 asset은 원본 상품 링크(`sourceUrl`)를 함께 저장하며, 스튜디오 캔버스/코디 요약에서 말풍선 형태로 링크를 바로 열 수 있음
- AI Try-on: 큐 기반 가상 피팅 요청/결과 조회
- AI Review: 코디 이미지 기반 스타일 피드백 생성
- Outfit Share: 코디 저장 및 슬러그 기반 공유 페이지
- Feed(/trends): 트렌드 피드(인기순/최신순 + 성별/계절/스타일 필터), 상세 모달은 제작자/코디명/카테고리/설명 중심으로 제공
- Profile: 개인 아카이브

## 기술 스택
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, Framer Motion
- `next/font/local` 기반 로컬 폰트(A2J, 100~900 woff2)
- Sharp (이미지 메타데이터/알파 트리밍)
- Supabase Postgres jobs polling queue (`FOR UPDATE SKIP LOCKED`)
- Supabase (선택: 연결 시 원격 저장, 미연결 시 로컬 폴백)

## 목표 운영 스택(2026-03 기준)
- Frontend(Web): Vercel
- Backend(API): Railway (`apps/api`, `/v1/*`)
- Worker: Railway Worker (`workers/runtime`)
  - 기본 운영: `api + 통합 worker 1개`
  - scale-out 필요 시에만 `importer/background_removal/asset_processor/evaluator/tryon`을 개별 서비스로 분리
- Queue: Supabase Postgres `jobs` table polling
- DB/Auth/Storage: Supabase

프론트/백 분리 배포를 위해 Vercel 프론트(`apps/web`)에서는 `BACKEND_ORIGIN`을 설정해 `/api/*` 또는 `/v1/*` 요청을 Railway `/v1/*` API로 rewrite 프록시합니다.
인증은 Supabase browser session을 사용하며, `apps/web`는 세션 access token을 Railway API `Authorization: Bearer` 헤더로 전달합니다.
소셜 로그인 정책은 다음과 같습니다.
- Kakao: Supabase native OAuth provider 사용
- Naver: Railway API OAuth bridge -> Supabase admin magic link 브리지 사용

## 모노레포 구조 (Big-Bang 전환)
```txt
apps/web            # Vercel frontend
apps/api            # Railway API (Fastify)
workers/*           # Railway background workers
packages/*          # shared/db/queue/storage/observability
supabase/migrations # DB/RLS/index/RPC
infra/*             # deploy docs + runbooks
```

## 빠른 시작
```bash
npm install
cp .env.example .env.local
npm run dev
```
`npm run dev`는 안정성을 위해 webpack 모드로 실행됩니다.  
Turbopack 개발 서버가 필요하면 `npm run dev:turbo`를 사용합니다.

통합 개발(웹 + 워커):
```bash
npm run dev:all
```
`dev:all`은 `apps/web + apps/api + 통합 worker`를 함께 실행합니다.

API/워커 개별 실행:
```bash
npm run dev:api
npm run dev:worker
npm run dev:worker:importer
npm run dev:worker:background-removal
npm run dev:worker:asset
npm run dev:worker:evaluator
npm run dev:worker:tryon
```

품질 점검:
```bash
npm run lint
npm run typecheck
npm run build:services
npm run build
npm run check
```

## 코드 구조 원칙
- `apps/web/src/app/**/page.tsx`: 상태/데이터 흐름 중심
- `apps/web/src/features/<domain>/components`: 화면 조각/프리젠테이션
- `apps/web/src/features/<domain>/{types,constants,utils}.ts`: 도메인 로직 단위 분리
- `apps/web/src/components/brand`: FreeStyle 로고 컴포넌트
- `apps/web/public/branding`: FreeStyle 브랜드 에셋(`freestyle-logo.svg`, `freestyle-mark.svg`)

현재 `studio`, `profile`, `trends(feed)`는 기능 단위 컴포넌트 구조를 사용합니다.

## CI 품질 게이트
- `.github/workflows/quality.yml`에서 PR/`main` push마다 `lint + typecheck + build`를 검사합니다.

## 환경 변수
`.env.local`에 설정합니다.

필수/권장 키:
- `BACKEND_ORIGIN` (Vercel 프론트에서 `/api/*`를 Railway로 프록시할 때 사용)
- `NEXT_PUBLIC_API_BASE_URL` (rewrite를 쓰지 않는 직접 호출 모드에서만 사용)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (웹 로그인/세션)
- `NEXT_PUBLIC_AUTH_KAKAO_ENABLED`, `NEXT_PUBLIC_AUTH_NAVER_ENABLED` (프론트 소셜 로그인 버튼 노출/활성 상태)
- `NEXT_PUBLIC_AUTH_REQUIRED` (기본값 `false`, `true`일 때만 Studio 로그인 강제)
- `GEMINI_API_KEY` (Gemini 기반 코디 평가 + 가상 피팅 공통 기본 키)
- `EVALUATOR_GEMINI_API_KEY`, `EVALUATOR_MODEL` (평가 전용 키/모델 override, 기본 모델: `gemini-3.1-flash-lite-preview`)
- `TRYON_GEMINI_API_KEY`, `TRYON_MODEL` (가상 피팅 전용 키/모델 override, 기본 모델: `gemini-3.1-flash-image-preview`)
- `REMOVE_BG_API_KEY` (배경 제거)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase 연동 시)
- `SUPABASE_STORAGE_BUCKET` (Supabase Storage 버킷)
- `STORAGE_PROVIDER=supabase|s3`
- `API_PUBLIC_ORIGIN` (Railway callback URL 구성 시 사용)
- `CORS_ORIGIN`, `CORS_ORIGIN_PATTERNS` (Railway API direct-call / OAuth redirect origin allowlist)
- `ALLOW_ANONYMOUS_USER` (기본값 `true`, 토큰이 없을 때 브라우저별 익명 UUID 허용)
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_STATE_SECRET` (네이버 OAuth bridge)
- `WORKER_JOB_TYPES=all|job_type,...` (Railway 통합 worker가 처리할 작업 타입 필터)

선택 키:
- `ALLOWED_IMAGE_HOSTS`, `ASSET_STORAGE_PATH`, `ASSET_INDEX_PATH`
- `OUTFITS_STORAGE_PATH`, `BG_REMOVAL_CONCURRENCY`, `VTO_CONCURRENCY`
- `IMPORT_CONCURRENCY`, `IMPORT_CART_ITEM_CONCURRENCY`
- `GEMINI_MAX_ATTEMPTS`, `REMOVE_BG_ENDPOINT`, `REMOVE_BG_SIZE`
- `HUMAN_DETECTION_MODE`, `HUMAN_DETECTION_MAX_CANDIDATES`, `HUMAN_DETECTION_MAX_SIDE`
- `HUMAN_FACE_MIN_AREA_RATIO`, `HUMAN_FACE_PENALTY_BASE`, `HUMAN_FACE_PENALTY_SLOPE`
- `HUMAN_FACE_MODEL_SOURCE`, `HUMAN_FACE_MODEL_PATH`, `HUMAN_FACE_MODEL_URL`
- `STRICT_NO_MODEL_IMPORT`
- `ALLOW_FILESYSTEM_STORAGE_IN_PRODUCTION`
  - 기본값은 `false`이며, 운영 환경에서 로컬 파일시스템 저장을 실수로 사용하는 것을 막습니다.
  - 운영에서 파일시스템 저장을 강제로 허용하려면 명시적으로 `true`를 설정해야 합니다.

운영 메모:
- 로그인 기능을 미루는 동안 Studio는 브라우저 localStorage 기반 익명 UUID를 `x-anonymous-user-id`로 전송해 사용자별 asset/job을 분리한다.
- 현재 운영 권장값은 `NEXT_PUBLIC_AUTH_REQUIRED=false`, `ALLOW_ANONYMOUS_USER=true`다.
- evaluator worker는 Gemini `gemini-3.1-flash-lite-preview`를 사용해 구조화된 JSON 평가를 저장합니다.
- tryon worker는 Gemini `gemini-3.1-flash-image-preview`를 사용해 사람 사진 + 의류 asset을 입력으로 받아 결과 이미지를 생성합니다.
- Gemini 키는 프로젝트 단위이므로 평가/가상피팅에 같은 `GEMINI_API_KEY`를 공통 사용하고, 모델만 `EVALUATOR_MODEL`/`TRYON_MODEL`으로 분리하는 구성을 기본값으로 권장합니다.
- Gemini 이미지 모델은 계정별 quota/billing 상태에 크게 영향을 받습니다. `GEMINI_RATE_LIMITED`가 발생하면 코드 문제가 아니라 현재 프로젝트의 이미지 생성 quota 부족일 가능성을 먼저 확인해야 합니다.

얼굴 신호 기반 후보 재랭킹(P1):
- `HUMAN_DETECTION_MODE=none|face` (기본 `none`)
- `face` 모드일 때 상위 K 후보만 얼굴 신호를 분석해 모델컷 패널티를 적용합니다.
- `HUMAN_FACE_MODEL_SOURCE=local|remote` (운영 기본 `local`)
- `local` 모드에서는 `HUMAN_FACE_MODEL_PATH` 경로의 모델을 사용합니다.
- `STRICT_NO_MODEL_IMPORT=true`(운영 기본)면 얼굴이 검출된 후보만 남는 경우 `ONLY_MODEL_IMAGES_FOUND`로 저장을 차단합니다.

운영 필수:
- `ALLOWED_IMAGE_HOSTS`를 설정해야 URL/장바구니 import API가 동작합니다.
- `ALLOWED_IMAGE_HOSTS`에는 상품 페이지 호스트와 이미지 CDN 호스트를 모두 포함해야 합니다.

## 문서
- 지침: `AGENTS.md`
- 개발 가이드: `docs/DEVELOPMENT_GUIDE.md`
- 유지보수 플레이북: `docs/MAINTENANCE_PLAYBOOK.md`
- 서브에이전트 팀/프롬프트: `docs/SUBAGENT_TEAM.md`
- 기술 동향 점검 로그: `docs/TECH_WATCH.md`
- 아키텍처: `docs/architecture.md`
- API 계약: `docs/api-contract.md`
- 워커 운영 가이드: `docs/worker-playbook.md`
- 배포 스택 결정 문서: `docs/DEPLOYMENT_STACK_DECISION.md`
- 도메인/CORS 런북: `infra/runbooks/domains-and-cors.md`
- 최신 점검/개선 리포트: `docs/PROJECT_HEALTH_2026-02-11.md`
- 최신 운영 준비 리포트: `docs/PROJECT_HEALTH_2026-02-13.md`

## 운영 메모
- heavy path는 worker 전용이며 API는 job 생성/조회만 담당합니다.
- Railway 비용 최소화 기본값은 `api + worker_importer(통합 worker 모드)`만 상시 실행하고 나머지 전용 worker 서비스는 `scale 0` 또는 미배포 상태로 두는 것입니다.
- Vercel 프론트는 `BACKEND_ORIGIN` 설정 시 rewrite로 `/api/*`를 Railway `/v1/*`로 전달합니다.
- `apps/web`는 Supabase magic-link 로그인 게이트를 사용하며, `studio`/`profile`은 인증 세션 없이는 API를 호출하지 않습니다.
- 로그인 콜백 기본 경로는 `/auth/callback`이며, magic link / Kakao / Naver 브리지 모두 이 경로로 세션을 회수합니다.
- Kakao는 Supabase Auth provider 설정이 필요하고, Naver는 Railway API에 `NAVER_*` 환경 변수와 redirect allowlist가 필요합니다.
- 프론트 실코드와 Next.js 빌드 소유권은 `apps/web`가 기준이며, 프로덕션에서는 Vercel 프로젝트 루트를 `apps/web`로 두는 구성이 가장 단순합니다.
- `apps/web`는 Vercel 독립 빌드를 위해 `package.json`, `package-lock.json`, `postcss.config.mjs` 등 빌드 설정 파일을 자체 소유합니다.
- 루트의 기존 `src/*`는 더 이상 프론트 런타임 기준 경로가 아닙니다.
- 신규 API 계약:
  - `POST /v1/jobs/import/product`
  - `POST /v1/jobs/import/cart`
  - `POST /v1/jobs/import/upload`
  - `GET /v1/jobs/:job_id`
  - `GET /v1/assets`
  - `POST /v1/jobs/evaluations`
  - `GET /v1/evaluations/:id`
  - `POST /v1/jobs/tryons`
  - `GET /v1/tryons/:id`
  - `GET /v1/auth/naver/start`
  - `GET /v1/auth/naver/callback`
- 운영에서 로컬 파일시스템 저장은 기본 차단되어 있으며(`ALLOW_FILESYSTEM_STORAGE_IN_PRODUCTION=false`), 의도한 경우에만 수동 허용합니다.
- 프로덕션 빌드는 안정성을 위해 `next build --webpack` 기준으로 실행합니다.
- 작업 전 문서 확인, 작업 후 문서 갱신은 필수 규칙입니다(`AGENTS.md`).
- Turbopack 루트는 프로젝트 경로로 고정되어 있어, 터미널 실행 위치가 달라도 루트 해석 오류 가능성을 줄였습니다.
