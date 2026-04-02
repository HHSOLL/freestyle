# Replatform v2 Execution Status

## As of 2026-04-02

## Phase Matrix
| Phase | Status | Exit criteria status |
| --- | --- | --- |
| `Phase 0` 기준선 정리/푸시 | `in_progress` | `main` clean + baseline tag 완료, 운영 baseline 수치/스냅샷은 진행 중 |
| `Phase 0.5` Contracts Freeze | `done` | 계약 문서/타입/에러 taxonomy 고정 완료 |
| `Phase 1A` UI System Foundation | `done` | glass token + 공통 셸/프리미티브 완료 |
| `Phase 1B` 전 라우트 리스킨 | `done` | 공통 셸 적용/빈 화면 제거 완료, 마네킹 워크스페이스를 레퍼런스 UI 톤으로 재정렬 완료 |
| `Phase 2` B2C 기능 실체화 | `in_progress` | `looks`, `decide`, `journal` 실체화 완료. 다음 우선순위는 widget hardening |
| `Phase 3` B2B Widget MVP | `in_progress` | config/events API+contract + asset delivery/SRI consumption + replay-hardening + SDK iframe isolation 1차 완료. host isolation/browser 검증 남음 |
| `Phase 4` 카나리 롤아웃 | `in_progress` | Web Vitals/JS error/widget flag foundation + deterministic canary audience wiring + add_to_cart 측정선 + stage log template 완료. baseline 수치 확정/승인만 남음 |
| `Phase 5` 정리/종료 | `pending` | legacy cleanup는 canary 안정화 이후 진행 |

## Current Execution Order
1. `Phase 0` 남은 운영 baseline 수치/스냅샷 확정
2. `Phase 3` widget host isolation/browser 검증 완료
3. `Phase 4` canary `1% -> 5% -> 25% -> 100%` 실제 승급
4. `Phase 5` cleanup/freeze/postmortem

## In-Flight Work
- `Phase 0`: baseline template에 실제 운영 수치 채우기 + 승인 로그 남기기
- `Phase 3`: aggressive host CSS/strict CSP/asset 404/event 500 시나리오의 browser-level 검증 잔여
- `Phase 4`: baseline 수치 승인 후 `1% -> 5% -> 25% -> 100%` 단계별 stage 로그 실기록 시작

## Latest Update
- `2026-04-02`: `/app/closet` 마네킹 워크스페이스 UI를 레퍼런스 기준으로 재배치(쿨그레이 글래스 톤, 좌/중앙/우 패널, 상단 유틸리티 바, 하단 모드 탭).
- `2026-04-02`: 품질 게이트(`lint`, `typecheck`, `build:services`, `build`)와 widget API/SDK 테스트를 다시 통과했다.
- `2026-04-02`: `/v1/widget/config`가 `WIDGET_PHASE_0_5_CANARY_PERCENTAGE` 기준으로 `phase_0_5_canary_enabled`를 deterministic sampling 하도록 연결되었다.
- `2026-04-02`: sampling key는 `x-anonymous-user-id` 우선, fallback은 `x-forwarded-for`/`request.ip` + origin이며, `phase_0_5_kill_switch`는 여전히 즉시 강제 disable 우선순위를 가진다.
- `2026-04-02`: `studio` cart import 성공 시 `add_to_cart` telemetry event(`payload.source=studio_cart_import`)를 발행하도록 연결되었다.
- `2026-04-02`: widget iframe mode가 API-origin `GET /widget/frame` bootstrap endpoint를 사용하도록 보강되어 JS asset 직접 탐색 오류를 제거했다.
- `2026-04-02`: canary 단계 승급/중단 기록용 `docs/rollout-governance/canary-stage-log-template.md`를 추가했다.

## Definition of Move-to-Next-Phase
- 다음 phase로 넘어가기 전, 현재 phase의 `문서 + 코드 + 검증` 3개가 모두 닫혀야 한다.
- 검증 최소 기준: `npm run lint`, `npm run typecheck`, `npm run build:services`, `npm run build`.
- 카나리 단계는 `docs/rollout-governance/canary-gates.md` 임계치 위반 시 즉시 중단/롤백한다.
