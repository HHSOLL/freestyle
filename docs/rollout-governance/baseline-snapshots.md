# Baseline Snapshots

## Purpose
- Provides a fixed screenshot baseline for visual regression checks before canary rollout.
- The primary baseline is now the committed Playwright golden set under `apps/web/e2e/visual-regression.spec.ts-snapshots/`.
- Optional exported bundles remain useful for rollout tickets, but the repo-committed goldens are the CI blocking source of truth.

## Preconditions
- Use the same production build or staging-parity build that the rollout ticket references.
- Freeze language (`ko` or `en`) and auth state before the first capture and keep them constant for the entire run.
- Clear transient banners, debug overlays, and local feature toggles before capture.
- Record the artifact bundle location in `docs/rollout-governance/baseline-metrics-template.md`.
- When refreshing the repo-committed baseline, run `PATH="/opt/homebrew/bin:$PATH" PLAYWRIGHT_BASE_URL=<url> npm run test:e2e:visual -- --update-snapshots`.

## Capture Order
1. Capture core public surface in this order: `/`, `/app/canvas`, `/app/community`, `/app/profile`.
2. Capture `Closet` quality-tier baselines in this order: `low`, `balanced`, `high`.
3. For each route or tier, capture desktop first.
4. If rollout requires a separate exported bundle, verify the file paths immediately after capture.
5. Complete the review table below before coordinator approval.

## Capture Matrix
| Route | Desktop | Mobile |
| --- | --- | --- |
| `/` | required | required |
| `/app/closet` | required | required |
| `/app/canvas` | required | required |
| `/app/community` | required | required |
| `/app/profile` | required | required |
| `Closet low tier` | required | optional |
| `Closet balanced tier` | required | optional |
| `Closet high tier` | required | optional |

## Storage Convention
- Repo-committed goldens live under: `apps/web/e2e/visual-regression.spec.ts-snapshots/`
- Optional exported bundle: `output/baseline-snapshots/<YYYY-MM-DD>/<route>/<viewport>.png`
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
   - For current CI parity, seed the same deterministic local storage used by `apps/web/e2e/visual-regression.spec.ts`.
3. Capture each route.
   - Save desktop as `desktop-1440x900.png`.
   - Save mobile as `mobile-390x844.png` when a mobile baseline is needed.
   - Do not overwrite an existing approved baseline without updating the capture date folder.
4. Review immediately after capture.
   - Check top bar, typography, spacing, major CTA placement, empty/error states, and any unexpected modal or login prompt.
   - For `Closet` tiers, also check that the stage rendered with the expected quality tier instead of a WebGL unsupported placeholder.
   - Mark `needs_retake` if the route is visually unstable or loaded partial content.
5. Publish the artifact bundle and copy the bundle link into the rollout ticket and baseline record.

## Capture Worksheet
| Route | Desktop artifact path | Mobile artifact path | Captured by | Reviewed by | Status | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `apps/web/e2e/visual-regression.spec.ts-snapshots/home-shell-chromium-darwin.png` | `PENDING_PATH_OR_NA` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/canvas` | `apps/web/e2e/visual-regression.spec.ts-snapshots/canvas-empty-shell-chromium-darwin.png` | `PENDING_PATH_OR_NA` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/community` | `apps/web/e2e/visual-regression.spec.ts-snapshots/community-feed-shell-chromium-darwin.png` | `PENDING_PATH_OR_NA` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `/app/profile` | `apps/web/e2e/visual-regression.spec.ts-snapshots/profile-summary-shell-chromium-darwin.png` | `PENDING_PATH_OR_NA` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `Closet low tier` | `apps/web/e2e/visual-regression.spec.ts-snapshots/closet-low-tier-chromium-darwin.png` | `PENDING_PATH_OR_NA` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `Closet balanced tier` | `apps/web/e2e/visual-regression.spec.ts-snapshots/closet-balanced-tier-chromium-darwin.png` | `PENDING_PATH_OR_NA` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |
| `Closet high tier` | `apps/web/e2e/visual-regression.spec.ts-snapshots/closet-high-tier-chromium-darwin.png` | `PENDING_PATH_OR_NA` | `PENDING_OWNER` | `PENDING_OWNER` | `pending` | `PENDING_NOTE` |

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
