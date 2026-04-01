# Replatform v2 Execution Status

## As of 2026-04-02

## Phase Matrix
| Phase | Status | Exit criteria status |
| --- | --- | --- |
| `Phase 0` 기준선 정리/푸시 | `in_progress` | `main` clean + baseline tag 완료, 운영 baseline 수치/스냅샷은 진행 중 |
| `Phase 0.5` Contracts Freeze | `done` | 계약 문서/타입/에러 taxonomy 고정 완료 |
| `Phase 1A` UI System Foundation | `done` | glass token + 공통 셸/프리미티브 완료 |
| `Phase 1B` 전 라우트 리스킨 | `mostly_done` | 공통 셸 적용/빈 화면 제거 완료, 시각 baseline 캡처는 진행 중 |
| `Phase 2` B2C 기능 실체화 | `in_progress` | `looks`, `decide`, `journal` 실체화 완료. 다음 우선순위는 widget hardening |
| `Phase 3` B2B Widget MVP | `in_progress` | config/events API+contract + asset delivery/SRI consumption + replay-hardening + SDK iframe isolation 1차 완료. host isolation/browser 검증 남음 |
| `Phase 4` 카나리 롤아웃 | `blocked` | Web Vitals/JS error/widget flag foundation 구현 완료. baseline 수치와 실제 canary audience wiring 필요 |
| `Phase 5` 정리/종료 | `pending` | legacy cleanup는 canary 안정화 이후 진행 |

## Current Execution Order
1. `Phase 0` 남은 운영 기준선 고정
2. `Phase 3` widget hardening (SRI/isolation/observability)
3. `Phase 4` canary `1% -> 5% -> 25% -> 100%`
4. `Phase 5` cleanup/freeze/postmortem

## In-Flight Work
- `Phase 0`: rollout owner 지정, baseline template 운영값 정리, snapshot capture run 준비
- `Phase 3`: widget asset delivery와 host isolation/browser 검증 잔여
- `Phase 4`: baseline 수치 확정, canary audience wiring, add_to_cart 전환 측정선 연결

## Definition of Move-to-Next-Phase
- 다음 phase로 넘어가기 전, 현재 phase의 `문서 + 코드 + 검증` 3개가 모두 닫혀야 한다.
- 검증 최소 기준: `npm run lint`, `npm run typecheck`, `npm run build:services`, `npm run build`.
- 카나리 단계는 `docs/rollout-governance/canary-gates.md` 임계치 위반 시 즉시 중단/롤백한다.
