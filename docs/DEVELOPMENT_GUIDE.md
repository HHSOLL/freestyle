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
- `fitReviewArchetypes` is the representative QA set for admin publishing and fit calibration

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
- `packages/runtime-3d/src/preload-runtime-assets.ts`

Rules:

- keep humanoid alias patterns with the avatar manifest
- keep the live `Closet` stage aligned with the shared manifest and garment contract
- preserve quality tiers: `low`, `balanced`, `high`
- keep asset budgets explicit
- handle load failure with UI fallbacks, not silent crashes
- keep body masking and render-order rules aligned with garment bindings
- treat effective body masking as the union of authored `bodyMaskZones`, pose-specific mask zones, and fit-driven adaptive expansion zones
- `feet`-only masks must still activate segmented-body rendering so shoe assets can actually hide feet
- preserve MPFB helper-hiding body mask modifiers during avatar export; removing them breaks the shipped `fullbody` silhouette even if the segmented zones still validate
- keep torso segmentation broad enough to absorb clavicle and neck-base coverage for fitted tops before reaching for whole-arm body masking
- keep `secondaryMotion` selective: long hair, loose tops, and loose outerwear only
- keep layered outfit logic explicit: structured outerwear may auto-fallback to a base inner top, and bulky tops should not remain stacked under outerwear
- use meshopt-aware glTF loading for shipped runtime assets
- keep `GLTFLoader` configured for both `DRACOLoader` and `MeshoptDecoder`; optimized runtime GLBs now rely on both compression paths being decodable
- preload only the active avatar, equipped garments, and near-term closet candidates
- avoid whole-catalog eager preload on module import
- prefer `frameloop="demand"` whenever the active stage has no continuous motion
- keep long hair / loose garment motion on settle-aware invalidation instead of switching the whole stage back to `frameloop="always"`
- sample `secondaryMotion` anchors from avatar alias bindings or weighted anchor targets, not from the already-moving garment subtree
- do not treat `secondaryMotion` as a replacement for measured fit, corrective authoring, or collision tuning
- validate promoted avatar assets with `npm run validate:avatar3d`
- validate starter and partner fit calibration with `npm run validate:fit-calibration`
- validate hero garment source summaries with `npm run validate:garment3d`; the measured `fitAudit` regression budget is now part of the garment gate, and the default equipped `Soft Casual` top is included in that guardrail
- rerun `npm run optimize:runtime:assets` after promoting new runtime GLBs

## 8. Persistence Rules

Current persistence is local-first but versioned for remote migration.

Keep separate repositories for:

- body profile
- closet scene
- canvas compositions

Compatibility rules:

- old flat body profile payloads must normalize into the current envelope shape
- storage keys must stay versioned
- future API adapters must match the same repository boundary instead of rewriting page logic

## 9. API Usage Rules

Main product UI must talk to product routes only:

- `/v1/profile/*`
- `/v1/closet/*`
- `/v1/canvas/*`
- `/v1/community/*`

Current product-fit specific routes:

- public `Closet` runtime catalog: `/v1/closet/runtime-garments`
- admin/publishing boundary: `/v1/admin/garments`
- admin create path: `POST /v1/admin/garments`
- admin publish routes must pass both schema validation and semantic runtime-garment validation before persistence

Legacy and lab must remain isolated:

- `/v1/legacy/*` for deprecated import/assets/outfits/widget paths
- `/v1/lab/*` for experimental evaluation and try-on paths

If a surface needs legacy or lab data, the page must present it as secondary or quarantined behavior, never as the primary product loop.

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
