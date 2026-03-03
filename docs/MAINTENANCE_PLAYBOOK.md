# Maintenance Playbook

## 1. 일일 체크리스트
1. `docs/TECH_WATCH.md` 당일 점검 여부 확인
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. 주요 API smoke check
- `/api/assets`
- `/api/import-jobs`
- `/api/outfits`
- `/api/ai/tryon`
- `/api/ai/review`
- `/api/assets/from-cart`

## 2. 배포 전 체크리스트
1. 환경 변수 확인
- Redis, AI provider, Supabase 관련 키
- 얼굴 신호 import 설정(`HUMAN_DETECTION_MODE`, `STRICT_NO_MODEL_IMPORT`, penalty 파라미터)
- 얼굴 모델 소스 설정(`HUMAN_FACE_MODEL_SOURCE`, `HUMAN_FACE_MODEL_PATH` 또는 `HUMAN_FACE_MODEL_URL`)
- import 워커 동시성 설정(`IMPORT_CONCURRENCY`, `IMPORT_CART_ITEM_CONCURRENCY`)
- 운영에서 로컬 파일시스템 저장 사용 여부 (`ALLOW_FILESYSTEM_STORAGE_IN_PRODUCTION`)
2. 데이터 경로 확인
- `ASSET_STORAGE_PATH`, `OUTFITS_STORAGE_PATH`
3. 큐 워커 가동 확인
- Import worker
- BG worker, VTO worker
4. 오류 로그 확인
- 네트워크 타임아웃/외부 API 오류/스토리지 권한
5. 품질 파이프라인 확인
- `.github/workflows/quality.yml` 성공 여부 확인

## 3. 장애 대응 가이드
1. Redis 연결 이슈
- 증상: 큐 job 생성/조회 실패
- 점검: `REDIS_URL`, Redis 프로세스 상태, 네트워크 접근
- 운영 환경에서는 `REDIS_URL` 누락 시 명시적 오류가 발생하도록 구성됨

2. 배경 제거 실패
- 증상: `removedBackground=false`, 경고 반환
- 점검: `REMOVE_BG_API_KEY`, 입력 파일 형식/크기
- 링크/장바구니 import 경로에서는 누끼 실패 자산을 저장하지 않도록 동작함(실패 코드 확인)
- `CUTOUT_NOT_AVAILABLE`가 반복되면 워커 실행 방식(`npm run worker:*` 또는 `npm run dev:all`)에서 `.env.local` preload가 적용됐는지 먼저 확인한다.

3. 리뷰 생성 실패
- 점검: `GEMINI_API_KEY`, 모델명, 요청 payload 크기

4. 저장 실패
- Supabase 설정 유효성 확인
- 미연결 시 로컬 폴백 경로 권한 확인

5. 링크/장바구니 import 실패 코드
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
- 수동 후보 선택에서도 실패가 반복되면 `attempts[].stage === "trim"` + `quality.reason`을 먼저 보고 `FOREGROUND_TOO_SMALL` 외 과검증 케이스인지 확인한다.

운영 원칙:
- 위 코드가 발생하면 실패 항목으로만 집계하고 에셋 저장은 하지 않는다.
- 장바구니 import는 부분 성공을 허용하며 실패 항목을 `failed[]`로 반환한다.
- 임포트는 기본적으로 `/api/import-jobs` 비동기 큐 경로를 사용한다(대량 처리/타임아웃 회피).
- URL/장바구니 import로 저장된 asset은 `sourceUrl`을 유지하고, Studio 요약/캔버스에서 말풍선 링크로 노출한다(운영 중 링크 누락 시 저장 payload 점검).
- 로컬 `index.json` 저장은 프로세스 내 mutex + atomic write를 사용한다. 다중 인스턴스 운영에서는 DB/오브젝트 스토리지 기반 저장소를 기본으로 사용한다.
- 운영 환경 응답에서는 `attempts` 상세 디버그 정보 노출을 비활성화한다(개발 환경에서만 활성화).
- 운영에서는 `ALLOWED_IMAGE_HOSTS`를 반드시 설정해야 URL/장바구니 import API가 동작한다.
- `ALLOWED_IMAGE_HOSTS`에는 상품 페이지 도메인과 이미지 CDN 도메인을 모두 등록한다.
- 링크/이미지 fetch는 redirect hop 검증 + DNS private 대역 차단 + 헤더/바디 타임아웃을 모두 적용한다.
- 운영에서 `STRICT_NO_MODEL_IMPORT=true`를 유지해 모델컷 전용 후보 저장을 차단한다.
- 운영에서 `HUMAN_FACE_MODEL_SOURCE=local`을 권장하고, 모델 파일 경로를 배포 아티팩트에 포함한다.

## 4. 유지보수 원칙
- 작은 수정도 lint/typecheck/build를 통과시킨다.
- 사용자 영향이 있는 변경은 문서를 먼저/같이 갱신한다.
- 비동기 처리 경로는 timeout/재시도 정책을 명시한다.
- page 파일이 비대해지면 즉시 feature 컴포넌트로 분리한다.

## 5. PR/변경 로그 규칙
- 변경 목적, 영향 범위, 롤백 방법을 짧게 기록한다.
- 문서 변경 파일을 누락하지 않는다.
- UI 대형 변경 시 최소 한 번 수동 시나리오 확인 결과를 남긴다.
