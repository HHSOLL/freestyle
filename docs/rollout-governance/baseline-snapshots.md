# Baseline Snapshots

## Purpose
- Provides a fixed screenshot baseline for visual regression checks before canary rollout.
- The snapshot bundle is an operator artifact, not a design draft. Every capture must be reproducible from the recorded route, viewport, language, and auth state.

## Preconditions
- Use the same production build or staging-parity build that the rollout ticket references.
- Freeze language (`ko` or `en`) and auth state before the first capture and keep them constant for the entire run.
- Clear transient banners, debug overlays, and local feature toggles before capture.
- Record the artifact bundle location in `docs/rollout-governance/baseline-metrics-template.md`.

## Capture Order
1. Capture core public surface in this order: `/`, `/app/closet`, `/studio`, `/app/discover`, `/app/profile`.
2. Capture secondary informational/redirect surfaces in this order: `/app/looks`, `/app/decide`, `/app/journal`, `/examples`, `/how-it-works`.
3. For each route, capture desktop first and mobile second.
4. After each route pair, verify that the file paths are correct before moving to the next route.
5. Complete the review table below before coordinator approval.

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

## Capture Procedure
1. Confirm the build under test.
   - Record environment (`production` or `staging-parity`), deployment URL, and build ID in the rollout ticket.
2. Prepare the browser state.
   - Set the chosen language.
   - Sign in or remain signed out according to the baseline record.
   - Use a clean session; if reusing a browser profile, document that fact in the note field below.
3. Capture each route.
   - Save desktop as `desktop-1440x900.png`.
   - Save mobile as `mobile-390x844.png`.
   - Do not overwrite an existing approved baseline without updating the capture date folder.
4. Review immediately after capture.
   - Check top bar, typography, spacing, major CTA placement, empty/error states, and any unexpected modal or login prompt.
   - Mark `needs_retake` if the route is visually unstable or loaded partial content.
5. Publish the artifact bundle and copy the bundle link into the rollout ticket and baseline record.

## Capture Worksheet
| Route | Desktop artifact path | Mobile artifact path | Captured by | Reviewed by | Status | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/closet` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/studio` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/discover` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/profile` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/looks` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/decide` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/journal` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/examples` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/how-it-works` | `PENDING_PATH` | `PENDING_PATH` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |

## Capture Run Status
| Item | Status | Owner | Note |
| --- | --- | --- | --- |
| Route list freeze | `done` | `sol (frontend-owner)` | Routes are fixed by this document |
| Capture operator + environment selected | `pending` | `sol (deployment-owner)` | Use production build or staging-parity build with the rollout artifact ID recorded |
| Desktop captures | `pending` | `sol (frontend-owner)` | Must be complete before canary `1%` |
| Mobile captures | `pending` | `sol (frontend-owner)` | Must be complete before canary `1%` |
| Artifact bundle uploaded | `pending` | `sol (deployment-owner)` | Link the bundle in rollout ticket and baseline record |
| Coordinator approval | `pending` | `sol (incident-commander)` | Approve after route-by-route sanity check |

## Checklist
- Same language (`ko` or `en`) and same auth state for baseline and comparison.
- Shell chrome, typography, spacing, and panel tone must match tokenized rules.
- Any diff in core shell components requires coordinator sign-off.
- Redirect/informational surfaces must show the expected shell and CTA handoff, not an error or blank state.
