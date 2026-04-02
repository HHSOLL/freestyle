# Canary Gates

## Operational Boundary
- Service/environment path: production widget rollout for `/widget/frame`, `/v1/widget/config`, `/v1/widget/events`, and the dependent frontend telemetry path.
- Control plane knobs: `WIDGET_PHASE_0_5_CANARY_PERCENTAGE`, `WIDGET_FEATURE_FLAGS.phase_0_5_canary_enabled`, `WIDGET_FEATURE_FLAGS.phase_0_5_kill_switch`.
- Data plane checks: widget bootstrap success, JS error rate, widget API 5xx, Web Vitals, `add_to_cart` conversion.

## Progression
- Fixed progression: `1% -> 5% -> 25% -> 100%`
- Do not skip a stage.
- Do not advance while any stop gate is breached or incident is open.

## Gate Evaluation
- Evaluate on production traffic at the current canary percentage.
- Use rolling `15-min` windows for active canary checks.
- Use the latest approved baseline from `baseline-metrics-template.md` for delta comparisons.
- The `add_to_cart` conversion gate applies only when the minimum sample is met: at least `1000` qualified sessions and `100` `add_to_cart` events in the stage window.
- Record each stage result in `canary-stage-log-template.md` before deciding advance/hold/rollback.

## Preflight Before `1%`
1. Confirm the baseline record is complete.
   - `docs/rollout-governance/baseline-metrics-template.md` has numeric production values.
   - Snapshot bundle link is present.
   - Runtime owner and deployment owner sign-off is recorded.
2. Freeze the current production state.
   - Record frontend/API/worker deployment IDs in the stage log.
   - Record raw `WIDGET_FEATURE_FLAGS` and raw `WIDGET_PHASE_0_5_CANARY_PERCENTAGE`.
3. Confirm the last known good rollback target.
   - For first canary entry this is `0%`.
   - For later stages this is the immediately previous successful stage.
4. Confirm no open incident and no concurrent rollout touching the same widget path.

## Stop And Rollback Gates
| Metric | Breach condition | Action |
| --- | --- | --- |
| `widget_load_fail_rate` | `> 2.0%` in `15-min` window | Stop progression and roll back current canary stage |
| `js_error_rate` | `> baseline +20%` OR `> 1.0%` of sessions | Stop progression and roll back current canary stage |
| `widget API 5xx` | `> 1.0%` | Stop progression and roll back current canary stage |
| `p75 LCP` | `> 2.8s` OR `+250ms` vs baseline | Stop progression and roll back current canary stage |
| `p75 INP` | `> 200ms` OR `+30ms` vs baseline | Stop progression and roll back current canary stage |
| `p75 CLS` | `> 0.10` | Stop progression and roll back current canary stage |
| `add_to_cart` relative conversion | `<= -5%` when minimum sample is met | Stop progression and roll back current canary stage |

## Stage Procedure
1. Open a new stage log entry.
   - Copy the template fields into the rollout ticket or the designated ops log.
   - Fill in start time, operator, reviewer, rollout ticket, and rollback target before any config change.
2. Apply the stage knob.
   - Set `WIDGET_PHASE_0_5_CANARY_PERCENTAGE=<1|5|25|100>`.
   - Keep `phase_0_5_kill_switch=false`.
   - If the environment provider requires restart/redeploy for env changes, record the resulting deployment ID in the stage log.
3. Validate the normal path immediately after the config change.
   - `GET /v1/widget/config` returns `phase_0_5_canary_enabled=true` for at least one canary seed.
   - `GET /v1/widget/config` returns `phase_0_5_canary_enabled=false` for at least one control seed.
   - `GET /widget/frame` returns `200`.
4. Observe the stage.
   - Read gate dashboards at `T+15m`.
   - Read them again at `T+30m`.
   - Populate the stage log with both the metric values and the source links or screenshot paths.
5. Decide.
   - `advance` only if all stop gates pass, no incident is open, and required sign-off is present.
   - `hold` if any evidence is missing, the `add_to_cart` minimum sample is not met, or owner sign-off is incomplete.
   - `rollback` immediately on any stop-gate breach or clear user-visible regression.

## Verification Queries
Use placeholder values from the rollout ticket. Save the command output or a screenshot path in the stage log.

```bash
# Normal-path config read for a likely canary audience seed
curl -sS "$API_ORIGIN/v1/widget/config?tenant_id=$TENANT_ID&product_id=$PRODUCT_ID" \
  -H "x-anonymous-user-id: canary-seed-a" | jq '.feature_flags.phase_0_5_canary_enabled'

# Control-path config read for a likely non-canary audience seed
curl -sS "$API_ORIGIN/v1/widget/config?tenant_id=$TENANT_ID&product_id=$PRODUCT_ID" \
  -H "x-anonymous-user-id: control-seed-a" | jq '.feature_flags.phase_0_5_canary_enabled'

# Bootstrap endpoint health
curl -sfI "$API_ORIGIN/widget/frame?tenant_id=$TENANT_ID&product_id=$PRODUCT_ID"
```

## Hold Rules
- If any required dashboard or query result is missing, stage status is `hold`.
- If the `add_to_cart` minimum sample is not met, stage status remains `hold` until either:
  - the sample threshold is met, or
  - deployment owner and data/analytics owner explicitly approve an extended observation window or a manual exception in the rollout ticket.
- A hold is not a rollback. Leave the stage percentage unchanged until a clear `advance` or `rollback` decision is logged.

## Rollback Notes
- Preferred rollback is feature-flag or audience-target rollback first.
- If rollback by flag is not sufficient, revert traffic routing or redeploy previous known-good artifact.
- Record phase, stage, breached gate, timestamp, and operator in the incident log.

## Rollback Procedure
1. Freeze progression and open an incident if one is not already open.
2. Apply the smallest safe rollback.
   - If the issue is limited to the current stage, reduce `WIDGET_PHASE_0_5_CANARY_PERCENTAGE` to the last known good stage or `0`.
   - If the issue is actively user-visible or stage reduction is too slow, set `phase_0_5_kill_switch=true`.
3. Re-verify the recovery path.
   - `GET /v1/widget/config` must return `phase_0_5_canary_enabled=false` for both canary and control seeds after kill-switch rollback.
   - `GET /widget/frame` must still return `200`.
   - Widget API 5xx and widget load failures must trend back toward baseline.
4. Record the rollback target, deployment ID, verification evidence, and owner sign-off in the stage log.
5. If the rollback changed a deployment artifact or env state, create or update the incident postmortem using `infra/runbooks/postmortem-template.md`.
