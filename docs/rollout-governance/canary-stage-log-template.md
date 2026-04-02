# Canary Stage Log Template

## Usage
- Use one log entry per stage (`1%`, `5%`, `25%`, `100%`).
- Do not advance a stage until all gate fields are evaluated and signed off.
- Attach dashboard links, query IDs, and incident links in the same entry.
- Create the entry before changing `WIDGET_PHASE_0_5_CANARY_PERCENTAGE`.
- Update the same entry at `T+15m`, `T+30m`, and at final decision time.

## Logging Process
1. Pre-change:
   - Record deployment IDs, raw flag values, rollback target, operator, and reviewer.
2. Immediate verification:
   - Record the result of `GET /v1/widget/config` for one canary seed and one control seed.
   - Record the result of `GET /widget/frame`.
3. Observation:
   - Capture gate values and evidence links at `T+15m`.
   - Refresh the same values at `T+30m`.
4. Decision:
   - Mark `advance`, `hold`, or `rollback`.
   - Record approval timestamps.
   - If rolled back, record the exact rollback knob or kill-switch state and the recovery verification evidence.

## Stage Entry
| Field | Value |
| --- | --- |
| Date (KST) | `YYYY-MM-DD` |
| Stage | `1% \| 5% \| 25% \| 100%` |
| Start time | `YYYY-MM-DD HH:mm` |
| End time | `YYYY-MM-DD HH:mm` |
| Runtime knob | `WIDGET_PHASE_0_5_CANARY_PERCENTAGE=<stage>` |
| Release flag state | `phase_0_5_canary_enabled=true` |
| Kill switch state | `phase_0_5_kill_switch=false` |
| Operator | `name` |
| Reviewer | `name` |
| Rollout ticket | `link` |
| Incident links | `none` or `links` |

## Control-Plane Snapshot
| Field | Value |
| --- | --- |
| Frontend deployment | `PENDING_DEPLOYMENT_ID` |
| API deployment | `PENDING_DEPLOYMENT_ID` |
| Worker deployment | `PENDING_DEPLOYMENT_ID_OR_NA` |
| Raw `WIDGET_FEATURE_FLAGS` | `PENDING_ENV_SNAPSHOT` |
| Raw `WIDGET_PHASE_0_5_CANARY_PERCENTAGE` before change | `PENDING_ENV_SNAPSHOT` |
| Rollback target | `0%` / previous stage |

## Immediate Verification
| Check | Evidence | Result (`pass`/`fail`) | Notes |
| --- | --- | --- | --- |
| `GET /v1/widget/config` with canary seed | `PENDING_COMMAND_OUTPUT_OR_LINK` | `pending` | `PENDING_NOTE` |
| `GET /v1/widget/config` with control seed | `PENDING_COMMAND_OUTPUT_OR_LINK` | `pending` | `PENDING_NOTE` |
| `GET /widget/frame` health | `PENDING_COMMAND_OUTPUT_OR_LINK` | `pending` | `PENDING_NOTE` |

## Gate Snapshot (15-min Rolling Window)
| Metric | Baseline | Current stage | Gate threshold | Source link / artifact | Result (`pass`/`fail`) |
| --- | --- | --- | --- | --- |
| `widget_load_fail_rate` | `value` | `value` | `<= 2.0%` | `PENDING_LINK` | `pass` |
| `js_error_rate` | `value` | `value` | `<= baseline +20%` and `<= 1.0%` | `PENDING_LINK` | `pass` |
| `widget API 5xx` | `value` | `value` | `<= 1.0%` | `PENDING_LINK` | `pass` |
| `p75 LCP` | `value` | `value` | `<= 2.8s` and `<= baseline +250ms` | `PENDING_LINK` | `pass` |
| `p75 INP` | `value` | `value` | `<= 200ms` and `<= baseline +30ms` | `PENDING_LINK` | `pass` |
| `p75 CLS` | `value` | `value` | `<= 0.10` | `PENDING_LINK` | `pass` |
| `add_to_cart` conversion | `value` | `value` | relative drop `> -5%` | `PENDING_LINK` | `pass` |

## Observation Checkpoints
| Checkpoint | Completed at | Owner | Note |
| --- | --- | --- | --- |
| `T+15m` gate read | `PENDING_TIMESTAMP` | `PENDING_OWNER` | `PENDING_NOTE` |
| `T+30m` gate read | `PENDING_TIMESTAMP` | `PENDING_OWNER` | `PENDING_NOTE` |

## Minimum Sample Check (`add_to_cart`)
| Field | Value |
| --- | --- |
| Qualified sessions in stage window | `number` |
| `add_to_cart` events in stage window | `number` |
| Rule satisfied (`>=1000` sessions and `>=100` events) | `yes` / `no` |
| If `no`, hold reason / extension plan | `PENDING_NOTE` |

## Decision
- Stage decision: `advance` / `hold` / `rollback`
- Next stage (if advance): `5% / 25% / 100%`
- Rollback target (if rollback): `0%` or previous stage
- Reason:
  - `text`

## Rollback Verification
- Rollback knob applied:
  - `WIDGET_PHASE_0_5_CANARY_PERCENTAGE=<value>` / `phase_0_5_kill_switch=true`
- Recovery evidence:
  - `PENDING_LINK_OR_COMMAND_OUTPUT`
- Follow-up incident / postmortem:
  - `none` / `PENDING_LINK`

## Approval
- Deployment owner:
  - `name / timestamp`
- Runtime owner:
  - `name / timestamp`
- Data/analytics owner:
  - `name / timestamp`
