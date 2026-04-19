# Phase 6 Batch 1 Release Evidence (2026-04-19)

## Verdict

- `PARTIAL_PASS`

## Scope

- 대상: `Phase 6 / Batch 1`
- 범위: current screenshot evidence, maintained smoke-doc expansion, baseline gate rerun, and release-facing lab route smoke preparation

## Environment

- branch: `codex/phase6-batch1-release-smoke`
- base commit: `8345824`
- OS/CPU: `Darwin arm64`
- Node path: `/opt/homebrew/bin/node` via `PATH="/opt/homebrew/bin:$PATH"`

## Command Evidence

1. Baseline gate
- `PATH="/opt/homebrew/bin:$PATH" npm run lint`
- `PATH="/opt/homebrew/bin:$PATH" npm run typecheck`
- `PATH="/opt/homebrew/bin:$PATH" npm run typecheck:admin`
- `PATH="/opt/homebrew/bin:$PATH" npm run test:core`
- `PATH="/opt/homebrew/bin:$PATH" npm run build:services`
- `PATH="/opt/homebrew/bin:$PATH" npm run build`
- `PATH="/opt/homebrew/bin:$PATH" npm run build:admin`
- 결과:
  - `lint/typecheck/typecheck:admin/build:services/build/build:admin` 통과
  - `test:core` 결과: `133 passed, 0 failed, 1 skipped`

2. Route/API smoke coverage
- `PATH="/opt/homebrew/bin:$PATH" ./node_modules/.bin/tsx --test apps/api/src/routes/product-boundary.routes.test.ts`
- 결과:
  - product/admin/legacy namespace smoke 통과
  - env-gated `lab smoke covers evaluation and try-on creation plus legacy job status reads` test는 현재 workspace에 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`가 없어 `SKIP`

3. Screenshot capture
- local product web: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080 PATH="/opt/homebrew/bin:$PATH" npm --prefix apps/web run dev -- --hostname 127.0.0.1 --port 3000`
- local API shim: `BODY_PROFILE_STORE_PATH=... GARMENT_PUBLICATION_PERSISTENCE_DRIVER=file GARMENT_PUBLICATION_STORE_PATH=... SUPABASE_URL=https://example.supabase.co SUPABASE_SERVICE_ROLE_KEY=dummy PATH="/opt/homebrew/bin:$PATH" npm run dev:api`
- Playwright wrapper:
  - `open http://127.0.0.1:3000/`
  - `open http://127.0.0.1:3000/app/closet`
  - `open http://127.0.0.1:3000/app/canvas`
  - `open http://127.0.0.1:3000/app/community`
  - `open http://127.0.0.1:3000/app/profile`
  - `screenshot --full-page --filename docs/qa/assets/phase6-batch1/<route>.png`

## Screenshot Evidence

- [Home](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/home.png)
- [Closet](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/closet.png)
- [Canvas](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/canvas.png)
- [Community](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/community.png)
- [Profile](/Users/sol/Desktop/fsp/docs/qa/assets/phase6-batch1/profile.png)

## Closet Reference Check

- 비교 기준: [wardrobe-reference.jpg](/Users/sol/Desktop/fsp/docs/reference/wardrobe-reference.jpg)
- 확인 결과:
  - 상단 공용 바, 중앙 stage, 좌측 상태/컨트롤 패널, 우측 outfit catalog rail 구조는 유지됨
  - 현재 product shell은 reference보다 밝은 톤과 단순화된 shell을 사용하지만, `Closet`가 여전히 메인 mannequin stage를 중심에 두는 레이아웃이라는 점은 일치함
  - 이번 로컬 캡처에서는 mannequin이 후면 방향으로 서 있고, data-backed catalog 일부는 local API 제한 때문에 starter/default state를 기준으로 보임

## Known Gaps

- current workspace에는 Supabase admin credentials가 없어 live `POST /v1/lab/jobs/evaluations`, `POST /v1/lab/jobs/tryons`, `GET /v1/legacy/jobs/:job_id`, `GET /v1/lab/evaluations/:id`, `GET /v1/lab/tryons/:id` smoke를 실제 원격 저장소에 against 해서 실행하지 못함
- screenshot run은 file-backed body/runtime garment state와 dummy Supabase env를 조합한 local capture라서, DB-backed product surfaces는 fallback/empty-state 중심으로 검증됨

## Acceptance Mapping

1. product/admin/legacy smoke 기준
- maintained smoke docs가 현재 route surface에 맞게 갱신됨
- baseline route test가 product/admin/legacy namespace를 계속 잠금

2. lab create/status smoke 기준
- route-level smoke path는 추가됐지만, 실제 env-backed execution은 다음 batch로 이월

3. release screenshot 기준
- `Home`, `Closet`, `Canvas`, `Community`, `Profile` 최신 캡처를 현재 branch 기준으로 저장

## Next Step

- `Phase 6 / Batch 2`에서 env-enabled lab create/status smoke를 실행하고, RLS/security checklist와 RC deploy notes를 함께 닫는다.
