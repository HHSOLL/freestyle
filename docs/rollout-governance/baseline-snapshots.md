# Baseline Snapshots

## Purpose
- Provides a fixed screenshot baseline for visual regression checks before canary rollout.

## Capture Matrix
| Route | Desktop | Mobile |
| --- | --- | --- |
| `/` | required | required |
| `/app/closet` | required | required |
| `/studio` | required | required |
| `/app/discover` | required | required |
| `/app/profile` | required | required |
| `/app/looks` | required | required |
| `/app/decide` | required | required |
| `/app/journal` | required | required |
| `/examples` | required | required |
| `/how-it-works` | required | required |

## Storage Convention
- Save under: `output/baseline-snapshots/<YYYY-MM-DD>/<route>/<viewport>.png`
- Viewport keys:
  - `desktop-1440x900`
  - `mobile-390x844`
- `output/` is gitignored. Upload snapshot bundles to release artifact storage and attach the artifact link in rollout ticket.

## Capture Run (2026-04-02)
| Item | Status | Owner | Note |
| --- | --- | --- | --- |
| Route list freeze | `done` | `sol (frontend-owner)` | Routes are fixed by this document |
| Capture command/script | `done` | `sol (deployment-owner)` | Use Playwright/agent-browser capture in staging parity env |
| Desktop captures | `pending` | `sol (frontend-owner)` | Must be captured before canary `1%` |
| Mobile captures | `pending` | `sol (frontend-owner)` | Must be captured before canary `1%` |
| Coordinator approval | `pending` | `sol (incident-commander)` | Approve after diff sanity check |

## Capture Command (reference)
```bash
# Example reference command in local/staging parity env
# Save outputs to output/baseline-snapshots/2026-04-02/<route>/<viewport>.png
```

## Checklist
- Same language (`ko` or `en`) and same auth state for baseline and comparison.
- Shell chrome, typography, spacing, and panel tone must match tokenized rules.
- Any diff in core shell components requires coordinator sign-off.
