# Baseline Metrics Template

## Usage
- Fill this before Phase `0.5` canary starts.
- Use the latest approved production baseline as the comparison source for Phase `0.5`, `4`, and `5`.
- Do not invent or backfill metric values. Keep any metric, link, or deployment field as `PENDING_*` until production evidence exists.
- Keep dashboard links, query IDs, screenshots, exported CSVs, and rollout ticket links in the same record.

## Operational Boundary
- Control plane: Vercel frontend deployment, Railway API/worker deployment, Supabase project/config, feature-flag state.
- Data plane: widget bootstrap traffic, `/widget/frame`, `/v1/widget/config`, `/v1/widget/events`, Web Vitals streams, `add_to_cart` funnel events.
- Dependency edges: widget client -> Railway API -> Supabase/Auth/Storage -> external providers.

## Preconditions
- No open production incident in the selected baseline window.
- Current production artifact IDs and runtime flag values are recorded before any metric capture begins.
- The same route cohort, language, auth state, and metric definitions will be reused for canary evaluation.
- `docs/rollout-governance/baseline-snapshots.md` capture run is either complete or scheduled in the same rollout ticket.

## Capture Order
1. Freeze control-plane metadata.
   - Record current Vercel production deployment ID/URL.
   - Record current Railway API deployment ID/URL.
   - Record current Railway worker deployment ID/URL if widget or telemetry behavior depends on worker delivery.
   - Record raw `WIDGET_FEATURE_FLAGS` and raw `WIDGET_PHASE_0_5_CANARY_PERCENTAGE`.
   - Confirm active canary stage is `0%`/disabled before baseline capture, or explicitly document why an alternate stable window is being used.
2. Select the production baseline window.
   - Prefer a full stable production day in KST.
   - Exclude maintenance windows, incidents, partial outages, and periods with flag churn.
3. Capture the visual baseline.
   - Follow `docs/rollout-governance/baseline-snapshots.md`.
   - Attach the snapshot bundle artifact URL to this record before sign-off.
4. Run the metric query pack in the exact order listed below.
   - Record the query/dashboard link first.
   - Record the exported evidence path second.
   - Record the numeric baseline value last.
5. Review the completed record.
   - Data/analytics owner validates metric definitions and sample sufficiency.
   - Runtime owner validates that the window is incident-free and representative.
   - Deployment owner confirms the baseline is usable for canary go/no-go decisions.

## Control-Plane Snapshot
| Field | Value |
| --- | --- |
| Rollout ticket | `PENDING_TICKET_LINK` |
| Frontend deployment | `PENDING_VERCEL_DEPLOYMENT` |
| API deployment | `PENDING_RAILWAY_API_DEPLOYMENT` |
| Worker deployment | `PENDING_RAILWAY_WORKER_DEPLOYMENT_OR_NA` |
| Raw `WIDGET_FEATURE_FLAGS` | `PENDING_ENV_SNAPSHOT` |
| Raw `WIDGET_PHASE_0_5_CANARY_PERCENTAGE` | `PENDING_ENV_SNAPSHOT` |
| Open incident at capture start | `none` / `PENDING_CONFIRMATION` |

## Baseline Record
| Field | Value |
| --- | --- |
| Phase | `0.5` -> `4` -> `5` |
| Baseline window | `PENDING_WINDOW_START ~ PENDING_WINDOW_END (KST)` |
| Environment | `production` |
| Audience used for baseline | `Core surfaces (/ , /app/closet, /app/canvas, /app/community, /app/profile) + widget traffic` |
| Language/auth state | `PENDING_CAPTURE_STATE` |
| Qualified-session definition | `PENDING_QUERY_DEFINITION` |
| Analyst | `sol (data-analytics-owner)` |
| Approved by | `sol (runtime-owner), sol (deployment-owner)` |
| Approved at | `PENDING_APPROVAL_TIMESTAMP` |
| Snapshot bundle | `PENDING_ARTIFACT_LINK` |

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

## Metric Query Pack
| Order | Metric | Scope / filter contract | Definition to hold constant | Dashboard / query | Evidence required |
| --- | --- | --- | --- | --- | --- |
| `1` | `widget_load_fail_rate` | `env=production`, widget bootstrap cohort, same tenant/product cohort as canary | `failed widget boots / widget bootstrap attempts` over the baseline window | `PENDING_WIDGET_RUNTIME_DASHBOARD_OR_QUERY` | `PENDING_SCREENSHOT_OR_EXPORT` |
| `2` | `js_error_rate` | `env=production`, same routes and language/auth cohort | session-normalized JS error rate, same session definition used in canary | `PENDING_FRONTEND_ERROR_DASHBOARD_OR_QUERY` | `PENDING_SCREENSHOT_OR_EXPORT` |
| `3` | `widget API 5xx` | `env=production`, endpoints `/v1/widget/config`, `/v1/widget/events`, `/widget/frame` | `5xx responses / all widget API responses` over the same window | `PENDING_RAILWAY_WIDGET_API_QUERY` | `PENDING_SCREENSHOT_OR_EXPORT` |
| `4` | `p75 LCP` | `env=production`, same route cohort as canary audience | `p75 LCP` from production Web Vitals stream | `PENDING_WEB_VITALS_QUERY` | `PENDING_SCREENSHOT_OR_EXPORT` |
| `5` | `p75 INP` | `env=production`, same route cohort as canary audience | `p75 INP` from production Web Vitals stream | `PENDING_WEB_VITALS_QUERY` | `PENDING_SCREENSHOT_OR_EXPORT` |
| `6` | `p75 CLS` | `env=production`, same route cohort as canary audience | `p75 CLS` from production Web Vitals stream | `PENDING_WEB_VITALS_QUERY` | `PENDING_SCREENSHOT_OR_EXPORT` |
| `7` | `add_to_cart` conversion | `env=production`, `event_name=add_to_cart`, `payload.source=studio_cart_import` | reuse the exact qualified-session denominator during canary; note exclusions explicitly | `PENDING_WIDGET_EVENTS_QUERY` | `PENDING_SCREENSHOT_OR_EXPORT` |

## Query Notes
- If the underlying analytics system uses saved query IDs, paste the exact saved-query ID or deep link in the `Dashboard / query` cell.
- If the analytics system uses SQL, save the query text outside this repo and link to it rather than pasting ad hoc SQL here.
- If any metric source changes between baseline capture and canary, baseline sign-off must be repeated.
- If `add_to_cart` minimum sample is not met in the chosen baseline window, extend the window or choose a new stable window. Do not estimate.

## Sign-off Checklist
- Baseline window excludes known incidents and partial outages.
- Same metric definitions are used for baseline and canary.
- Minimum sample rule for `add_to_cart` uses `>=1000` qualified sessions and `>=100` add_to_cart events in stage window.
- Snapshot bundle link is attached and route coverage is complete.
- Frontend/API deployment IDs and flag snapshots are recorded.
- Runtime owner and data/analytics owner approved the baseline.
- All `Baseline value` cells are numeric before canary starts.
