# Canary Stage Log Template

## Usage
- Use one log entry per stage (`1%`, `5%`, `25%`, `100%`).
- Do not advance a stage until all gate fields are evaluated and signed off.
- Attach dashboard links, query IDs, and incident links in the same entry.

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

## Gate Snapshot (15-min Rolling Window)
| Metric | Baseline | Current stage | Gate threshold | Result (`pass`/`fail`) |
| --- | --- | --- | --- | --- |
| `widget_load_fail_rate` | `value` | `value` | `<= 2.0%` | `pass` |
| `js_error_rate` | `value` | `value` | `<= baseline +20%` and `<= 1.0%` | `pass` |
| `widget API 5xx` | `value` | `value` | `<= 1.0%` | `pass` |
| `p75 LCP` | `value` | `value` | `<= 2.8s` and `<= baseline +250ms` | `pass` |
| `p75 INP` | `value` | `value` | `<= 200ms` and `<= baseline +30ms` | `pass` |
| `p75 CLS` | `value` | `value` | `<= 0.10` | `pass` |
| `add_to_cart` conversion | `value` | `value` | relative drop `> -5%` | `pass` |

## Minimum Sample Check (`add_to_cart`)
| Field | Value |
| --- | --- |
| Qualified sessions in stage window | `number` |
| `add_to_cart` events in stage window | `number` |
| Rule satisfied (`>=1000` sessions and `>=100` events) | `yes` / `no` |

## Decision
- Stage decision: `advance` / `hold` / `rollback`
- Next stage (if advance): `5% / 25% / 100%`
- Rollback target (if rollback): `0%` or previous stage
- Reason:
  - `text`

## Approval
- Deployment owner:
  - `name / timestamp`
- Runtime owner:
  - `name / timestamp`
- Data/analytics owner:
  - `name / timestamp`
