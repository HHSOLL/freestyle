# Feature Flag Matrix

## Usage
- Flags below govern exposure for Phase `0.5`, `4`, and `5`.
- Exposure percentages must follow `1% -> 5% -> 25% -> 100%`.
- Kill switches must be independently operable from audience targeting.

## Matrix
| Phase | Flag key | Type | Default | Canary audience | Kill switch owner | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `0.5` | `phase_0_5_canary_enabled` | Release | `off` | `1% -> 5% -> 25% -> 100%` | Deployment owner | Main production canary gate for initial rollout |
| `0.5` | `phase_0_5_kill_switch` | Ops | `off` | `0%` | Runtime owner | Immediate disable for Phase `0.5` exposure |
| `4` | `phase_4_premium_surface_enabled` | Release | `off` | `1% -> 5% -> 25% -> 100%` | Deployment owner | Gates premium surface rollout |
| `4` | `phase_4_premium_surface_kill_switch` | Ops | `off` | `0%` | Runtime owner | Immediate disable for Phase `4` premium surface |
| `5` | `phase_5_labs_separation_enabled` | Release | `off` | `1% -> 5% -> 25% -> 100%` | Deployment owner | Gates labs separation rollout |
| `5` | `phase_5_labs_separation_kill_switch` | Ops | `off` | `0%` | Runtime owner | Immediate disable for Phase `5` labs separation |

## Required Rules
- Only one release flag per phase controls audience percentage.
- Each phase has a separate kill switch with no sampling logic.
- Stage advance requires rollout record update and owner sign-off.
- Rollback means reducing audience to the last known good state or `0%` via kill switch.
