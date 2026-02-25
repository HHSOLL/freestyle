# FreeStyle

AI 기반 스타일 큐레이션/가상 피팅 실험을 위한 Next.js 애플리케이션입니다.

## 핵심 기능
- Studio: 에셋 업로드/URL 임포트/장바구니 링크 임포트, 배경 제거, 캔버스 조합
  - 임포트는 `import-jobs` 큐를 통해 비동기 처리(대량/지연 작업 안정화)
  - 캔버스 아이템 선택/드래그는 이미지 알파 픽셀 기준 hit-test를 사용(투명 영역 클릭/드래그 방지)
  - 캔버스 비율(custom w:h)과 너비(%)를 조절해도 비율을 유지한 채 다운로드 가능
  - URL/장바구니 임포트는 다중 후보 수집(JSON-LD/meta/img/구조화 스크립트) + 스코어링 + 누끼 품질 검증 + 알파 기반 트리밍으로 저장
  - 무신사(`musinsa.com/products/*`) 링크는 구조화 스크립트 후보 + goods 경로 힌트 우선순위를 적용해 단독 상품컷을 우선 시도
  - 무신사 링크는 단독컷 누락을 줄이기 위해 후보 풀/시도 수를 확대하고 단독컷 패턴 후보를 보강 시도
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
- BullMQ + Redis (비동기 작업 큐)
- Supabase (선택: 연결 시 원격 저장, 미연결 시 로컬 폴백)

## 목표 운영 스택(배포 전 의사결정 고정)
- Web/API: Render Web Service (`next start`)
- Worker: Render Background Worker (`worker:import`, `worker:bg`, `worker:vto`)
- Queue/Cache: Managed Redis/Valkey
- DB/Storage: Supabase Postgres + Storage

배포는 기능 완성 이후 진행하되, 현재 코드는 위 조합을 기준으로 운영 리스크가 낮아지도록 정리하고 있습니다.

## 빠른 시작
```bash
npm install
npm run dev
```
`npm run dev`는 안정성을 위해 webpack 모드로 실행됩니다.  
Turbopack 개발 서버가 필요하면 `npm run dev:turbo`를 사용합니다.

통합 개발(웹 + 워커):
```bash
npm run dev:all
```
`dev:all`은 `next dev + import/bg/vto worker`를 함께 실행합니다.
워커 스크립트는 `dotenv/config`를 preload해 `.env.local`을 프로세스 시작 시점에 먼저 로드합니다.

품질 점검:
```bash
npm run lint
npm run typecheck
npm run build
npm run check
```

## 코드 구조 원칙
- `src/app/**/page.tsx`: 상태/데이터 흐름 중심
- `src/features/<domain>/components`: 화면 조각/프리젠테이션
- `src/features/<domain>/{types,constants,utils}.ts`: 도메인 로직 단위 분리
- `src/components/brand`: FreeStyle 로고 컴포넌트
- `public/branding`: FreeStyle 브랜드 에셋(`freestyle-logo.svg`, `freestyle-mark.svg`)

현재 `studio`, `profile`, `trends(feed)`는 기능 단위 컴포넌트 구조를 사용합니다.

## CI 품질 게이트
- `.github/workflows/quality.yml`에서 PR/`main` push마다 `lint + typecheck + build`를 검사합니다.

## 환경 변수
`.env.local`에 설정합니다.

필수/권장 키:
- `REDIS_URL` (큐 사용 시)
- `GEMINI_API_KEY` (AI 리뷰)
- `VTO_ENDPOINT`, `VTO_API_KEY` (가상 피팅 프로바이더)
- `REMOVE_BG_API_KEY` (배경 제거)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (원격 저장 사용 시)

선택 키:
- `ALLOWED_IMAGE_HOSTS`, `ASSET_STORAGE_PATH`, `ASSET_INDEX_PATH`
- `OUTFITS_STORAGE_PATH`, `BG_REMOVAL_CONCURRENCY`, `VTO_CONCURRENCY`
- `IMPORT_CONCURRENCY`, `IMPORT_CART_ITEM_CONCURRENCY`
- `GEMINI_REVIEW_MODEL`, `REMOVE_BG_ENDPOINT`, `REMOVE_BG_SIZE`
- `VTO_PROVIDER`, `VTO_AUTH_HEADER`, `VTO_AUTH_SCHEME`
- `HUMAN_DETECTION_MODE`, `HUMAN_DETECTION_MAX_CANDIDATES`, `HUMAN_DETECTION_MAX_SIDE`
- `HUMAN_FACE_MIN_AREA_RATIO`, `HUMAN_FACE_PENALTY_BASE`, `HUMAN_FACE_PENALTY_SLOPE`
- `HUMAN_FACE_MODEL_SOURCE`, `HUMAN_FACE_MODEL_PATH`, `HUMAN_FACE_MODEL_URL`
- `STRICT_NO_MODEL_IMPORT`
- `ALLOW_FILESYSTEM_STORAGE_IN_PRODUCTION`
  - 기본값은 `false`이며, 운영 환경에서 로컬 파일시스템 저장을 실수로 사용하는 것을 막습니다.
  - 운영에서 파일시스템 저장을 강제로 허용하려면 명시적으로 `true`를 설정해야 합니다.

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
- 기술 동향 점검 로그: `docs/TECH_WATCH.md`
- 배포 스택 결정 문서: `docs/DEPLOYMENT_STACK_DECISION.md`
- 최신 점검/개선 리포트: `docs/PROJECT_HEALTH_2026-02-11.md`
- 최신 운영 준비 리포트: `docs/PROJECT_HEALTH_2026-02-13.md`

## 운영 메모
- Redis 미기동 환경에서 빌드/정적 분석이 가능하도록 큐 초기화는 lazy 방식으로 구성되어 있습니다.
- 운영에서 `REDIS_URL` 미설정 시 큐 관련 경로는 명시적으로 실패하도록 구성되어 있습니다.
- 임포트 큐 API:
  - `POST /api/import-jobs` (`type=url|cart|file`)
  - `GET /api/import-jobs/{jobId}` (상태/결과 조회)
- 운영에서 로컬 파일시스템 저장은 기본 차단되어 있으며(`ALLOW_FILESYSTEM_STORAGE_IN_PRODUCTION=false`), 의도한 경우에만 수동 허용합니다.
- 프로덕션 빌드는 안정성을 위해 `next build --webpack` 기준으로 실행합니다.
- 작업 전 문서 확인, 작업 후 문서 갱신은 필수 규칙입니다(`AGENTS.md`).
- Turbopack 루트는 프로젝트 경로로 고정되어 있어, 터미널 실행 위치가 달라도 루트 해석 오류 가능성을 줄였습니다.
