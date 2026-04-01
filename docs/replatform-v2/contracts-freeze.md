# Replatform v2 Contracts Freeze

## Purpose
- This document freezes the cross-team contracts for Phase `0.5`.
- Any change to the contracts below requires explicit coordinator approval.

## Frozen UI Contracts
- Global token namespace in `apps/web/src/app/globals.css`:
  - `--shell-*` (route backdrops)
  - `--glass-*` (surfaces, border, blur, shadows)
- Shared layout primitives in `apps/web/src/components/layout/ShellPrimitives.tsx`:
  - `GlassPanel`
  - `GlassPill`
  - `ShellEyebrow`
- Route informational handoff component:
  - `apps/web/src/features/renewal-app/components/RouteTransitionShell.tsx`

## Frozen Widget API Contracts
- `GET /v1/widget/config?tenant_id=<id>&product_id=<id>&widget_id=<optional>`
- `POST /v1/widget/events`

### Fixed Response Fields (`/v1/widget/config`)
- `theme`
- `feature_flags`
- `asset_base_url`
- `allowed_origins`
- `expires_at`
- `rate_limit`
- `dedupe_window_seconds`
- `widget_version_policy`
- `script_integrity` (optional)
- `stylesheet_integrity` (optional)

### Fixed Event Rules (`/v1/widget/events`)
- `event_id` required
- `idempotency_key` optional
- dedupe window: `24h`
- replay guard: when `occurred_at` is present, accept only within `-24h` to `+5m` window
- partial-accept semantics (`accepted`, `duplicate`, `rejected`)
- envelope and event `tenant_id/product_id` mismatch -> reject as `WIDGET_EVENT_INVALID`

## Frozen Error Taxonomy
- `WIDGET_CONFIG_NOT_FOUND`
- `WIDGET_ORIGIN_DENIED`
- `WIDGET_EVENT_INVALID`
- `WIDGET_EVENT_RATE_LIMITED`
- `WIDGET_MOUNT_FAILED`
- `WIDGET_ASSET_LOAD_FAILED`

## Security Contract
- iframe message trust is determined by runtime `event.origin` only.
- Payload-provided origin fields are never trusted as authorization signals.

## Rollout Gate Source of Truth
- `docs/rollout-governance/canary-gates.md`
- Gate values in that document are fixed for the current rollout cycle.

## Change Control
- Contract changes must be proposed in a dedicated PR section titled `Contract Change Request`.
- Coordinator sign-off is mandatory before merge.
