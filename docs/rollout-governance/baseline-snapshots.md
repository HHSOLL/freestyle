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

## Checklist
- Same language (`ko` or `en`) and same auth state for baseline and comparison.
- Shell chrome, typography, spacing, and panel tone must match tokenized rules.
- Any diff in core shell components requires coordinator sign-off.
