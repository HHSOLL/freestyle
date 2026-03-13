# Development Guide

## 1. 목적
이 문서는 FreeStyle 코드베이스를 개발/확장할 때 필요한 기본 설계와 개발 규칙을 정리합니다.

## 2. 디렉토리 구조
- `apps/web`: Vercel 배포 대상 Next.js 프론트엔드
- `apps/api`: Railway 배포 대상 Fastify API (`/v1/*`)
- `workers/*`: 배경 처리 워커 정의 + 통합 런타임(`workers/runtime`)
- `packages/shared`: 공통 types/zod schemas/constants
- `packages/db`: Supabase DB query layer + job RPC 호출
- `packages/queue`: Postgres jobs polling loop
- `packages/storage`: Supabase/S3 어댑터
- `packages/observability`: 구조화 로깅
- `supabase/migrations`: 스키마/인덱스/RLS/RPC SQL
- `infra`: 배포 설정 문서 및 운영 runbook
- `docs`: 운영/개발 문서

## 3. 핵심 아키텍처
1. 프론트엔드/백엔드 경계
- 프론트(Vercel)는 페이지/UI/상태조회 렌더링만 담당하고, 백엔드(Railway API)는 `/v1/*` job 생성/조회만 담당한다.
- heavy task(이미지 파싱, 누끼, 임베딩, 평가, VTO)는 Railway worker에서만 수행한다.
- `BACKEND_ORIGIN` rewrite로 웹 `/api/:path*`, `/v1/:path*`를 Railway `/v1/:path*`로 전달한다.
- 서버 컴포넌트/SSR fetch는 rewrite를 타지 않으므로 `buildApiPath`에서 `BACKEND_ORIGIN` 또는 `NEXT_PUBLIC_API_BASE_URL` 절대 URL을 우선 사용한다.
- 인증은 `apps/web/src/lib/AuthContext.tsx`에서 Supabase browser session을 구독하고, `apps/web/src/lib/clientApi.ts`가 access token을 `Authorization: Bearer`로 자동 부착한다.
- 로그인 기능을 뒤로 미루는 단계에서는 `NEXT_PUBLIC_AUTH_REQUIRED=false`와 `ALLOW_ANONYMOUS_USER=true` 조합을 기본값으로 사용한다. 이때 `apps/web/src/lib/clientApi.ts`가 브라우저별 익명 UUID를 `x-anonymous-user-id` 헤더로 보내고, API는 이를 `user_id`로 사용해 asset/job을 분리한다.
- 로그인 콜백은 `apps/web/src/app/auth/callback/page.tsx`에서 수신한다. magic link / Kakao / Naver 브리지 모두 이 경로로 수렴시킨다.
- Kakao는 Supabase native OAuth provider를 사용하고, Naver는 `apps/api/src/routes/auth.routes.ts`의 OAuth bridge가 Naver 검증 후 Supabase admin magic link를 생성한다.
- `apps/web`는 Vercel의 독립 workspace 빌드를 전제로 하므로 Tailwind/PostCSS 등 웹 빌드 의존성과 설정 파일(`postcss.config.mjs`)을 워크스페이스 내부에 둔다.

2. 에셋 처리
- API에서 다음 job 생성 endpoint 제공:
  - `POST /v1/jobs/import/product`
  - `POST /v1/jobs/import/cart`
  - `POST /v1/jobs/import/upload`
  - `GET /v1/jobs/:job_id`
- importer worker가 `products`, `product_images`, `assets(original)`를 생성하고 `background_removal.process`를 enqueue한다.
- background_removal worker가 `assets.cutout_image_url`을 생성하고 `asset_processor.process`를 enqueue한다.
- asset_processor worker가 썸네일/pHash/카테고리를 생성한 뒤 `assets.status='ready'`로 종료한다.

3. 코디 저장/공유
- 공유/조회는 Railway API 기준 `GET /v1/outfits`, `GET /v1/outfits/share/:slug`를 사용한다.
- 프론트 프로필/공유 페이지는 `apps/web/src/lib/clientApi.ts`를 통해 동일한 `/v1/*` 계약을 사용한다.
- 코디 저장(write) 경로는 후속 단계에서 `/v1/outfits`로 일원화할 예정이며, 새 기능은 루트 Next route handler를 기준으로 추가하지 않는다.

4. AI 기능
- `POST /v1/jobs/evaluations` / `GET /v1/evaluations/:id`
- `POST /v1/jobs/tryons` / `GET /v1/tryons/:id`
- evaluator/tryon worker가 비동기 처리 후 상태/결과를 기록한다.

5. 인증 라우트
- `GET /v1/auth/naver/start?redirect_to=<absolute-url>`
- `GET /v1/auth/naver/callback`
- `redirect_to`는 절대 URL이어야 하며, API origin policy(`CORS_ORIGIN`, `CORS_ORIGIN_PATTERNS`)를 통과해야 한다.
- Naver callback은 state(HMAC) 검증 후 profile email을 Supabase admin `generateLink(type=magiclink)`에 연결한다.

6. 큐/워커
- 큐 백엔드는 Postgres `jobs` 테이블이다.
- claim은 RPC `claim_jobs` + `FOR UPDATE SKIP LOCKED`를 사용한다.
- heartbeat/reaper는 `heartbeat_jobs`, `requeue_stale_jobs` RPC로 수행한다.
- 원격 프로젝트에 jobs RPC가 아직 없는 경우, `packages/db`는 단일 인스턴스 배포 기준 optimistic claim/update fallback으로 계속 동작한다. 운영에서는 RPC 마이그레이션 적용을 우선하고, fallback은 호환성 안전장치로만 간주한다.
- `packages/queue`의 공통 런타임이 retry/backoff/poison 처리 규칙을 제공한다.

7. 페이지 구성 원칙
- 페이지(`apps/web/src/app/**/page.tsx`)에는 상태/데이터 흐름만 남긴다.
- UI는 `apps/web/src/features/<domain>/components`로 분리한다.
- 인증이 필요한 화면은 `AuthGate`로 보호하고, 인증 체크는 hook 호출 이후 return 하도록 유지해 React hook 순서를 깨지 않는다.
- `AuthGate`는 이메일 magic link와 소셜 로그인 버튼(Kakao/Naver)을 함께 렌더링한다. 소셜 버튼 활성 여부는 `NEXT_PUBLIC_AUTH_KAKAO_ENABLED`, `NEXT_PUBLIC_AUTH_NAVER_ENABLED`로 제어한다.
- Studio는 `NEXT_PUBLIC_AUTH_REQUIRED=true`일 때만 `AuthGate`를 강제하고, 기본 운영값(`false`)에서는 익명 사용자도 전체 파이프라인을 실행할 수 있어야 한다.
- 타입/상수/유틸은 같은 feature 폴더로 묶어 변경 영향을 국소화한다.
- Studio 캔버스는 `aspect-ratio` 기반으로 렌더링해 너비 조절 시에도 비율이 깨지지 않도록 유지한다.
- Studio 캔버스 에셋 선택/드래그는 알파 픽셀 hit-test를 우선 적용해 투명 영역 클릭 시 선택되지 않도록 유지한다.
- `/trends` 페이지는 단일 피드 화면으로 운영하며, 정렬(인기순/최신순)과 카테고리 필터(성별/계절/스타일)를 함께 제공한다.
- `/trends` 상세 모달은 이미지 가시성을 유지하도록 최소 높이를 보장하고, 텍스트는 제작자/코디명/카테고리/간단 설명 중심으로 제한한다.
- Studio 요약 패널/캔버스는 `asset.sourceUrl`이 있는 항목 클릭 시 링크 말풍선을 노출해 원본 상품 페이지로 즉시 이동할 수 있어야 한다.

## 4. 개발 규칙
- 타입 안정성 우선: `any` 사용 금지, `unknown + narrowing` 권장
- API 입력 검증: 필수 필드/타입 체크 후 처리
- 오류 처리: 사용자 메시지와 내부 로그를 분리
- 빌드 안정성: 모듈 import 시 외부 자원(Redis 등) 즉시 연결 금지, lazy init 사용
- 클라이언트 API 호출은 `apiFetch` 계층을 통해 일관화하고, 경로 하드코딩 분산을 피한다.
- OAuth redirect, magic link redirect 같은 브라우저 왕복 경로는 반드시 절대 URL + allowlist 검증을 같이 둔다. 상대 경로 임의 결합은 금지한다.
- 대형 페이지는 기능 단위 컴포넌트 분리를 기본값으로 적용
- 운영 안전 가드: 운영 환경에서 로컬 파일시스템 저장은 기본 차단(명시적 opt-in 필요)
- 전역 타이포그래피는 `apps/web/src/app/layout.tsx`의 `next/font/local` 등록(A2J)과 `apps/web/src/app/globals.css`의 `--font-sans`, `--font-serif` 변수 매핑으로 일관되게 관리한다.
- Studio 캔버스 이미지 export 텍스트도 `document.body`의 계산된 폰트 패밀리를 사용해 화면 렌더와 결과물이 동일하도록 유지한다.

## 5. 링크/장바구니 import 품질 규칙
1. 후보 선택
- 단일 대표 이미지 1개만 사용하지 않고 다중 후보(JSON-LD Product image, meta, img, background-image)를 수집한다.
- 특정 쇼핑몰(예: 무신사 상세페이지)은 구조화 스크립트에서 이미지 URL을 추가 수집해 단독 상품컷 후보를 보강한다.
- 무신사 상세페이지는 `window.__MSS__.product.state` / `__NEXT_DATA__`의 `goodsImages`, `thumbnailImageUrl`도 함께 수집해 후보 누락을 줄인다.
- 무신사의 `/images/*` 상대 경로 후보는 `https://image.msscdn.net` CDN 절대경로로 정규화한 뒤 검증/스코어링한다.
- URL 키워드 기반 스코어링으로 모델컷/썸네일 패널티, 상품 상세컷 보너스를 적용한다.
- 무신사 링크(`musinsa.com/products/*`)는 goods 경로(`/images/goods/*`) 보너스와 스타일/스냅 경로 패널티를 함께 적용해 단독 상품컷을 우선한다.
- 무신사 링크는 기본 후보 상위 N에서 실패하더라도 더 넓은 후보 풀(최대 24)과 추가 시도(기본 8)로 단독컷 패턴 후보를 재시도한다.
- 무신사 링크 후보 모달은 상품 상태/구조화 스크립트에서 찾은 상세 대표 이미지군을 우선해 가능한 많은 후보를 보여준다(색상/컷 직접 선택 용도).
- URL import가 자동 선택 실패로 종료되면, 상위 후보 URL/썸네일 목록을 `jobs.result.candidates`로 클라이언트에 전달하고 사용자가 후보를 직접 선택해 재시도할 수 있다.
- 사용자가 선택한 후보 URL은 `selected_image_url`로 importer job payload에 전달되며, 해당 후보를 우선 처리한 뒤 일반 fallback 후보를 순차 시도한다.
- 수동 선택(`selectedImageUrl`) 후보는 자동 품질 검증 실패 시에도 최소 안전 조건(초소형 foreground 제외)에서 우회 저장을 허용해 false-negative를 줄인다.
- 얼굴 신호 기반 재랭킹(P1): 상위 K 후보만 얼굴 분석을 수행하고 모델컷 패널티를 점수에 반영한다.
- 얼굴 모델 로딩은 `HUMAN_FACE_MODEL_SOURCE`로 제어한다(운영 기본 local 권장).
- 후보/원본 URL fetch는 redirect 체인을 수동 추적하며 매 hop마다 안전 URL 검증을 수행한다.
- DNS lookup 결과가 private/local 대역으로 해석되는 호스트는 차단한다(차단 결과만 TTL 캐시, safe 결과는 캐시하지 않음).
- 네트워크 호출은 헤더 타임아웃 + 바디 읽기 타임아웃을 함께 적용해 slow-stream 응답에 묶이지 않도록 한다.
- 운영 환경에서는 `ALLOWED_IMAGE_HOSTS` 미설정 시 URL 기반 import를 거부한다.
- `ALLOWED_IMAGE_HOSTS`는 상품 상세 페이지 호스트 + 이미지 CDN 호스트를 함께 포함해야 한다.

2. 누끼/트리밍
- remove.bg 결과를 그대로 저장하지 않고 알파 기반 트리밍(`postProcessCutout`)을 거친 뒤 저장한다.
- 저장 에셋의 실제 픽셀 크기가 피사체 bbox + padding이 되도록 한다(투명 여백 최소화).
- 이미지 다운로드/응답은 바이트 상한(`MAX_IMAGE_BYTES`, `MAX_REMOVE_BG_OUTPUT_BYTES`)을 강제한다.

3. 품질 게이트
- 누끼 결과가 임계치(`alphaAreaRatio`, `bboxAreaRatio`, 최소 trim 크기)를 통과하지 못하면 저장하지 않는다.
- 실패 코드는 `NO_IMAGE_FOUND`, `ONLY_MODEL_IMAGES_FOUND`, `CUTOUT_NOT_AVAILABLE`, `CUTOUT_QUALITY_TOO_LOW`, `FETCH_BLOCKED_OR_LOGIN_REQUIRED`를 사용한다.
- 단건/장바구니 모두 동일 파이프라인과 동일 실패 규칙을 사용한다.
- 단건 import는 서버에서 처리+저장을 완료한 뒤 `asset` 객체를 반환한다(클라이언트 2단계 저장 제거).
- 장바구니 import는 제한 병렬(동시 3)로 처리하고 실패 항목을 분리 반환한다.
- `STRICT_NO_MODEL_IMPORT=true`이면 `detector=blazeface`로 검증된 no-face 후보만 저장 후보로 인정한다.

## 6. 로컬 개발 절차
1. `npm install`
2. `.env.local` 준비
3. 웹만 개발: `npm run dev` (webpack 모드, 안정성 우선)
4. Turbopack 확인이 필요하면: `npm run dev:turbo`
5. API 개발: `npm run dev:api`
6. 워커 개발:
  - `npm run dev:worker`
  - `npm run dev:worker:importer`
  - `npm run dev:worker:background-removal`
  - `npm run dev:worker:asset`
  - `npm run dev:worker:evaluator`
  - `npm run dev:worker:tryon`
7. 통합 개발 스크립트: `npm run dev:all` (`apps/web + apps/api + 통합 worker`)
8. 품질 점검:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run check` (lint + typecheck + build)

## 7. 변경 시 문서 동기화
아래 항목 변경 시 문서를 반드시 같이 수정합니다.
- 새 API 추가/스키마 변경: 본 문서 + `docs/MAINTENANCE_PLAYBOOK.md`
- 환경 변수 추가: `README.md`
- 작업 규칙 변경: `AGENTS.md`
- 최신 최적화 채택: `docs/TECH_WATCH.md` + 관련 가이드
- 대형 리팩토링: `docs/PROJECT_HEALTH_YYYY-MM-DD.md`
