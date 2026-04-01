# Baseline Metrics Template

## Usage
- Fill this before Phase `0.5`.
- Use the latest approved production baseline as the comparison source for Phase `0.5`, `4`, and `5`.
- Keep links to dashboards, query IDs, and screenshots in the same record.

## Baseline Record
| Field | Value |
| --- | --- |
| Phase | `0.5` -> `4` -> `5` |
| Baseline window | `2026-04-02 00:00~23:59 KST` (production stable window) |
| Environment | `production` |
| Audience used for baseline | `Core surfaces (/ , /app/closet, /studio, /app/discover, /app/profile) + widget traffic` |
| Analyst | `sol (data-analytics-owner)` |
| Approved by | `sol (runtime-owner), sol (deployment-owner)` |
| Approved at | `PENDING_NUMERIC_CAPTURE` |

## Required Metrics
| Metric | Baseline value | Gate reference |
| --- | --- | --- |
| `widget_load_fail_rate` | `PENDING_NUMERIC_CAPTURE` | Stop/rollback if `> 2.0%` in rolling `15-min` window |
| `js_error_rate` | `PENDING_NUMERIC_CAPTURE` | Stop/rollback if `> baseline +20%` or `> 1.0%` of sessions |
| `widget API 5xx` | `PENDING_NUMERIC_CAPTURE` | Stop/rollback if `> 1.0%` |
| `p75 LCP` | `PENDING_NUMERIC_CAPTURE` | Stop/rollback if `> 2.8s` or `+250ms` vs baseline |
| `p75 INP` | `PENDING_NUMERIC_CAPTURE` | Stop/rollback if `> 200ms` or `+30ms` vs baseline |
| `p75 CLS` | `PENDING_NUMERIC_CAPTURE` | Stop/rollback if `> 0.10` |
| `add_to_cart` conversion | `PENDING_NUMERIC_CAPTURE` | Stop/rollback if relative conversion drop `<= -5%` when minimum sample is met |

## Data Sources
| Metric | Dashboard / query | Notes |
| --- | --- | --- |
| `widget_load_fail_rate` | `widget runtime dashboard` | Must use 15-min rolling window |
| `js_error_rate` | `frontend error dashboard` | Session-normalized rate required |
| `widget API 5xx` | `Railway API metrics (/v1/widget/*)` | Include denominator (all widget API requests) |
| `p75 LCP` | `web vitals dashboard` | Same route cohort as canary audience |
| `p75 INP` | `web vitals dashboard` | Same route cohort as canary audience |
| `p75 CLS` | `web vitals dashboard` | Same route cohort as canary audience |
| `add_to_cart` conversion | `product analytics funnel query` | Record minimum sample rule in rollout ticket |

## Sign-off Checklist
- Baseline window excludes known incidents and partial outages.
- Same metric definitions are used for baseline and canary.
- Minimum sample rule for `add_to_cart` is recorded in the rollout ticket.
- Runtime owner and data/analytics owner approved the baseline.
- All `Baseline value` cells are numeric before canary starts.
