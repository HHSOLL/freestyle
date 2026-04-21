# Development Guide

## 1. Required Reading

Before changing the product, read these in order:

1. `README.md`
2. `docs/PERFECT_FITTING_EXECUTION_PLAN.md`
3. `docs/architecture-overview.md`
4. `docs/design-system.md`
5. `docs/avatar-pipeline.md`
6. `docs/garment-fitting-contract.md`
7. `docs/physical-fit-system.md`
8. `docs/admin-asset-publishing.md`
9. `docs/migration-notes.md`
10. `docs/TECH_WATCH.md`
11. `docs/freestyle-improvement-status.md`
12. `docs/repo-inventory.md`
13. `docs/product-boundaries.md`
14. `docs/contract-ownership.md`
15. `docs/ai-agent-playbook.md`
16. `docs/quality-gates.md`

## 1.1 Git Workflow

For every non-read-only task:

- start from `main` and create a fresh task branch, normally `codex/<task-slug>`
- do all edits and commits on that branch only
- push the branch to the remote before closing the task
- open a PR targeting `main`
- merge only after checks/review are acceptable
- switch back to `main`, sync it with the remote, and delete the merged task branch locally and remotely

Do not leave stale working branches around after the task is done.

## 2. Product Boundary

The main product is the public Home plus four app surfaces:

- `Closet`
- `Canvas`
- `Community`
- `Profile`

`Fitting` still exists as a product capability, but it belongs inside `Closet`. `/app/fitting` should remain only as a compatibility redirect.

`/` is the public home entry and must stay visually aligned with the wardrobe system.

Do not reintroduce old IA into the main shell.

Allowed exceptions:

- `Legacy`: only through redirects, migration shims, or explicitly deprecated surfaces
- `Lab`: explicitly experimental and isolated from the main navigation

## 3. Package Boundaries

The minimum domain structure is fixed:

- `apps/admin`
  - internal publishing workflows only
  - no public closet logic
- `apps/web`
  - page orchestration only
  - no direct domain logic embedded in large page files
- `apps/api`
  - product, legacy, and lab namespace registration
  - persistence and repository boundaries
- `packages/design-tokens`
  - palette, radii, spacing, surface treatment
- `packages/ui`
  - shared wardrobe UI primitives
- `packages/domain-avatar`
  - body profile normalization
  - local repository adapters
  - measurement-to-avatar transform logic
- `packages/domain-garment`
  - garment starter catalog
  - skeleton profile registry
  - runtime binding validation
- `packages/contracts`
  - shared runtime and persistence schemas
  - canonical product payload validation
- `packages/domain-canvas`
  - canvas composition serialization
  - local repository adapters over the shared contract
- `packages/runtime-3d`
  - avatar render manifest
  - runtime asset budget
  - pose, rig, and scene control
- `packages/shared-types`
  - canonical types shared across app boundaries
- `packages/shared-utils`
  - shared utilities only

Cross-domain imports should remain narrow and directional. `runtime-3d` may consume domain packages, but `domain-avatar` and `domain-garment` must not depend on page or shell code.

## 4. Page Rules

Pages are orchestration only.

A page may:

- compose panels
- fetch or hydrate data
- connect hooks and repositories
- choose the active surface and route state

A page may not:

- hold large chunks of reusable visual logic
- implement rig math inline
- own shared persistence schema
- mix UI state and low-level 3D scene mutation logic

When a page grows, split it into:

- presentation components
- domain hooks
- repository adapters
- runtime scene components

## 5. Body Profile Lifecycle

The canonical lifecycle is:

`user input -> BodyProfile -> normalized avatar params -> rig targets -> runtime mannequin`

Use these boundaries:

- `BodyProfile` is the canonical storage object in `packages/shared-types`
- `bodyProfileToAvatarParams` converts measurements into normalized control space
- `avatarParamsToRigTargets` converts normalized values into rig-level transforms
- `AvatarStageCanvas` applies those transforms to the active skeleton
- `fitReviewArchetypes` is the representative QA set for admin publishing and fit calibration, and `validate:fit-calibration` now snapshots the committed base-avatar measurements sidecars for the variants those archetypes resolve to
- avatar measurements-sidecar parse/type schemas now live in `packages/contracts`, while calibration-specific semantic expectations stay in `packages/domain-avatar`
- `avatarMeasurementsSidecarSchemaVersion` is now owned by `packages/contracts`; validators and tests should import it there instead of defining or reading a second literal from runtime-only files
- the `validate:fit-calibration` report artifact is now also versioned and parsed through `packages/contracts` before it is written to `output/fit-calibration/latest.json`
- both `validate:avatar3d` and `validate:fit-calibration` should import the shared calibration helper instead of re-declaring derivation rules or ad-hoc parse checks locally

Do not use a single global XYZ scale as a body-measurement shortcut. Height, shoulder width, chest, waist, hip, arm length, torso length, and leg volume must travel through the mapping layer.

## 6. Garment Runtime Rules

Use `packages/domain-garment` as the garment contract source of truth.

Required runtime fields:

- `modelPath`
- `skeletonProfileId`
- `anchorBindings`
- `collisionZones`
- `bodyMaskZones`
- `poseTuning` for pose-specific clearance and mask overrides on clipping-prone garments
- `secondaryMotion` for long hair and loose garments that need a lightweight spring response in runtime
- `surfaceClearanceCm`
- `renderPriority`
- `metadata.measurements`
- `metadata.fitProfile`

Current registry:

- skeleton profiles live in `packages/domain-garment/src/skeleton-profiles.ts`
- starter garments live in `packages/domain-garment/src/index.ts`

Every new garment asset must validate before product use. Use `npm run validate:garment3d` and keep the runtime contract aligned with [garment-fitting-contract.md](./garment-fitting-contract.md).

- `validate:garment3d` now parses the committed MPFB garment authoring summaries through `packages/contracts` before it evaluates the fit-budget thresholds, so malformed source summaries fail closed instead of silently falling through to ad-hoc JSON reads
- `validate:garment3d` now also resolves `patternSpec.relativePath` for committed starter garment summaries and delegates semantic parity checks to the shared `validateGarmentPatternSpecAgainstStarterCatalog` helper in `packages/domain-garment`
- authoring-only garment pattern/material metadata now lives in `authoring/garments/mpfb/specs/*.pattern-spec.json`; do not widen `/v1` or `PublishedGarmentAsset` just to carry that upstream metadata
- if starter `pattern-spec` semantics change, update `packages/domain-garment` tests and helper logic first, then let `validate:garment3d` reuse that rule instead of adding validator-only comparison branches
- `Phase 2` authoring contract v2 now also includes `*.material-profile.json`, `*.sim-proxy.json`, `*.collision-proxy.json`, and `*.hq-artifact.json` sidecars next to each committed `pattern-spec`; regenerate and sync them with `npm run authoring:garments:mpfb:sidecars`
- keep authoring bundle parity inside `packages/domain-garment` via `validateGarmentAuthoringBundleAgainstStarterCatalog`; do not add one-off validator-only comparisons for material, proxy, collider, or HQ artifact drift
- `Phase C` starts from the shared `garmentInstantFitReportSchema` plus `assessGarmentInstantFit` / `buildGarmentInstantFitReport`; keep product-facing fit recommendations derived from `GarmentFitAssessment` instead of inventing surface-specific report shapes
- the current product adapter is `closetRuntimeGarmentListResponseSchema`, used only by `/v1/closet/runtime-garments`; keep `/v1/admin/garments*` on the publication contract unless the admin surface explicitly needs a user-scoped fit recommendation
- the first product consumer now lives in `apps/web/src/components/product/closet-fit-report.ts`; if fit copy, region ordering, or tone mapping changes, update that helper and its test before touching `V18ClosetExperience.tsx`
- `V18ClosetExperience` may seed fit guidance from the API closet catalog, but active tab and equipped-item review should still prefer locally derived reports from the current deferred body profile
- `Phase D` now has an active HQ artifact path through `POST /v1/lab/jobs/fit-simulations`, `GET /v1/lab/fit-simulations/:id`, `apps/api/src/modules/fit-simulations/**`, and `workers/fit_simulation/src/worker.ts`
- keep that baseline honest: it currently persists `draped_glb`, typed `fit_map_json`, generated `preview_png`, and `metrics_json`, but the `draped_glb` is still an authored-scene merge placeholder rather than solver-deformed cloth truth
- lab/detail consumers should treat the artifact list as presentation-ordered: `draped_glb`, then `preview_png`, then `fit_map_json`, then `metrics_json`
- `Phase 5` now uses committed Playwright visual baselines for route-shell and closet-tier regression; when changing route chrome, stage framing, or closet quality tiers, update `apps/web/e2e/visual-regression.spec.ts` and its snapshot directory in the same PR
- `Phase 3` of the deep-research runtime plan now owns the interactive preview seam through `packages/runtime-3d/src/reference-closet-stage-preview-simulation.ts` plus the same-origin worker script at `apps/web/public/workers/reference-closet-stage-preview.worker.js`
- keep preview backend selection truthful: `static-fit`, `cpu-reduced`, and `worker-reduced` are current product paths; `experimental-webgpu` is only a reserved selector and must not be documented as solver-grade cloth unless a real compute path exists
- `Phase E` now starts from the typed `fit_map_json` contract in `packages/contracts`; fit, stress, pressure, and confidence overlays should evolve that shared schema instead of adding one-off worker-only JSON blobs
- the current `Phase E` lab read-path should prefer the persisted `fitMap` snapshot carried on `fitSimulation` records; do not make every consumer refetch and reparsed the artifact URL before the solver-backed pipeline exists
- the current `Phase E` closeout helper is `buildFitMapSummary` in `packages/domain-garment`; worker previews and future lab/product consumers should reuse that summary instead of inventing a second dominant-overlay heuristic

If the work touches product fit behavior, size charts, cloth response, or external research adoption, also keep [physical-fit-system.md](./physical-fit-system.md) current with sources and license decisions.

Admin workflow rule:

- `apps/admin` should stay form-first for partner operations
- raw JSON remains as an inspector and escape hatch, not the primary workflow
- every new garment should be creatable through the guided flow before it reaches `Closet`
- every publish candidate should also be reviewed through the built-in archetype fit preview before it reaches `Closet`

## 7. 3D Runtime Rules

The shared avatar manifest, reusable garment/runtime contract, and the current production `Closet` scene all live in `packages/runtime-3d`.

Current source-of-truth files:

- `packages/runtime-3d/src/avatar-manifest.ts`
- `packages/runtime-3d/src/index.tsx`
- `packages/runtime-3d/src/closet-stage.tsx`
- `packages/runtime-3d/src/closet-stage-fallback.tsx`
- `packages/runtime-3d/src/preload-runtime-assets.ts`
- `packages/runtime-3d/src/reference-closet-stage-sim-adapter.ts`
- `packages/runtime-3d/src/reference-closet-stage-preview-simulation.ts`
- `packages/runtime-3d/src/reference-closet-stage-policy.ts`
- `packages/runtime-3d/src/reference-closet-stage-view.tsx`
- `packages/runtime-3d/src/runtime-gltf-loader.ts`
- `packages/runtime-3d/src/runtime-disposal.ts`
- `packages/runtime-3d/src/runtime-model-paths.ts`

Rules:

- keep humanoid alias patterns with the avatar manifest
- keep the live `Closet` stage aligned with the shared manifest and garment contract
- keep `closet-stage.tsx` focused on scene logic; view/light/canvas ownership belongs in `reference-closet-stage-view.tsx`, while fit-driven adaptive adjustment belongs in `reference-closet-stage-sim-adapter.ts`
- keep reduced preview backend selection and frame stepping in `reference-closet-stage-preview-simulation.ts`; `closet-stage.tsx` may orchestrate the active backend, but it should not re-declare spring/invalidation math inline again
- preserve quality tiers: `low`, `balanced`, `high`
- keep asset budgets explicit
- handle load failure with UI fallbacks, not silent crashes
- keep body masking and render-order rules aligned with garment bindings
- keep the preview worker same-origin and static-served from `apps/web/public/workers`; if that worker path changes, update the stage wiring and the maintenance docs in the same PR
- treat effective body masking as the union of authored `bodyMaskZones`, pose-specific mask zones, and fit-driven adaptive expansion zones
- `feet`-only masks must still activate segmented-body rendering so shoe assets can actually hide feet
- preserve MPFB helper-hiding body mask modifiers during avatar export; removing them breaks the shipped `fullbody` silhouette even if the segmented zones still validate
- keep torso segmentation broad enough to absorb clavicle and neck-base coverage for fitted tops before reaching for whole-arm body masking
- keep `secondaryMotion` selective: long hair, loose tops, and loose outerwear only

`V18ClosetExperience.tsx` rule:

- keep orchestration and interaction flow in `V18ClosetExperience.tsx`
- keep large static preset/config registries in `apps/web/src/components/product/v18-closet-config.ts`
- if mannequin presets, tab metadata, pose labels, or category maps change, update the config module first instead of re-growing the page component
- keep the current `Closet` studio look on the generated room environment + ACES filmic tone mapping path; do not drop back to flat background-only lighting without visual evidence that the replacement is better
- keep camera and stage-policy tuning biased toward a centered full-body editorial frame rather than a distant fitting-room preview
- keep headless-browser stage evidence WebGL-capable; Playwright Chromium now launches with software WebGL (`swiftshader`) so route and tier baselines can render the stage instead of falling back to the unsupported placeholder
- default mannequin presentation should prefer stable, authoring-safe starter pieces; do not promote a starter hair/accessory asset into the reset/default loadout unless it is visually verified in the live `Closet` stage
- `V18ClosetExperience` background-theme controls must flow through `AvatarStageViewport` into the runtime stage policy and backdrop; do not leave the picker as a CSS-only shell theme control
- short-sleeve tops such as the default starter tee should not ship with permanent `arms` body masks; reserve arm masking for pose-tuned or clipping-specific cases so the mannequin does not look amputated in the default `Closet` pose
- keep layered outfit logic explicit: structured outerwear may auto-fallback to a base inner top, and bulky tops should not remain stacked under outerwear
- use meshopt-aware glTF loading for shipped runtime assets
- keep `GLTFLoader` configured for both `DRACOLoader` and `MeshoptDecoder`; optimized runtime GLBs now rely on both compression paths being decodable
- keep runtime stage loads and runtime preloads on the same shared loader configuration; do not duplicate glTF decoder setup across files
- keep clone-owned runtime materials on an explicit cleanup path; dispose only cloned stage-owned materials, never `useGLTF` cache source geometry or shared textures
- keep visible stage fallback ownership split by seam: host chunk/WebGL fallback in `apps/web/src/components/product/AvatarStageViewport.tsx`, in-canvas asset-loading placeholder in `packages/runtime-3d/src/closet-stage.tsx`
- keep host stage support/load/retry lifecycle policy in a pure helper so `AvatarStageViewport` transitions stay testable without mounting the 3D canvas
- keep top-level `Closet` scene policy in a pure runtime helper so `dpr`, lighting, damping, and continuous-motion gating stay testable without mounting `Canvas`
- preload only the active avatar, equipped garments, and near-term closet candidates
- avoid whole-catalog eager preload on module import
- prefer `frameloop="demand"` whenever the active stage has no continuous motion
- keep long hair / loose garment motion on settle-aware invalidation instead of switching the whole stage back to `frameloop="always"`
- sample `secondaryMotion` anchors from avatar alias bindings or weighted anchor targets, not from the already-moving garment subtree
- do not treat `secondaryMotion` as a replacement for measured fit, corrective authoring, or collision tuning
- validate promoted avatar assets with `npm run validate:avatar3d`
- validate starter and partner fit calibration with `npm run validate:fit-calibration`
- validate hero garment source summaries with `npm run validate:garment3d`; the measured `fitAudit` regression budget is now part of the garment gate, and the default equipped `Soft Casual` top is included in that guardrail
- keep starter garment pattern/material sidecars and starter runtime metadata in lockstep; `validate:garment3d` now treats sidecar drift as a contract failure instead of a docs-only mismatch
- rerun `npm run optimize:runtime:assets` after promoting new runtime GLBs

## 8. Persistence Rules

Current persistence is local-first but versioned for remote migration.

Keep separate repositories for:

- body profile
- closet scene
- canvas compositions

Compatibility rules:

- old flat body profile payloads must normalize into the current envelope shape
- canonical body-profile records now carry a derived `revision`; clients should treat that revision as the optimistic-concurrency token for writes
- API `PUT /v1/profile/body-profile` writes may include `baseRevision`; stale writes must fail with `409 REVISION_CONFLICT` instead of silently clobbering newer server state
- storage keys must stay versioned
- API-side body-profile persistence must stay behind a replaceable port so the file adapter can be swapped for a remote store without rewriting routes
- API-side published runtime-garment persistence must also stay behind a replaceable port so admin publication can move between the file fallback and the Supabase-backed `published_runtime_garments` store without changing route contracts
- use `GARMENT_PUBLICATION_PERSISTENCE_DRIVER=supabase` when the API should write and read from the remote publication table
- fit-simulation identity must stay revision-based, not timestamp-based; use canonical `bodyProfileRevision`, `garmentRevision`, and `cacheKey` instead of ad-hoc `updatedAt` snapshots for dedupe
- future API adapters must match the same repository boundary instead of rewriting page logic

## 9. API Usage Rules

Main product UI must talk to product routes only:

- `/v1/profile/*`
- `/v1/closet/*`
- `/v1/canvas/*`
- `/v1/community/*`

Current product-fit specific routes:

- public `Closet` runtime catalog: `/v1/closet/runtime-garments`
- public `Closet` runtime catalog response: `closetRuntimeGarmentListResponseSchema` (`{ item, instantFit }[]`)
- admin/publishing boundary: `/v1/admin/garments`
- admin create path: `POST /v1/admin/garments`
- admin publish routes must pass both schema validation and semantic runtime-garment validation before persistence
- admin publish routes must use explicit admin auth; anonymous-header fallback is not valid for `/v1/admin/garments*`

Legacy and lab must remain isolated:

- `/v1/legacy/*` for deprecated import/assets/outfits/widget paths
- `/v1/lab/*` for experimental evaluation and try-on paths

If a surface needs legacy or lab data, the page must present it as secondary or quarantined behavior, never as the primary product loop.

Auth and origin defaults:

- `ALLOW_ANONYMOUS_USER` is explicit opt-in only; do not rely on anonymous-header fallback unless the environment intentionally enables it
- `/v1/lab/*` must reject anonymous-header fallback even when product routes allow it
- explicit browser `Origin` headers are fail-closed unless they match `CORS_ORIGIN` or `CORS_ORIGIN_PATTERNS`
- no-origin server-to-server traffic may still pass without an allowlist, but that should not be used as a substitute for deployed browser origin configuration

## 10. Design System Rules

Use the wardrobe reference image as the visual truth source.

Required visual characteristics:

- public home that reads as the same product, not a marketing template from another system
- centered full-height mannequin stage
- slim translucent side rails
- floating top control rail
- floating bottom mode bar
- dense catalog controls
- restrained neutral palette
- thin dividers
- glassmorphism without heavy neon color

Implementation source-of-truth:

- `packages/design-tokens/src/index.ts`
- `packages/ui/src/index.tsx`
- `apps/web/src/components/layout/ProductAppShell.tsx`

## 11. Performance Rules

Every substantial change must consider:

- route-level code splitting
- lazy loading for non-critical surfaces
- runtime asset preloading
- runtime asset optimization with mesh/texture compression before shipping GLBs
- 3D asset and texture budgets
- selector and derived-state cleanup
- avoiding unnecessary rerenders
- mobile fallback quality tiers
- load/error/empty/invalid states

Do not hide performance debt behind visual polish.

## 12. Testing Rules

The minimum product gate is:

- `npm run lint`
- `npm run typecheck`
- `npm run test:core`
- `npm run build:services`
- `npm run build`

Local environment note:

- when running inside Codex desktop, native addons such as `sharp`, `lightningcss`, and `@next/swc` may fail under the bundled app Node
- for `npm run test:core`, `npm run build`, and `npm run build:admin`, prefer `PATH=/opt/homebrew/bin:$PATH <command>` so Homebrew Node loads the native modules correctly

Core tests that must stay healthy:

- body profile mapping
- garment runtime validation
- scene serialization
- route smoke coverage
- runtime asset budget
- critical shared UI rendering

## 13. Codex Plugin Scaffolds

Repo-local Codex plugins live under `plugins/<plugin-name>`.
If the plugin should appear in Codex UI ordering, update `.agents/plugins/marketplace.json` in the same change.

Use the shared plugin-creator skill script for new scaffolds:

```bash
python3 /Users/sol/.codex/skills/.system/plugin-creator/scripts/create_basic_plugin.py <plugin-name> \
  --path /Users/sol/Desktop/fsp/plugins \
  --marketplace-path /Users/sol/Desktop/fsp/.agents/plugins/marketplace.json \
  --with-marketplace
```

Rules:

- keep `.codex-plugin/plugin.json` present
- keep placeholder manifest values until the plugin contract is intentionally defined
- add tracked placeholder files when you create empty folders so the scaffold survives in git
- update this guide or `README.md` when plugin layout or plugin operating conventions change
- when a plugin exposes an MCP bridge, validate the bridge command and the runtime binary path in the same task
- for local MCP testing, prefer `codex mcp add <name> -- <command ...>` over shell-only ad hoc wiring so the connection is reproducible
- if a plugin is meant to be globally reusable across Codex agents on the same machine, provide one installer that syncs the home-local plugin copy, its runtime, global skill links, and the matching `mcp_servers.<name>` entry together

## 14. Documentation Sync

If you change:

- product IA
- API namespaces
- runtime mannequin contract
- garment fitting contract
- design tokens or shell layout
- persistence shape
- plugin layout or plugin operating conventions

you must update the corresponding document in the same change.
