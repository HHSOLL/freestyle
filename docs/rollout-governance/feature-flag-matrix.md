# Feature Flag Matrix

## Usage
- Flags below govern exposure for Phase `0.5`, `4`, and `5`.
- Exposure percentages must follow `1% -> 5% -> 25% -> 100%`.
- Kill switches must be independently operable from audience targeting.
- Widget config API samples `phase_0_5_canary_enabled` per requester using `x-anonymous-user-id` when present, otherwise `x-forwarded-for`/`request.ip` plus origin.
- `WIDGET_PHASE_0_5_CANARY_PERCENTAGE` is the rollout knob for Phase `0.5`; if it is unset, the legacy boolean in `WIDGET_FEATURE_FLAGS` still acts as `0%`/`100%`.

## Matrix
| Phase | Flag key | Type | Default | Canary audience | Runtime knob | Kill switch owner | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `0.5` | `phase_0_5_canary_enabled` | Release | `off` | `1% -> 5% -> 25% -> 100%` | `WIDGET_PHASE_0_5_CANARY_PERCENTAGE=1|5|25|100` | Deployment owner | Main production canary gate for initial rollout. Env percentage overrides the legacy boolean release flag when set. |
| `0.5` | `phase_0_5_kill_switch` | Ops | `off` | `0%` | `WIDGET_FEATURE_FLAGS.phase_0_5_kill_switch=true` | Runtime owner | Immediate disable for Phase `0.5` exposure. Forces `phase_0_5_canary_enabled=false` in widget config even if percentage is `100`. |
| `4` | `phase_4_premium_surface_enabled` | Release | `off` | `1% -> 5% -> 25% -> 100%` | `WIDGET_FEATURE_FLAGS.phase_4_premium_surface_enabled=true` | Deployment owner | Gates premium surface rollout |
| `4` | `phase_4_premium_surface_kill_switch` | Ops | `off` | `0%` | `WIDGET_FEATURE_FLAGS.phase_4_premium_surface_kill_switch=true` | Runtime owner | Immediate disable for Phase `4` premium surface |
| `5` | `phase_5_labs_separation_enabled` | Release | `off` | `1% -> 5% -> 25% -> 100%` | `WIDGET_FEATURE_FLAGS.phase_5_labs_separation_enabled=true` | Deployment owner | Gates labs separation rollout |
| `5` | `phase_5_labs_separation_kill_switch` | Ops | `off` | `0%` | `WIDGET_FEATURE_FLAGS.phase_5_labs_separation_kill_switch=true` | Runtime owner | Immediate disable for Phase `5` labs separation |

## Required Rules
- Only one release flag per phase controls audience percentage.
- Each phase has a separate kill switch with no sampling logic.
- Stage advance requires rollout record update and owner sign-off.
- Rollback means reducing audience to the last known good state or `0%` via kill switch.
- Unsupported Phase `0.5` percentage values fall back to the legacy boolean release flag, so rollout operators should use only the fixed progression values above.
