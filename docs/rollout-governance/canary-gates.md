# Canary Gates

## Progression
- Fixed progression: `1% -> 5% -> 25% -> 100%`
- Do not skip a stage.
- Do not advance while any stop gate is breached or incident is open.

## Gate Evaluation
- Evaluate on production traffic at the current canary percentage.
- Use rolling `15-min` windows for active canary checks.
- Use the latest approved baseline from `baseline-metrics-template.md` for delta comparisons.
- The `add_to_cart` conversion gate applies only when the minimum sample is met: at least `1000` qualified sessions and `100` `add_to_cart` events in the stage window.

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

## Operational Procedure
1. Start at `1%`.
2. Validate all gates for the current stage.
3. Advance only in sequence: `1% -> 5% -> 25% -> 100%`.
4. On any gate breach, freeze progression immediately.
5. Roll back exposure to the last known good state before further debugging.

## Rollback Notes
- Preferred rollback is feature-flag or audience-target rollback first.
- If rollback by flag is not sufficient, revert traffic routing or redeploy previous known-good artifact.
- Record phase, stage, breached gate, timestamp, and operator in the incident log.
