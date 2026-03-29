# AGENTS.md

## Goal
이 저장소의 모든 작업은 "프로덕트 품질"(안정성, 유지보수성, 문서 일관성)을 기본 기준으로 수행한다.

## Subagent / Tool Source of Truth
- 기본 delegation pool은 `~/.codex/agents/`의 VoltAgent `awesome-codex-subagents` 커스텀 서브에이전트다.
- upstream 기준 스냅샷은 `~/.codex/vendor_imports/awesome-codex-subagents/`이며, 역할 누락/업데이트 점검 시 여기와 설치본을 비교한다.
- 프로젝트 전용 override 또는 신규 전용 에이전트는 `.codex/agents/`에 두며, 이 경로가 글로벌 설정보다 우선한다.
- Codex는 커스텀 서브에이전트를 자동으로 기동하지 않으므로, 모든 비단순 작업에서 적절한 에이전트를 명시적으로 spawn하는 것을 기본값으로 한다.

## Mandatory Workflow
1. 작업 시작 전 문서 우선 확인
- 최소 확인: `README.md`, `docs/DEVELOPMENT_GUIDE.md`, `docs/MAINTENANCE_PLAYBOOK.md`, `docs/TECH_WATCH.md`.
- 작업 범위와 관련된 API/아키텍처 문서를 먼저 읽고 시작한다.

2. 작업 완료 후 문서 최신화
- 코드/설계/운영 방식이 바뀌면 해당 문서를 같은 PR/커밋 사이클에서 같이 수정한다.
- 문서가 최신 상태가 아니면 작업 완료로 간주하지 않는다.

3. Skill / MCP / Tool 사용 우선
- 가능한 경우 항상 가장 적합한 skill을 우선 사용한다.
- 여러 skill이 해당될 때는 최소 조합으로 사용하고, 사용 순서를 짧게 명시한다.
- skill 적용이 어려우면 이유를 기록하고 차선 접근으로 진행한다.
- 사용 가능한 MCP 서버, app connector, browser automation, 로컬 스크립트, 공식 문서 조회, CLI를 먼저 검토하고 적극 활용한다.
- GitHub, Vercel, Figma, Stripe, Netlify, Sentry, Playwright 등 전용 capability가 있는 작업은 일반 셸/기억 기반 처리보다 해당 capability를 우선한다.
- 사용 가능한 수단이 있는데도 쓰지 않았다면 이유를 짧게 남긴다.

4. 서브에이전트 팀 우선
- 사용자가 작업을 지시하면 기본값으로 먼저 최적의 서브에이전트 팀 구성을 판단한다.
- 역할 선택은 항상 delivery surface 우선(`frontend-developer`, `backend-developer`, `fullstack-developer`, `ui-fixer`, `deployment-engineer` 등), 그다음 언어/프레임워크(`typescript-pro`, `react-specialist`, `nextjs-developer` 등), 마지막으로 품질 sidecar(`reviewer`, `qa-expert`, `debugger`, `security-auditor`) 순으로 한다.
- broad/ambiguous/multi-step 작업은 먼저 `agent-organizer`, `multi-agent-coordinator`, `task-distributor`, `workflow-orchestrator` 중 하나로 분해부터 한다.
- 가능하면 단일 에이전트 직행보다 `Coordinator + 전문 에이전트` 구조로 병렬 실행한다.
- 작은 작업도 최소 1개의 best-fit specialist를 spawn하고, 필요하면 read-only validation sidecar를 병렬로 붙인다.
- 파일/모듈 소유권을 명시하고, 같은 파일은 한 번에 한 write owner만 담당한다.
- 기존 역할 맵으로 커버되지 않는 작업이면, 해당 작업 전용의 새 서브에이전트를 즉시 정의하고 생성한 뒤 진행한다.
- 새 서브에이전트는 목적, 파일 소유권, 비소유 영역, handoff 조건, 검증 기준을 명확히 적은 프롬프트로 생성한다.
- 기본 팀/프롬프트 정의는 `docs/SUBAGENT_TEAM.md`를 따른다.

5. 최신 기술/최적화 점검 (일 1회)
- 작업 착수 전에 `docs/TECH_WATCH.md`의 마지막 점검 날짜를 확인한다.
- 마지막 점검이 "오늘"이 아니면, 최신 릴리즈/최적화 동향을 확인하고 `docs/TECH_WATCH.md`에 기록한다.
- 신규 지침이 필요하면 `docs/DEVELOPMENT_GUIDE.md` 또는 `docs/MAINTENANCE_PLAYBOOK.md`에 즉시 반영한다.
- 같은 날짜에는 중복 점검을 생략한다.

6. 품질 게이트
- 최소: `npm run lint` 통과.
- 가능하면: `npm run build`까지 통과.
- 실패 시 원인/영향/대응을 문서 또는 작업 로그에 남긴다.

## Product-Grade Engineering Rules
- API/비동기 경로는 실패 케이스를 명시적으로 처리한다.
- 타입 안정성(`any` 회피, 입력 검증)과 런타임 안정성을 우선한다.
- 빌드/런타임 환경 차이(예: Redis 미기동)를 고려해 지연 초기화(lazy init) 패턴을 선호한다.
- 큰 변경은 기능 변경과 문서 변경을 분리하지 말고 한 번에 반영한다.

## Done Criteria
- 기능 변경이 요구사항에 맞게 반영되었다.
- 린트/빌드 검증 결과가 확인되었다.
- 관련 문서가 최신화되었다.
- 작업에 사용한 subagent 팀/skill/tool 선택 근거가 추후 유지보수자가 이해 가능한 수준으로 남아 있다.
- 추후 유지보수자가 바로 이해할 수 있는 상태다.
