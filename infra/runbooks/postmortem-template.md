# Postmortem Template

## Incident Summary
- Incident ID:
- Phase:
- Canary stage: `1%` / `5%` / `25%` / `100%`
- Start time:
- End time:
- Incident commander:
- Deployment owner:
- Runtime owner:

## Trigger
- Rollout artifact / deploy ID:
- Flag state at incident start:
- Breached gate:
- Breach value:
- Baseline reference:

## User And Business Impact
- Affected audience:
- Duration:
- User-visible symptoms:
- Funnel impact:
- `add_to_cart` impact:

## Timeline
| Time | Event | Owner |
| --- | --- | --- |
| `TBD` | `TBD` | `TBD` |

## Root Cause
- Primary cause:
- Contributing factors:
- Why the gate did not prevent earlier:

## Mitigation And Rollback
- Stop action taken:
- Rollback action taken:
- Recovery verification:
- Residual risk after recovery:

## Corrective Actions
| Action | Owner | Due date | Status |
| --- | --- | --- | --- |
| `TBD` | `TBD` | `TBD` | `open` |

## Evidence
- Dashboard links:
- Query links:
- Logs / traces:
- Screenshots:

## Closeout Checklist
- Postmortem reviewed by deployment owner, runtime owner, and incident commander.
- Follow-up actions filed and linked.
- Canary gates or runbooks updated if needed.
