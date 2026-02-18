# Project Health Report
Date: 2026-02-13  
Scope: deployment-ready architecture hardening (without actual deployment)

## 1. 요약
- 목표: 기능 개발 속도는 유지하면서, 운영 전환 시 장애/데이터 유실 리스크를 줄이는 구조로 정리
- 결과:
  - 서버 환경설정 단일화(`serverConfig`)
  - 운영 안전 가드 도입(REDIS/파일시스템 저장)
  - API 입력 파싱 안정성 강화(JSON body 검증)
  - 미사용 의존성 정리 및 레거시 워커 제거
  - 품질 게이트 강화(`typecheck`)

## 2. 주요 변경
1. Runtime Config 통합
- `src/lib/serverConfig.ts` 추가
- Redis, Supabase, Gemini, VTO, 동시성, 파일시스템 저장 정책을 단일 진입점으로 통합

2. 운영 안전 가드
- `REDIS_URL` 누락 시 운영 환경에서 큐 경로 명시적 실패
- 운영 환경에서 로컬 파일시스템 저장 기본 차단

3. API 안정성 강화
- `src/lib/http.ts` 추가(`readJsonObject`, `BadRequestError`)
- 핵심 API 라우트에서 invalid JSON을 400으로 명확히 처리

4. 정리 작업
- 미사용 의존성 제거:
  - `@radix-ui/react-label`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-radio-group`
  - `@radix-ui/react-select`
  - `@supabase/ssr`
- 레거시 실험 워커 삭제: `worker/src/index.ts`

5. 품질 게이트
- `package.json`에 `typecheck` 스크립트 추가
- `check` 스크립트를 `lint + typecheck + build`로 강화
- GitHub Actions 품질 파이프라인에 typecheck 단계 추가

## 3. 문서 반영
- `README.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/MAINTENANCE_PLAYBOOK.md`
- `docs/TECH_WATCH.md`
- `docs/DEPLOYMENT_STACK_DECISION.md`

## 4. 후속 권장
1. Asset 저장소를 Supabase Storage 또는 S3 호환 스토리지로 이관
2. API 통합 테스트(성공/실패 케이스) 자동화
3. 워커 재시도/백오프 정책을 운영 메트릭 기반으로 보정

## 5. 같은 날 추가 기능 구현
1. Studio AI 기능 연결
- 캔버스 코디를 이미지로 렌더링 후 `/api/ai/review`에 전달하는 평가 기능 추가
- 전신 사진 + 캔버스 아이템을 `/api/ai/tryon`으로 전달하고 job polling으로 결과를 받는 피팅 기능 추가

2. 장바구니 링크 임포트 기능 추가
- 신규 API: `/api/assets/from-cart`
- 장바구니 HTML에서 상품 상세 링크를 추출하고, 상세 페이지 이미지 fetch → 배경 제거(옵션 crop) → asset 저장까지 일괄 처리
- 실패 아이템은 개별 에러로 수집해 부분 성공 처리
