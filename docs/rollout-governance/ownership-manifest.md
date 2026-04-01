# Rollout Ownership Manifest

## Scope
- Applies to Phase `0.5`, `4`, and `5` production rollouts.
- Source of truth for rollout path ownership, approvals, and rollback authority.

## Operational Boundary
- Control plane: Vercel frontend deploy, Railway API/worker deploy, Supabase config, feature flag targeting.
- Data plane: widget traffic, `/v1/*` API requests, job queue execution, add-to-cart funnel.
- Dependency edges: Vercel -> Railway API -> Supabase/Auth/Storage -> external providers.

## Role Map
| Role | Primary owner | Backup owner | Responsibility |
| --- | --- | --- | --- |
| Deployment owner | `TBD` | `TBD` | Starts canary, advances `1% -> 5% -> 25% -> 100%`, stops rollout, executes rollback. |
| Runtime owner | `TBD` | `TBD` | Watches health gates, confirms incident scope, coordinates recovery. |
| Frontend owner | `TBD` | `TBD` | Owns widget load, JS error, Web Vitals, flag wiring. |
| API owner | `TBD` | `TBD` | Owns widget API `5xx`, backend readiness, dependency health. |
| Data/analytics owner | `TBD` | `TBD` | Publishes baseline, validates sample sufficiency, confirms conversion deltas. |
| Incident commander | `TBD` | `TBD` | Owns user comms, timeline, stop/rollback call if owners disagree. |

## Approval Chain
1. Baseline metrics doc is filled and approved before Phase `0.5`.
2. Deployment owner and runtime owner approve canary start.
3. Stage advance requires explicit sign-off from runtime owner and data/analytics owner.
4. Any stop gate breach gives deployment owner, runtime owner, or incident commander authority to halt immediately.
5. Rollback can be executed unilaterally by deployment owner or incident commander.

## File And Artifact Ownership
| Artifact | Owner |
| --- | --- |
| `docs/rollout-governance/ownership-manifest.md` | Deployment owner |
| `docs/rollout-governance/baseline-metrics-template.md` | Data/analytics owner |
| `docs/rollout-governance/canary-gates.md` | Runtime owner |
| `docs/rollout-governance/feature-flag-matrix.md` | Frontend owner + deployment owner |
| `infra/runbooks/postmortem-template.md` | Incident commander |

## Handoff Rules
- Frontend gate breach: frontend owner leads mitigation, runtime owner decides stop/rollback.
- API or queue gate breach: API owner leads mitigation, deployment owner freezes progression.
- Conversion gate breach: data/analytics owner validates sample, incident commander decides continue vs rollback with deployment owner.
- No stage advances while an incident is open.

## Rollback Authority
- Preferred rollback order: feature flag exposure rollback, traffic rollback, worker disable, then previous artifact restore.
- Rollback must preserve audit trail: who rolled back, when, phase, target stage, reason.
