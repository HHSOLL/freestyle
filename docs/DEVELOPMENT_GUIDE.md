# Development Guide

## 1. 목적
이 문서는 FreeStyle 코드베이스를 개발/확장할 때 필요한 기본 설계와 개발 규칙을 정리합니다.

## 2. 디렉토리 구조
- `src/app`: App Router 페이지/라우트 핸들러
- `src/app/api`: API 엔드포인트
- `src/components`: 공용 UI/레이아웃 컴포넌트
- `src/components/brand`: 브랜드 로고 컴포넌트
- `src/features`: 도메인별 기능 컴포넌트/타입/상수
  - `studio`, `profile`, `trends`
- `public/branding`: FreeStyle 로고/마크 SVG 에셋
- `src/lib`: 도메인 로직(에셋 처리, 저장소, 큐)
- `src/lib/serverConfig.ts`: 서버 런타임 설정/운영 안전 가드
- `src/worker`: BullMQ 워커
- `docs`: 운영/개발 문서

## 3. 핵심 아키텍처
1. 에셋 처리
- `/api/import-jobs`에서 URL/장바구니/파일 임포트 job enqueue
- `/api/import-jobs/[jobId]`에서 임포트 진행 상태/결과 조회
- `/api/assets/from-file`, `/api/assets/from-url`, `/api/assets/from-cart`는 하위 호환용 동기 경로로 유지
- `src/lib/assetProcessing.ts`에서 안전 URL 검증, 후보 이미지 수집/스코어링, 배경 제거, 알파 기반 트리밍 담당
- `src/lib/assetImport.ts`에서 단건/장바구니 공통 import 오케스트레이션(후보 재시도, 품질 검증, 저장) 담당
- `src/lib/assetStore.ts`에서 에셋 인덱스/파일 저장(인덱스 갱신은 mutex + atomic rename으로 직렬화)

2. 코디 저장/공유
- `/api/outfits` 저장
- `/share/[slug]` 공유 렌더링
- `src/lib/outfitStore.ts`가 Supabase/로컬 폴백을 추상화

3. AI 기능
- `/api/ai/review`: Gemini 기반 리뷰 생성
- `/api/ai/tryon`, `/api/ai/tryon/[jobId]`: VTO 큐 요청/조회
- Studio 화면에서 캔버스 렌더를 이미지로 캡처해 리뷰/피팅 API로 전달

4. 큐/워커
- `src/lib/vtoQueue.ts`, `src/lib/bgRemovalQueue.ts`: lazy queue 생성
- `src/lib/importQueue.ts`: 임포트(`url|cart|file`) 작업 큐
- `src/worker/*.ts`: 실제 처리 워커(`import`, `bgRemoval`, `vto`)
- Redis URL/동시성/외부 API 키는 `serverConfig`를 통해 단일 경로로 읽음
- 워커 실행 스크립트는 `-r dotenv/config` + `DOTENV_CONFIG_PATH=.env.local`로 환경변수를 preload해 import 시점 설정 누락을 방지한다.

5. 페이지 구성 원칙
- 페이지(`src/app/**/page.tsx`)에는 상태/데이터 흐름만 남긴다.
- UI는 `src/features/<domain>/components`로 분리한다.
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
- 대형 페이지는 기능 단위 컴포넌트 분리를 기본값으로 적용
- 운영 안전 가드: 운영 환경에서 로컬 파일시스템 저장은 기본 차단(명시적 opt-in 필요)
- 전역 타이포그래피는 `src/app/layout.tsx`의 `next/font/local` 등록(A2J)과 `src/app/globals.css`의 `--font-sans`, `--font-serif` 변수 매핑으로 일관되게 관리한다.
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
- URL import가 `ONLY_MODEL_IMAGES_FOUND`로 실패하면, 상위 후보 URL/썸네일 목록을 클라이언트에 전달하고 사용자가 후보를 직접 선택해 재시도할 수 있다.
- 사용자가 선택한 후보 URL은 `selectedImageUrl`로 워커에 전달되며, 해당 후보를 우선 처리한 뒤 일반 fallback 후보를 순차 시도한다.
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
5. 워커 포함 개발: `npm run dev:all`
  - `next dev + worker:import + worker:bg + worker:vto`
6. 품질 점검:
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
