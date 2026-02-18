# Deployment Stack Decision

Date: 2026-02-13  
Status: Accepted (pre-deploy, functionality-first phase)

## 1. 현재 단계 원칙
- 지금은 배포 실행 단계가 아니라 **기능 완성 우선 단계**다.
- 단, 추후 운영 리스크를 줄이기 위해 기술스택 선택은 선제적으로 고정한다.
- 신규 구현은 아래 결정 스택과 충돌하지 않게 작성한다.

## 2. 채택 스택 (Primary)
1. Web/API: Render Web Service (`next build` + `next start`)
2. Background Processing: Render Background Worker 2개
   - `npm run worker:bg`
   - `npm run worker:vto`
3. Queue/Cache: Managed Redis/Valkey (BullMQ 연결)
4. Data: Supabase Postgres + Supabase Storage

## 3. 왜 이 조합인가
- 현재 코드 구조가 이미 `Next.js + BullMQ + Redis + 별도 worker` 패턴을 전제로 함.
- 웹과 워커를 같은 벤더에서 분리 운영하기 쉬워 장애 격리가 단순함.
- Supabase는 이미 `outfitStore` 경로에 통합되어 있어 전환 비용이 낮음.
- 향후 대체 가능성(Cloud Run/Railway) 대비, 코드 변경량 대비 운영 복잡도 균형이 가장 좋음.

## 4. 비교 후보와 보류 사유
1. Vercel(Web) + Render(Worker) + Supabase
- 장점: Next.js 배포 DX 우수
- 보류: 멀티 벤더 운영 복잡도 증가

2. Railway 올인원
- 장점: 단일 플랫폼 운영 단순
- 보류: 현재 팀 표준/운영 가드 문서가 Render 중심으로 정리되는 중

3. Cloud Run + Managed Redis/Postgres
- 장점: 고확장/고제어
- 보류: 현재 단계(기능 완성 우선) 대비 운영 복잡도 과다

## 5. 코드 반영 원칙
- 환경변수는 `src/lib/serverConfig.ts`로 단일화한다.
- 운영 환경(`NODE_ENV=production`)에서
  - `REDIS_URL` 미설정 시 큐 경로는 명시적으로 실패해야 한다.
  - 로컬 파일시스템 저장은 기본 차단하고, 필요 시 `ALLOW_FILESYSTEM_STORAGE_IN_PRODUCTION=true`로만 허용한다.
- 기능 개발 시 스토리지/큐 경계는 유지하고 하드코딩을 피한다.

## 6. 배포 직전 체크(기능 완료 후)
1. 모든 로컬 폴백 경로 점검(운영에서 의도치 않은 파일 저장 제거)
2. Supabase Storage 버킷/RLS 정책 확정
3. 워커 동시성/재시도 정책 확정
4. 장애 대응 런북 최종 점검
5. `lint + typecheck + build` 및 핵심 API smoke 테스트 통과
