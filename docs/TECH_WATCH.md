# Tech Watch

## 운영 규칙
- 점검 주기: 하루 1회(로컬 날짜 기준)
- 점검 시작 조건: 마지막 점검 날짜가 오늘이 아닐 때
- 점검 결과 반영:
1. 신규 최적화/변경사항이 있으면 이 문서에 기록
2. 실제 적용 필요 시 `docs/DEVELOPMENT_GUIDE.md` 또는 `docs/MAINTENANCE_PLAYBOOK.md`에 즉시 반영

## 권장 확인 소스
- Next.js 릴리즈/업그레이드 노트
- React 릴리즈 노트
- TypeScript 릴리즈 노트
- Tailwind CSS 릴리즈 노트
- BullMQ/IORedis 변경사항
- Supabase 서버/SDK 변경사항

## 마지막 점검일
- 2026-02-18

## 점검 로그
### 2026-02-11
- 초기 운영 템플릿 생성.
- 이후부터는 작업 시작 시 "당일 미점검" 상태에서만 최신 변경사항을 확인하고 기록.

### 2026-02-13
- 확인 소스:
  - Vercel Next.js/Cron 공식 문서 및 2026-01 changelog
  - Render Background Worker / Key Value(Valkey) 공식 문서
  - Cloudflare Queues / Next.js 가이드 공식 문서
  - Supabase Queues(PGMQ) / Cron 공식 문서
  - Google Cloud Run Jobs 공식 문서
- 신규 변화 요약:
  - Vercel Cron per-project 한도 100개(2026-01) 및 플랜별 스케줄 정밀도 제약 문서 명시.
  - Render Key Value 신규 인스턴스는 Valkey 8 기반.
  - Supabase는 pgmq 기반 Queues와 pg_cron 기반 Cron 운영 흐름이 문서화되어 있음.
  - Cloud Run Jobs는 장시간/병렬 배치 실행(최대 10,000 task) 운영 패턴이 성숙.
- 우리 프로젝트 영향:
  - fsp의 BullMQ + Redis 워커는 장시간 작업이 있어 웹/워커 분리가 가능한 배포 모델이 유리.
  - 로컬 파일 저장 폴백은 운영 환경에서 오브젝트 스토리지로 치환 필요.
  - Vercel 단독 배포보다는 워커 런타임이 있는 조합(예: Render/Railway/Cloud Run)이 더 안정적.
- 적용 여부:
  - 적용 권고안 작성(플랫폼 조합 비교 및 추천안 제시).
  - 코드에 운영 안전 가드 반영:
    - 운영 환경에서 Redis 미설정 시 큐 경로 명시적 실패
    - 운영 환경에서 로컬 파일시스템 저장 기본 차단(opt-in 필요)
  - 품질 게이트 강화:
    - `typecheck` 스크립트/CI 단계 추가
- 반영 문서:
  - 본 문서 업데이트.
  - `docs/DEVELOPMENT_GUIDE.md`
  - `docs/MAINTENANCE_PLAYBOOK.md`
  - `docs/DEPLOYMENT_STACK_DECISION.md`

### 2026-02-14
- 확인 소스:
  - Next.js 공식 블로그/보안 공지 (`nextjs.org/blog`)
  - React 공식 블로그 보안 릴리즈 (`react.dev/blog`)
  - TypeScript 공식 릴리즈 노트 (`typescriptlang.org`)
  - Tailwind CSS 공식 문서/업그레이드 가이드 (`tailwindcss.com`)
  - BullMQ GitHub 릴리즈 (`github.com/taskforcesh/bullmq/releases`)
  - Supabase 공식 문서(Queues/Functions/Storage) (`supabase.com/docs`)
- 신규 변화 요약:
  - Next.js 보안 패치 라인 공지가 유지되고 있어 마이너/패치 버전 추적이 계속 중요함.
  - React는 19.x 라인 보안/버그 수정 릴리즈가 누적되어 의존성 업데이트 주기 관리가 필요함.
  - BullMQ 5.x 라인이 지속 업데이트 중이며 워커 안정성 관련 패치가 주기적으로 반영됨.
  - Supabase 문서 기준으로 백그라운드/큐 운영 패턴이 더 명확해져, 로컬 폴백보다 managed 스토리지/DB 전환 원칙이 여전히 유효함.
- 우리 프로젝트 영향:
  - 링크/장바구니 import 경로에서 SSRF 우회(DNS rebinding)와 slow-stream DoS 방어를 강화해야 함.
  - 운영 디버그 정보(`attempts`) 비노출과 네트워크 타임아웃 강제가 필요.
- 적용 여부:
  - 코드 반영 완료:
    - DNS safe verdict 캐시 제거(차단 verdict만 단기 캐시)
    - redirect 수동 추적 fetch에 헤더 타임아웃 적용
    - 응답 본문 스트리밍 읽기에 바디 타임아웃 + 바이트 상한 적용
    - 운영 환경에서 `ALLOWED_IMAGE_HOSTS` 미설정 시 URL/장바구니 import 거부
    - 얼굴 신호 기반 후보 재랭킹(P1)과 strict no-model 저장 차단 플래그 추가
    - 얼굴 모델 소스 설정(`HUMAN_FACE_MODEL_SOURCE`) 및 로컬 모델 경로(`HUMAN_FACE_MODEL_PATH`) 지원 추가
  - 운영 지침 문서 반영 완료:
    - `docs/DEVELOPMENT_GUIDE.md`
    - `docs/MAINTENANCE_PLAYBOOK.md`
    - `ALLOWED_IMAGE_HOSTS`에 상품 페이지/이미지 CDN 호스트를 모두 포함하도록 명시
- 반영 문서:
  - 본 문서 업데이트
  - `docs/DEVELOPMENT_GUIDE.md`
  - `docs/MAINTENANCE_PLAYBOOK.md`

### 2026-02-15
- 확인 소스:
  - Next.js 공식 블로그 릴리즈 노트 (`nextjs.org/blog`)
  - React 공식 보안 릴리즈 (`react.dev/blog`)
  - TypeScript 공식 릴리즈 노트 (`typescriptlang.org`)
  - BullMQ changelog / releases (`docs.bullmq.io`, `github.com/taskforcesh/bullmq`)
  - Supabase changelog (`supabase.com/changelog`)
- 신규 변화 요약:
  - Next.js 16.1 라인 안정화/마이너 업데이트가 유지되고 있어 App Router + API route 타입 호환성을 계속 점검해야 함.
  - React 19.2.x 보안/버그 패치가 누적되어 프레임워크 버전 페어링(react/react-dom/next)을 고정 관리하는 전략이 유효.
  - BullMQ 5.x 라인 업데이트가 지속되고 있어 큐 기반 장시간 작업 처리(import, try-on) 패턴을 우선하는 방향이 타당.
  - Supabase는 스토리지/백그라운드 작업 조합이 계속 강화되어 파일기반 임시저장 구조를 장기 운영 기본으로 둘 이유가 더 약해짐.
- 우리 프로젝트 영향:
  - URL/장바구니/파일 import를 동기 API에서 큐 기반으로 전환해 타임아웃/대량처리 리스크를 줄이는 것이 우선.
  - Studio 프론트도 job enqueue + polling 방식으로 통일해 부분 실패/진행 상태를 안정적으로 처리해야 함.
- 적용 여부:
  - 코드 반영 완료:
    - `asset-import` BullMQ 큐/워커 추가 (`src/lib/importQueue.ts`, `src/worker/importWorker.ts`)
    - `POST /api/import-jobs`, `GET /api/import-jobs/[jobId]` 추가
    - Studio의 URL/장바구니/파일 import를 `import-jobs` 기반 polling으로 전환
    - `dev:all`에 import worker 실행 추가
  - 운영 가이드 반영 완료:
    - `README.md`
    - `docs/DEVELOPMENT_GUIDE.md`
    - `docs/MAINTENANCE_PLAYBOOK.md`
- 반영 문서:
  - 본 문서 업데이트
  - `README.md`
  - `docs/DEVELOPMENT_GUIDE.md`
  - `docs/MAINTENANCE_PLAYBOOK.md`

### 2026-02-18
- 확인 소스:
  - Next.js 공식 블로그 (`nextjs.org/blog`)
  - React 공식 블로그 보안 공지 (`react.dev/blog`)
  - TypeScript 공식 블로그/릴리즈 노트 (`devblogs.microsoft.com/typescript`, `typescriptlang.org`)
  - Tailwind CSS 공식 블로그 (`tailwindcss.com/blog`)
  - BullMQ GitHub 릴리즈 (`github.com/taskforcesh/bullmq/releases`)
  - Supabase changelog (`supabase.com/changelog`)
- 신규 변화 요약:
  - Next.js 16.1 라인 이후 패치/마이너 추적 중요성이 계속 유지되고 있으며, 보안 공지 채널 모니터링 우선순위가 높음.
  - React는 2025-12 보안 취약점 공지가 2026-01-26에 업데이트되어, 19.x 라인 패치 반영 주기를 짧게 유지할 필요가 있음.
  - TypeScript는 5.9 라인 기준 릴리즈 노트가 기준선으로 유지되고 있어, 빌드/타입체크 파이프라인과의 호환성 점검이 계속 필요함.
  - Tailwind CSS 4.1 기능 확장 이후에도 v4 계열 유지 전략이 유효하며, 유틸리티 기반 테마 변수 관리 패턴이 안정적임.
  - BullMQ 5.x 릴리즈가 계속 누적되어 import/try-on 워커 안정성 관점에서 정기 패치 추적이 필요함.
  - Supabase changelog에 2026-02 업데이트가 이어져 스토리지/플랫폼 운영 변경점 확인 주기를 유지해야 함.
- 우리 프로젝트 영향:
  - 현재 운영 원칙(큐 기반 비동기 처리 + 보안 패치 추적 + 런타임 안전 가드)을 유지하는 판단이 타당함.
  - 오늘 작업 범위(전역 폰트 교체)는 런타임 아키텍처/운영 정책 변경이 아니므로 dependency 업그레이드는 별도 배치에서 진행.
- 적용 여부:
  - 당일 Tech Watch 점검 로그만 반영.
  - 코드 측면에서는 전역 로컬 폰트 적용(`next/font/local`)과 문서 동기화를 진행.
- 반영 문서:
  - 본 문서 업데이트
  - `README.md`
  - `docs/DEVELOPMENT_GUIDE.md`

## 로그 템플릿
### YYYY-MM-DD
- 확인 소스:
- 신규 변화 요약:
- 우리 프로젝트 영향:
- 적용 여부:
- 반영 문서:
