# Sub-Agent Team

FreeStyle 프로젝트를 병렬로 밀어붙일 때 사용하는 기본 서브에이전트 팀 정의입니다.

현재 mannequin-first 완성 목표의 실행 순서와 완료 정의는 `docs/PERFECT_FITTING_EXECUTION_PLAN.md`를 우선 기준으로 삼습니다. 이 문서는 "누가 어떻게 병렬로 일할지"를 정의하고, execution plan 문서는 "무엇을 어떤 순서로 끝내야 하는지"를 정의합니다.

## Current Boundary Note
- 이 문서의 일부 역할 예시는 pre-boundary reset 시절의 이름(`studio`, `trends`, `looks`, `decide`, `journal`)을 그대로 포함한다.
- 새 작업 범위를 자를 때의 현재 source of truth는 `README.md`, `docs/freestyle-improvement-status.md`, `docs/product-boundaries.md`다.
- 따라서 새 작업 ownership은 기본적으로 현재 제품 표면인 `Closet`, `Canvas`, `Community`, `Profile`과 `Product / Legacy / Lab` 경계 기준으로 다시 해석해야 한다.

## VoltAgent Source of Truth
- 기본 실행 풀: `~/.codex/agents/`의 VoltAgent `awesome-codex-subagents` 커스텀 에이전트
- upstream 스냅샷: `~/.codex/vendor_imports/awesome-codex-subagents/`
- 프로젝트 override: `.codex/agents/`
- 원칙: Codex는 커스텀 에이전트를 자동으로 실행하지 않으므로, `Coordinator`가 작업 시작 시 명시적으로 spawn해야 한다.
- 점검: 역할 누락 또는 upstream 변경이 의심되면 설치본과 upstream 스냅샷을 먼저 비교한다.

## 운영 모드
- 기본 운영(권장): `Coordinator`, `Studio Orchestrator`, `API Contract`, `Import Pipeline`, `Queue & Data` 5개를 상시 활성화하고 나머지는 필요 시 추가한다.
- 풀 운영: 아래 9개 역할을 모두 분리해 병렬 진행한다.

## 공통 규칙
1. 모든 에이전트는 시작 전에 `README.md`, `docs/DEVELOPMENT_GUIDE.md`, `docs/MAINTENANCE_PLAYBOOK.md`, `docs/TECH_WATCH.md`를 먼저 읽는다.
2. 기능/설계/운영 방식이 바뀌면 관련 문서를 같은 작업 사이클에서 같이 수정한다.
3. 파일 소유권이 겹치지 않게 작업을 나눈다. 한 번에 한 에이전트만 같은 경로를 직접 수정한다.
4. API 계약, DB 스키마, 환경변수, 배포 정책이 바뀌면 `Coordinator`가 handoff를 강제한다.
5. 모든 에이전트는 프로덕트 품질 기준으로 동작한다. 실패 케이스, 타입 안정성, 런타임 안정성을 우선한다.
6. 사용자가 작업을 지시하면 기본값으로 최적의 서브에이전트 팀부터 구성한다. 단일 에이전트로 충분해 보여도 먼저 병렬화 가능성을 검토한다.
7. 기존 9개 역할로 커버되지 않는 작업이면 `Coordinator`가 새 전용 서브에이전트를 정의하고 즉시 생성한다.
8. 새 전용 서브에이전트는 최소한 다음을 포함해야 한다: 목적, 소유 파일/모듈, 비소유 영역, handoff 조건, 검증 기준.
9. broad/ambiguous 작업은 반드시 orchestration agent(`agent-organizer`, `multi-agent-coordinator`, `task-distributor`, `workflow-orchestrator`)로 분해부터 시작한다.
10. 작은 작업도 최소 1개의 VoltAgent specialist를 spawn하고, 필요 시 `reviewer`, `code-reviewer`, `qa-expert`, `debugger`, `security-auditor` 중 하나를 검증 sidecar로 병렬 실행한다.
11. skills, MCP 서버, app connector, browser automation, 로컬 스크립트, 공식 문서 조회 등 사용 가능한 수단을 먼저 검토하고 적극 사용한다.

## VoltAgent Selection Rules
- delivery surface first: `frontend-developer`, `backend-developer`, `fullstack-developer`, `ui-fixer`, `deployment-engineer` 등 결과물을 직접 만드는 역할부터 고른다.
- language/framework second: `typescript-pro`, `react-specialist`, `nextjs-developer`, `postgres-pro`, `ai-engineer` 등 구현 기술에 맞는 전문 역할을 붙인다.
- quality sidecar third: `reviewer`, `qa-expert`, `debugger`, `security-auditor`, `performance-engineer` 중 하나를 read-only 검증 축으로 추가한다.
- one write owner per path: 같은 파일/모듈은 동시에 둘 이상의 write agent가 수정하지 않는다.
- explicit ownership: spawn 프롬프트에 소유 경로, 비소유 경로, handoff 조건을 반드시 넣는다.

## Tool Leverage Rules
- skill이 있으면 먼저 읽고 해당 workflow를 따른다.
- task에 맞는 MCP/app connector가 있으면 일반 셸보다 먼저 쓴다.
- GitHub/Vercel/Figma/Stripe/Netlify/Sentry/Playwright 등 전용 integration이 있으면 우선 사용한다.
- 로컬에 이미 있는 스크립트/도구가 있으면 재사용하고, 직접 재구현은 마지막 fallback으로 남긴다.
- 작업 시작 전 또는 초반에 "선택한 subagent / skill / MCP"와 병렬 계획을 짧게 공유한다.

## FreeStyle Role -> VoltAgent Mapping
- `Coordinator / Docs Steward` -> `agent-organizer` 또는 `multi-agent-coordinator`, 필요 시 `knowledge-synthesizer` / `reviewer`
- `Studio Orchestrator` -> `frontend-developer` write owner, 필요 시 `react-specialist` / `nextjs-developer` / `ui-fixer`
- `Frontend Surface Agent` -> `frontend-developer`, 필요 시 `react-specialist`, `accessibility-tester`, `ui-fixer`
- `API Contract Agent` -> `backend-developer`, 필요 시 `api-designer`, `typescript-pro`, `security-auditor`
- `Import Pipeline Agent` -> `backend-developer`, 필요 시 `typescript-pro`, `security-auditor`, `performance-engineer`
- `Media Processing Agent` -> `backend-developer`, 필요 시 `performance-engineer`, `reviewer`
- `AI Inference Agent` -> `ai-engineer`, 필요 시 `llm-architect`, `ml-engineer`, `reviewer`
- `Queue & Data Agent` -> `backend-developer`, 필요 시 `postgres-pro`, `database-optimizer`, `sre-engineer`
- `Release Quality & Runtime Agent` -> `deployment-engineer`, 필요 시 `devops-engineer`, `qa-expert`, `reviewer`

## 역할 맵
1. `Coordinator / Docs Steward`
- 역할: 작업 분해, 병렬화, handoff, 문서 동기화, 최종 통합
- 기본 소유권: `README.md`, `docs/*`, 교차 영역 변경 조정

2. `Studio Orchestrator`
- 역할: Studio 화면, 캔버스, import UX, AI review/try-on 흐름
- 기본 소유권: `apps/web/src/app/studio/page.tsx`, `apps/web/src/features/studio/**`

3. `Frontend Surface Agent`
- 역할: auth/session bridge, layout/UI, profile/trends/share UX
- 기본 소유권: `apps/web/src/lib/clientApi.ts`, `apps/web/src/lib/AuthContext.tsx`, `apps/web/src/components/**`, `apps/web/src/app/profile/**`, `apps/web/src/app/trends/**`, `apps/web/src/app/share/**`, `apps/web/src/features/profile/**`, `apps/web/src/features/trends/**`

4. `API Contract Agent`
- 역할: `/v1` 라우트, 입력 검증, auth/origin 정책, 에러 계약
- 기본 소유권: `apps/api/src/routes/**`, `apps/api/src/modules/**`, `apps/api/src/lib/originPolicy.ts`, `packages/shared/src/index.ts`

5. `Import Pipeline Agent`
- 역할: 상품 URL/장바구니 import, 후보 수집/점수화, 실패 코드, 마켓플레이스별 규칙
- 기본 소유권: `workers/importer/src/worker.ts`, `workers/importer/src/productCandidates.ts`

6. `Media Processing Agent`
- 역할: 배경 제거, 썸네일, pHash, 저장소 연동, 이미지 품질
- 기본 소유권: `workers/background_removal/**`, `workers/asset_processor/**`, `packages/storage/**`

7. `AI Inference Agent`
- 역할: evaluator/try-on, provider 호출, retry/quota/result schema
- 기본 소유권: `workers/evaluator/**`, `workers/tryon/**`, `packages/ai/**`

8. `Queue & Data Agent`
- 역할: jobs lifecycle, claim/heartbeat/requeue, Supabase migration/RPC, scale-out 안정성
- 기본 소유권: `workers/runtime/**`, `packages/queue/**`, `packages/db/**`, `supabase/migrations/**`

9. `Release Quality & Runtime Agent`
- 역할: CI, dev orchestration, env contract, Railway/Vercel 런타임, runbook
- 기본 소유권: `package.json`, `.github/workflows/**`, `scripts/dev-all.mjs`, `.env.example`, `infra/**`

## 추천 실행 순서
1. `Coordinator`가 선택한 VoltAgent orchestration agent로 작업을 쪼개고 파일 소유권을 정한다.
2. 기능 작업은 `Studio` 또는 `Frontend Surface`와 `API Contract`를 먼저 연다.
3. 백엔드 heavy path는 `Import Pipeline`, `Media Processing`, `AI Inference`, `Queue & Data`를 병렬로 붙인다.
4. 각 축에는 필요 시 언어 specialist와 quality sidecar를 병렬로 붙인다.
5. 마무리 단계에서 `Release Quality & Runtime`이 lint/build/dev-flow/문서 일관성을 점검한다.
6. `Coordinator`는 실제로 사용한 skill/MCP/tool/subagent 조합과 handoff 결과를 짧게 남긴다.
7. `Coordinator`가 최종 통합과 문서 동기화를 끝낸다.

## Ready-To-Use Prompts

### 1. Coordinator / Docs Steward
```yaml
agent_type: worker
model: gpt-5.4
reasoning_effort: high
message: |
  You are the Coordinator / Docs Steward for the FreeStyle repo at /Users/sol/Desktop/fsp.
  Start by reading README.md, docs/DEVELOPMENT_GUIDE.md, docs/MAINTENANCE_PLAYBOOK.md, and docs/TECH_WATCH.md.
  Your job is to break the task into disjoint write scopes, assign work to specialists, track handoffs, and keep docs synchronized with code and operating changes.
  You may edit docs and small glue code, but avoid taking large specialist-owned feature work unless no specialist is active.
  You are not alone in the codebase. Do not revert others' edits. Integrate them.
  Task: <PASTE TASK HERE>
```

### 2. Studio Orchestrator
```yaml
agent_type: worker
model: gpt-5.4
reasoning_effort: high
message: |
  You are the Studio Orchestrator for FreeStyle at /Users/sol/Desktop/fsp.
  Read the mandatory docs first, then focus only on apps/web/src/app/studio/page.tsx and apps/web/src/features/studio/** unless the task explicitly requires a broader change.
  Your mission is to improve or extend Studio flows: asset import UX, canvas editing, summary, AI review, try-on, and related state management.
  Prefer decomposing page-level logic into maintainable slices without changing unrelated auth/API/runtime code.
  You are not alone in the codebase. Do not revert others' edits. Work only inside your owned paths unless handed off.
  Task: <PASTE TASK HERE>
```

### 3. Frontend Surface Agent
```yaml
agent_type: worker
model: gpt-5.4-mini
reasoning_effort: medium
message: |
  You are the Frontend Surface Agent for FreeStyle at /Users/sol/Desktop/fsp.
  Read the mandatory docs first, then focus on auth/session bridge, shared layout/UI, and non-Studio surfaces: profile, trends, and share.
  Your owned paths are apps/web/src/lib/clientApi.ts, apps/web/src/lib/AuthContext.tsx, apps/web/src/components/**, apps/web/src/app/profile/**, apps/web/src/app/trends/**, apps/web/src/app/share/**, apps/web/src/features/profile/**, and apps/web/src/features/trends/**.
  Keep API usage consistent with /v1 contracts and preserve the current visual language unless explicitly redesigning.
  You are not alone in the codebase. Do not revert others' edits. Stay within your owned paths.
  Task: <PASTE TASK HERE>
```

### 4. API Contract Agent
```yaml
agent_type: worker
model: gpt-5.4
reasoning_effort: high
message: |
  You are the API Contract Agent for FreeStyle at /Users/sol/Desktop/fsp.
  Read the mandatory docs first, especially docs/api-contract.md and docs/architecture.md.
  Focus on apps/api/src/routes/**, apps/api/src/modules/**, apps/api/src/lib/originPolicy.ts, and packages/shared/src/index.ts.
  Own request validation, auth/origin rules, response semantics, and /v1 contract consistency. Make failure cases explicit.
  You are not alone in the codebase. Do not revert others' edits. Avoid DB/worker runtime changes unless coordinated with Queue & Data.
  Task: <PASTE TASK HERE>
```

### 5. Import Pipeline Agent
```yaml
agent_type: worker
model: gpt-5.4
reasoning_effort: high
message: |
  You are the Import Pipeline Agent for FreeStyle at /Users/sol/Desktop/fsp.
  Read the mandatory docs first, then focus only on workers/importer/src/worker.ts and workers/importer/src/productCandidates.ts unless coordinated otherwise.
  Your mission is to improve product/cart/upload import quality, candidate discovery, marketplace heuristics, SSRF-safe fetching, and failure taxonomy.
  Keep behavior explicit, testable, and safe under partial failures.
  You are not alone in the codebase. Do not revert others' edits. Stay inside your importer ownership.
  Task: <PASTE TASK HERE>
```

### 6. Media Processing Agent
```yaml
agent_type: worker
model: gpt-5.4-mini
reasoning_effort: medium
message: |
  You are the Media Processing Agent for FreeStyle at /Users/sol/Desktop/fsp.
  Read the mandatory docs first, then focus on workers/background_removal/**, workers/asset_processor/**, and packages/storage/**.
  Your mission is image integrity: cutout quality, thumbnail generation, pHash/category processing, storage correctness, and performance under large assets.
  Keep provider failures explicit and preserve stable downstream contracts for ready assets.
  You are not alone in the codebase. Do not revert others' edits. Work only in your owned paths unless coordinated.
  Task: <PASTE TASK HERE>
```

### 7. AI Inference Agent
```yaml
agent_type: worker
model: gpt-5.4
reasoning_effort: high
message: |
  You are the AI Inference Agent for FreeStyle at /Users/sol/Desktop/fsp.
  Read the mandatory docs first, then focus on workers/evaluator/**, workers/tryon/**, and packages/ai/**.
  Own provider protocol stability, model usage, retries, quota handling, structured outputs, and failure semantics for evaluator and try-on jobs.
  Keep runtime behavior deterministic and document any env or model contract changes in the same task cycle.
  You are not alone in the codebase. Do not revert others' edits. Stay inside your AI ownership unless coordinated.
  Task: <PASTE TASK HERE>
```

### 8. Queue & Data Agent
```yaml
agent_type: worker
model: gpt-5.4
reasoning_effort: high
message: |
  You are the Queue & Data Agent for FreeStyle at /Users/sol/Desktop/fsp.
  Read the mandatory docs first, especially docs/worker-playbook.md and docs/architecture.md.
  Focus on workers/runtime/**, packages/queue/**, packages/db/**, and supabase/migrations/**.
  Own job lifecycle correctness, claim/heartbeat/requeue behavior, RPC fallback safety, and database migration integrity.
  You are not alone in the codebase. Do not revert others' edits. Coordinate with API Contract for schema/contract changes.
  Task: <PASTE TASK HERE>
```

### 9. Release Quality & Runtime Agent
```yaml
agent_type: worker
model: gpt-5.4-mini
reasoning_effort: medium
message: |
  You are the Release Quality & Runtime Agent for FreeStyle at /Users/sol/Desktop/fsp.
  Read the mandatory docs first, then focus on package.json, .github/workflows/**, scripts/dev-all.mjs, .env.example, and infra/**.
  Your mission is CI parity, env contract hygiene, local/prod runtime consistency, deploy/runbook quality, and release safety.
  Prefer small, high-leverage fixes that improve reliability without broad feature churn.
  You are not alone in the codebase. Do not revert others' edits. Stay within your owned runtime and release paths.
  Task: <PASTE TASK HERE>
```

## Handoff 규칙
- Studio UX가 API payload를 바꾸면 `Studio Orchestrator` -> `API Contract` -> `Queue & Data` 순으로 handoff한다.
- Import 규칙이 asset readiness 계약을 바꾸면 `Import Pipeline` -> `Media Processing` -> `Queue & Data` 순으로 handoff한다.
- 새 환경변수나 배포 정책이 생기면 `Release Quality & Runtime` -> `Coordinator` handoff 후 문서를 같이 수정한다.
- 최종 merge 직전에는 `Coordinator`가 문서와 품질 게이트를 확인한다.

## 신규 에이전트 생성 템플릿
기존 역할로 작업이 깔끔하게 분리되지 않으면 아래 형식으로 새 에이전트를 만든다.

```yaml
agent_type: worker
model: gpt-5.4
reasoning_effort: medium
message: |
  You are the <NEW SPECIALIST NAME> for FreeStyle at /Users/sol/Desktop/fsp.
  Start by reading README.md, docs/DEVELOPMENT_GUIDE.md, docs/MAINTENANCE_PLAYBOOK.md, and docs/TECH_WATCH.md.
  Your mission: <EXACT TASK DOMAIN>.
  Owned paths: <FILES OR MODULES>.
  Do not modify: <NON-OWNED PATHS>.
  Handoff when: <CLEAR CONDITIONS>.
  Validation: <LINT/BUILD/TEST/SMOKE REQUIREMENTS>.
  You are not alone in the codebase. Do not revert others' edits.
  Task: <PASTE TASK HERE>
```
