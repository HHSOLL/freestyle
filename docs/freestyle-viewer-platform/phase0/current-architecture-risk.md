# Freestyle Viewer Platform Phase 0 Current Architecture Risk

## Capture metadata

- status: `active risk register`
- capturedAt: `2026-04-23T01:19:36+0900`
- sourceCommit: `4bf4038`
- sourceBranch: `codex/freestyle-viewer-platform-refactor`

## Risk register

| Risk | Evidence | Current control | Missing verification | Priority |
| --- | --- | --- | --- | --- |
| Product still depends on `packages/runtime-3d` instead of `viewer-core` | `README.md`, `docs/architecture-overview.md`, `docs/DEVELOPMENT_GUIDE.md` all describe `viewer-core` as a future hot path while `runtime-3d` remains the current compatibility runtime | host seam exists through `packages/viewer-core`, `packages/viewer-react`, and `apps/web/src/components/product/AvatarStageViewport.tsx` | no production route runs on the new imperative viewer yet | `P0` |
| Browser preview is reduced preview, not solver-grade cloth | `README.md` and `docs/DEVELOPMENT_GUIDE.md` explicitly describe `static-fit`, `cpu-reduced`, and `worker-reduced` as the active preview modes | same-origin worker seam and typed preview messaging already exist | no XPBD or fit-mesh deformation pipeline on the product route | `P0` |
| HQ `draped_glb` is still authored-scene merge baseline | `README.md`, `docs/DEVELOPMENT_GUIDE.md`, `docs/physical-fit-system.md`, and `workers/fit_simulation/src/worker.test.ts` all preserve this caveat | typed artifact bundle exists and `Closet` can request, poll, and inspect it | no solver-deformed geometry truth, no certification-grade region metrics | `P0` |
| Product-route latency instrumentation is still partial | `viewer-react` emits first-avatar-paint and garment-swap preview latency, and Phase 10 forwards the flagged `Closet` path to `POST /v1/telemetry/viewer` when the client API base URL is configured | route-level attrs, typed browser events, Phase 9 e2e evidence, and product telemetry ingress exist for the flagged path | default `runtime-3d` still lacks equivalent product telemetry; cached vs uncached classification and real render/GPU counters remain open | `P0` |
| No runtime telemetry for draw calls, triangles, GPU texture memory, or context restore | current repo has asset budgets and disposal tests, but no browser telemetry channel for these metrics | `packages/runtime-3d/src/runtime-asset-budget.ts`, disposal tests, and route smoke reduce obvious drift | no runtime budget gate tied to actual render stats or context-loss recovery | `P1` |
| Visual baseline coverage is desktop-heavy | current committed goldens cover route shells and closet low/balanced/high tiers in desktop Chromium | `apps/web/e2e/visual-regression.spec.ts` and `docs/qa/phase5-visual-regression-2026-04-22.md` freeze desktop evidence | no mobile visual baseline set and no full certification matrix for fit-critical zoom views | `P1` |
| Certification workflow is only partially enforced | `publication.approvalState` is now enforced for product closets and exposed in admin, and supported garment categories now carry a synchronized optional `viewerManifest` shadow on write, but certification is not yet a full asset-factory workflow | `/v1/closet/runtime-garments` defaults to `PUBLISHED`, `/v1/admin/garments` can inspect candidate states, admin/API writes can synchronize `publication.viewerManifestVersion` plus the canonical garment manifest shadow | no admin certification tool with visual/fit/perf approval evidence bundle yet; legacy published rows still lack full manifest coverage | `P1` |

## Phase 10 telemetry status note

The product-route latency instrumentation risk is now partially reduced, but not fully closed.

- the forced `viewer-react` host records first-avatar-paint and garment-swap preview latency as non-blocking browser evidence
- the seam is currently exposed through host data attributes and typed browser custom events
- Phase 10 forwards the flagged `Closet` path to `POST /v1/telemetry/viewer` when the client API base URL is configured
- forwarded telemetry preserves Phase 9 release-flag, kill-switch, source, and viewer-host tags
- the default `runtime-3d` product host still does not emit the same telemetry envelope
- cached vs uncached preview timing, GPU/render metrics, and context-restore timing remain open risks

## Phase 0 conclusion

The current architecture is stable enough to keep shipping the mannequin-first product baseline, but it is not yet the production-grade viewer-platform architecture described by the new refactor program.

Phase 0 therefore closes only as a baseline freeze:

1. current evidence is documented
2. current limitations are explicit
3. later phases must remove these risks with code and measurable telemetry, not with wording alone
