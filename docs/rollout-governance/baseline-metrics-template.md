# Baseline Metrics Template

## Usage
- Fill this before Phase `0.5`.
- Use the latest approved production baseline as the comparison source for Phase `0.5`, `4`, and `5`.
- Keep links to dashboards, query IDs, and screenshots in the same record.

## Baseline Record
| Field | Value |
| --- | --- |
| Phase | `0.5` / `4` / `5` |
| Baseline window | `TBD` |
| Environment | `production` |
| Audience used for baseline | `TBD` |
| Analyst | `TBD` |
| Approved by | `TBD` |
| Approved at | `TBD` |

## Required Metrics
| Metric | Baseline value | Gate reference |
| --- | --- | --- |
| `widget_load_fail_rate` | `TBD` | Stop/rollback if `> 2.0%` in rolling `15-min` window |
| `js_error_rate` | `TBD` | Stop/rollback if `> baseline +20%` or `> 1.0%` of sessions |
| `widget API 5xx` | `TBD` | Stop/rollback if `> 1.0%` |
| `p75 LCP` | `TBD` | Stop/rollback if `> 2.8s` or `+250ms` vs baseline |
| `p75 INP` | `TBD` | Stop/rollback if `> 200ms` or `+30ms` vs baseline |
| `p75 CLS` | `TBD` | Stop/rollback if `> 0.10` |
| `add_to_cart` conversion | `TBD` | Stop/rollback if relative conversion drop `<= -5%` when minimum sample is met |

## Data Sources
| Metric | Dashboard / query | Notes |
| --- | --- | --- |
| `widget_load_fail_rate` | `TBD` | `TBD` |
| `js_error_rate` | `TBD` | `TBD` |
| `widget API 5xx` | `TBD` | `TBD` |
| `p75 LCP` | `TBD` | `TBD` |
| `p75 INP` | `TBD` | `TBD` |
| `p75 CLS` | `TBD` | `TBD` |
| `add_to_cart` conversion | `TBD` | `TBD` |

## Sign-off Checklist
- Baseline window excludes known incidents and partial outages.
- Same metric definitions are used for baseline and canary.
- Minimum sample rule for `add_to_cart` is recorded in the rollout ticket.
- Runtime owner and data/analytics owner approved the baseline.
