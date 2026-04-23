# FreeStyle Improvement Status

## Purpose

This document is the active execution tracker for the repository improvement program aligned to the 2026-04-18 FreeStyle review.

It is separate from `docs/replatform-v2/**`.

- `docs/replatform-v2/**` remains the historical rollout and widget/canary track.
- This file tracks the current mannequin-first product hardening program.
- the newer viewer-platform refactor and asset-factory evidence live under `docs/freestyle-viewer-platform/**`, including the current garment certification bundle at `output/garment-certification/latest.json`
- When the two disagree, use this file together with `README.md`, `docs/architecture-overview.md`, `docs/repo-inventory.md`, and `docs/product-boundaries.md`.

## As Of

- Date: `2026-04-22`
- Current branch baseline: `main`
- Working overall completion estimate: `100%`

The completion estimate is a planning number, not a release gate. It now reflects that the repository-improvement, operational-closeout, and baseline follow-on roadmap tracked in this document are complete. Higher-fidelity cloth solving and richer pressure semantics remain future R&D, but are no longer open seams in this execution program.
As of `2026-04-22`, release-grade Playwright visual baselines also exist for the current IA plus `Closet` low / balanced / high quality tiers, and the maintenance docs treat them as RC evidence. The last missing HQ-fit consumer seam is also closed: `Closet` can now request an HQ run, poll the persisted record, render `preview_png`, and expose the ordered artifact bundle directly.

## Phase Map

| Phase | Goal | Status | Notes |
| --- | --- | --- | --- |
| `Phase 0` | scope lock, repo inventory, route boundary freeze, execution tracker reset | `completed` | `Batch 1` and `Batch 2` are complete |
| `Phase 1` | Product / Legacy / Lab separation hardening | `completed` | Boundary helpers, smoke guards, and historical-doc markers are aligned to the current product definition |
| `Phase 2` | contracts and domain core hardening | `completed` | `BodyProfile`, canvas, runtime garment, physical-fit assessment, and the last legacy shared-3d fit-summary drift are now closed on the active path |
| `Phase 3` | Closet and runtime-3d stabilization | `completed` | Loader, disposal, visible fallback ownership, host lifecycle coverage, and top-level stage scene policy are now centralized and regression-tested |
| `Phase 4` | server persistence and admin publishing hardening | `completed` | `BodyProfile` persistence is replaceable, and published runtime garments now have a remote Supabase backing store with RLS-ready coverage plus local fallback |
| `Phase 5` | worker, job contract, and observability hardening | `completed` | `Batch 1` and `Batch 2` are complete; broader release smoke now moves to `Phase 6` |
| `Phase 6` | QA, security, and release candidate | `completed` | `Batch 1` added screenshot and smoke evidence, and `Batch 2` closed the live env-backed lab smoke, security/RLS checklist, and RC freeze notes |

## Post-Phase Follow-On

| Track | Goal | Status | Notes |
| --- | --- | --- | --- |
| `Operational closeout` | formal browser smoke, RC tag cadence, frozen closeout evidence | `completed` | `npm run test:e2e:ops-closeout` now exists and the active closeout note is `docs/qa/operational-closeout-2026-04-20.md` |
| `Phase A` | avatar authoring pipeline hardening | `completed` | base-avatar contract, sidecar/report schemas, shipped GLB validation, provenance, and committed regression fixtures are now closed |
| `Phase B` | pattern and garment metadata layer | `completed` | `Batch 1`, `Batch 2`, and `Batch 3` are complete; committed starter pattern-spec parity is now owned by a shared garment-domain helper instead of ad-hoc validator logic |
| `Phase C` | instant fit engine | `completed` | `Batch 1`, `Batch 2`, and `Batch 3` are complete; the product `Closet` route now ships user-scoped instant-fit seeds while local fit review remains the live override path |
| `Phase D` | offline cloth simulation worker | `completed` | `Batch 1` reserved the contract seam, `Batch 2` closed the lab create/read path, `Batch 3` added `preview_png` plus typed fit-map overlay artifacts, and `Batch 4` closed the HQ artifact bundle with baseline `draped_glb` and `metrics_json` |
| `Phase E` | fit / stress / pressure map | `completed` | `Batch 1` promoted the current `fit_map_json` payload into a typed overlay contract (`ease`, `stretch`, `collisionRisk`, `confidence`), `Batch 2` carried that `fitMap` snapshot through the lab read-path, and `Batch 3` closed the summary/consumer seam |

### `Phase A / Batch 1`

Status: `completed`

Completed work:

1. added manifest schema versioning and source-provenance metadata for MPFB base-avatar variants
2. taught the MPFB Blender build path and wrapper to emit the same schema-version and provenance contract into regenerated base-avatar summaries
3. added source-provenance metadata to MPFB raw summary outputs for path-schema parity checks without relying on checkout-specific absolute preset paths
4. added validator enforcement for manifest/schema/version/path parity between MPFB summaries and runtime manifest entries
5. documented the MPFB base-avatar contract requirements in the active avatar pipeline and authoring docs

Evidence:

- `authoring/avatar/README.md`
- `authoring/avatar/exports/raw/mpfb-female-base.summary.json`
- `authoring/avatar/exports/raw/mpfb-male-base.summary.json`
- `authoring/avatar/mpfb/README.md`
- `authoring/avatar/mpfb/scripts/build_runtime_avatar.py`
- `packages/runtime-3d/src/avatar-manifest.ts`
- `scripts/build-mpfb-base-avatars.mjs`
- `scripts/validate-avatar-3d.mjs`
- `docs/avatar-pipeline.md`

Outcome:

- MPFB base-avatar contract now has explicit schema-version and source-provenance checks before runtime validation is marked passed
- future `authoring:avatar:mpfb:build` reruns now regenerate the same contract instead of depending on hand-edited summary files

### `Phase A / Batch 2`

Status: `completed`

Completed work:

1. promoted `skeleton`, `measurements`, and `morph-map` JSON sidecars into the MPFB base-avatar authoring contract
2. extended manifest provenance so each shipped base-avatar variant now declares the expected sidecar file paths next to `summaryPath`
3. taught the Blender build path to regenerate geometry-derived reference measurements and sidecar outputs alongside the summary JSON
4. tightened `validate:avatar3d` so sidecar existence, schema version, summary parity, and body-segment naming all fail closed
5. corrected active docs so the current female promoted preset and sidecar contract match the shipped authoring outputs

Evidence:

- `authoring/avatar/README.md`
- `authoring/avatar/mpfb/README.md`
- `authoring/avatar/mpfb/scripts/build_runtime_avatar.py`
- `authoring/avatar/exports/raw/mpfb-female-base.summary.json`
- `authoring/avatar/exports/raw/mpfb-female-base.skeleton.json`
- `authoring/avatar/exports/raw/mpfb-female-base.measurements.json`
- `authoring/avatar/exports/raw/mpfb-female-base.morph-map.json`
- `authoring/avatar/exports/raw/mpfb-male-base.summary.json`
- `authoring/avatar/exports/raw/mpfb-male-base.skeleton.json`
- `authoring/avatar/exports/raw/mpfb-male-base.measurements.json`
- `authoring/avatar/exports/raw/mpfb-male-base.morph-map.json`
- `packages/runtime-3d/src/avatar-manifest.ts`
- `scripts/validate-avatar-3d.mjs`
- `docs/avatar-pipeline.md`
- `docs/OPEN_ASSET_CREDITS.md`

Outcome:

- base-avatar authoring outputs now have explicit sidecar artifacts that can be consumed by later skeleton, measurement, and morph-calibration work without scraping the large summary blob
- `validate:avatar3d` now guards the sidecar contract directly instead of only checking the summary JSON
- the next Phase A batch can move to richer skeleton/measurement export semantics without first solving file-existence or path-parity drift

### `Phase A / Batch 3`

Status: `completed`

Completed work:

1. added `authoring/avatar/mpfb/source-lock.json` as the pinned source-of-truth for MPFB revision and asset-pack checksum/source URLs
2. updated the MPFB build wrapper to resolve authoring inputs from that lock instead of floating `origin/master`
3. taught the base-avatar summary and sidecars to carry concrete `buildProvenance` for MPFB revision, asset-pack checksum, and builder metadata
4. tightened `validate:avatar3d` so exported provenance must match the lock file as well as the existing summary/sidecar parity checks
5. documented the lock-file workflow in the active avatar authoring docs

Evidence:

- `authoring/avatar/mpfb/source-lock.json`
- `scripts/build-mpfb-base-avatars.mjs`
- `authoring/avatar/mpfb/scripts/build_runtime_avatar.py`
- `authoring/avatar/exports/raw/mpfb-female-base.summary.json`
- `authoring/avatar/exports/raw/mpfb-female-base.skeleton.json`
- `authoring/avatar/exports/raw/mpfb-female-base.measurements.json`
- `authoring/avatar/exports/raw/mpfb-female-base.morph-map.json`
- `authoring/avatar/exports/raw/mpfb-male-base.summary.json`
- `authoring/avatar/exports/raw/mpfb-male-base.skeleton.json`
- `authoring/avatar/exports/raw/mpfb-male-base.measurements.json`
- `authoring/avatar/exports/raw/mpfb-male-base.morph-map.json`
- `scripts/validate-avatar-3d.mjs`
- `authoring/avatar/README.md`
- `authoring/avatar/mpfb/README.md`
- `docs/avatar-pipeline.md`

Outcome:

- base-avatar authoring reruns are now traceable to a concrete MPFB revision and asset-pack payload instead of an implicit moving upstream
- the next avatar batch can work on richer semantic sidecars or shipped-GLB validation without first solving upstream input drift

### `Phase A / Batch 4`

Status: `completed`

Completed work:

1. extended `validate:avatar3d` so it parses the committed shipped avatar GLBs instead of only checking file existence plus summary/sidecar parity
2. added binary-level checks for runtime optimization extensions, default-scene root naming, manifest alias resolution, segmented body-node presence, skin joint parity, and morph target names/counts
3. added `outputArtifact` to the raw MPFB base-avatar summaries so the promoted GLB byte size and SHA-256 digest are part of the authoring contract
4. updated the MPFB Blender build script so future summary reruns regenerate the same output digest metadata
5. synced avatar authoring docs so the active contract now includes post-optimize binary parity

Evidence:

- `authoring/avatar/mpfb/scripts/build_runtime_avatar.py`
- `authoring/avatar/exports/raw/mpfb-female-base.summary.json`
- `authoring/avatar/exports/raw/mpfb-male-base.summary.json`
- `scripts/validate-avatar-3d.mjs`
- `authoring/avatar/README.md`
- `authoring/avatar/mpfb/README.md`
- `docs/avatar-pipeline.md`

Outcome:

- `validate:avatar3d` now fails on shipped-avatar binary drift caused after export/optimization instead of trusting JSON-only parity
- promoted base-avatar summaries now carry a recorded post-optimize digest so future reruns can prove they still describe the exact shipped GLB

### `Phase A / Batch 5`

Status: `completed`

Completed work:

1. formalized `referenceMeasurementsMmDerivation` on the MPFB measurements sidecar so each reference dimension now records its extraction method and source anchors
2. kept the change authoring-only by leaving runtime consumers untouched and preserving the existing measurements-sidecar schema boundary
3. tightened `validate:avatar3d` so the measurements sidecar must declare the expected derivation contract, rig anchors, and authoring QA intent
4. updated the MPFB Blender build script so future reruns regenerate the same derivation metadata next to the existing reference measurements
5. synced avatar authoring docs so the measurements sidecar is documented as a geometry-derived QA artifact with explicit semantic extraction metadata

Evidence:

- `authoring/avatar/mpfb/scripts/build_runtime_avatar.py`
- `authoring/avatar/exports/raw/mpfb-female-base.measurements.json`
- `authoring/avatar/exports/raw/mpfb-male-base.measurements.json`
- `scripts/validate-avatar-3d.mjs`
- `authoring/avatar/README.md`
- `authoring/avatar/mpfb/README.md`
- `docs/avatar-pipeline.md`

Outcome:

- authoring QA can now distinguish numeric measurement drift from semantic extraction drift
- future calibration work can consume the measurements sidecar with explicit bone/object provenance instead of reverse-engineering the Python build path

### `Phase A / Batch 6`

Status: `completed`

Completed work:

1. added a calibration-side measurements read path to `validate:fit-calibration` using the committed MPFB measurements sidecars for the active base-avatar variants
2. resolved sidecar file paths through the runtime avatar manifest and archetype variant resolution instead of introducing a second hardcoded path map
3. extended the fit-calibration report with `avatarCalibrationReferences`, including reference measurements, derivation metadata, provenance, and the archetype sets attached to each base variant
4. added per-archetype `avatarVariantId`, sidecar path, and comparable linear-dimension deltas so calibration evidence can surface semantic extraction drift without changing fit math
5. synced active docs so the measurements sidecar is now documented as a calibration evidence input while remaining outside the live runtime mapping path

Evidence:

- `scripts/validate-fit-calibration.mjs`
- `output/fit-calibration/latest.json`
- `README.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/avatar-pipeline.md`
- `docs/physical-fit-system.md`

Outcome:

- the measurements sidecar now has a first consumer beyond `validate:avatar3d`, but that consumer is still artifact-only and calibration-scoped
- calibration reports can now show which committed MPFB reference baselines and derivation rules were in force when the starter fit matrix was generated

### `Phase A / Batch 7`

Status: `completed`

Completed work:

1. extracted shared avatar measurements-sidecar calibration helpers into `packages/domain-avatar`
2. rewired `validate:avatar3d` to use the shared summary-parity helper instead of maintaining a second copy of the derivation contract inline
3. rewired `validate:fit-calibration` to use the same shared base-sidecar expectations while keeping its report semantics unchanged
4. added targeted domain-avatar tests that lock the derivation contract and summary parity checks at the helper level
5. removed the duplicate untracked `authoring/avatar/mpfb/source-lock 2.json` artifact from the workspace

Evidence:

- `packages/domain-avatar/src/calibration.ts`
- `packages/domain-avatar/src/calibration.test.ts`
- `packages/domain-avatar/src/index.ts`
- `scripts/validate-avatar-3d.mjs`
- `scripts/validate-fit-calibration.mjs`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- avatar measurements-sidecar expectations now live in one calibration-owned helper instead of drifting between two validators
- future Phase A batches can widen sidecar consumption or schema evolution without first reconciling duplicated validation logic

### `Phase A / Batch 8`

Status: `completed`

Completed work:

1. formalized the avatar measurements-sidecar parse/type contract in `packages/contracts` with explicit schemas for reference measurements and derivation metadata
2. updated `packages/domain-avatar` so the calibration helper now parses against the shared contract before applying semantic validation
3. rewired `validate:avatar3d` and `validate:fit-calibration` to consume the parsed sidecar contract through the shared helper instead of reading untyped JSON blobs directly
4. added contract tests for the authoring artifact shape and domain-avatar tests for parsed-sidecar drift handling
5. synced active docs so parse ownership and semantic ownership are now split cleanly between `contracts` and `domain-avatar`

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/domain-avatar/src/calibration.ts`
- `packages/domain-avatar/src/calibration.test.ts`
- `scripts/validate-avatar-3d.mjs`
- `scripts/validate-fit-calibration.mjs`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- avatar measurements-sidecar handling is now typed at the contract boundary instead of relying on loose record shapes
- future schema evolution can happen from a single parse source before flowing into calibration semantics or validator reporting

### `Phase A / Batch 9`

Status: `completed`

Completed work:

1. added a versioned fit-calibration report schema to `packages/contracts`, covering avatar calibration references, archetype comparison rows, and garment fit rows
2. updated `validate:fit-calibration` so the generated report now includes `schemaVersion` and is parsed through the shared contract before `latest.json` is written
3. tightened the calibration write path by removing nullable fallbacks for already-validated avatar sidecar fields inside the generated report
4. added a contract test that parses the committed fit-calibration report fixture shape directly
5. synced active docs so calibration evidence ownership now includes the versioned report contract alongside the measurements sidecar contract

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/contracts/src/__fixtures__/fit-calibration-report.json`
- `scripts/validate-fit-calibration.mjs`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/avatar-pipeline.md`
- `docs/physical-fit-system.md`
- `docs/contract-ownership.md`

Outcome:

- fit-calibration evidence is now a first-class contract artifact instead of an ad-hoc JSON blob
- future calibration-report evolution now has an explicit schema/version seam and a committed fixture gate

### `Phase A / Batch 10`

Status: `completed`

Completed work:

1. moved `avatarMeasurementsSidecarSchemaVersion` ownership into `packages/contracts` so validators and tests no longer depend on a runtime-only duplicate literal
2. updated `validate:avatar3d` and `validate:fit-calibration` to import the measurements-sidecar schema version from the shared contract boundary
3. added regression tests that parse the committed `mpfb-female-base.measurements.json` and `mpfb-male-base.measurements.json` authoring files directly instead of relying only on inline sample objects
4. added summary-parity tests for those committed measurements sidecars so the checked-in authoring files must stay aligned with the checked-in summary files
5. synced active docs and marked `Phase A` complete now that schema-version ownership, committed artifact coverage, and calibration-report fixture coverage are all closed

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/domain-avatar/src/calibration.test.ts`
- `packages/runtime-3d/src/avatar-manifest.ts`
- `scripts/validate-avatar-3d.mjs`
- `scripts/validate-fit-calibration.mjs`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/avatar-pipeline.md`
- `docs/freestyle-improvement-status.md`

Outcome:

- avatar authoring pipeline hardening is now closed as a tracked phase instead of depending on duplicate schema literals or synthetic-only regression coverage
- the next long-term authoring work can move to `Phase B` without carrying unresolved `Phase A` contract drift

### `Phase B / Batch 1`

Status: `completed`

Completed work:

1. added versioned shared authoring-summary schemas for `garment`, `hair`, and `accessory` artifacts in `packages/contracts`
2. normalized committed MPFB raw summary files away from checkout-specific absolute paths and toward repo-relative or structured source references
3. updated the MPFB garment, hair, and accessory Blender export scripts so regenerated summaries emit the same versioned contract
4. tightened `validate:garment3d` so hero garment summaries are parsed through the shared contract before the fit-budget checks run
5. clarified in active docs that this new authoring-summary contract is upstream-only and does not widen `PublishedGarmentAsset`, runtime metadata, or `/v1` payloads

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `scripts/validate-garment-3d.mjs`
- `authoring/garments/mpfb/scripts/build_runtime_garment.py`
- `authoring/garments/mpfb/scripts/build_runtime_hair.py`
- `authoring/garments/mpfb/scripts/build_runtime_accessory.py`
- `authoring/garments/exports/raw/mpfb-female-top_soft_casual.summary.json`
- `authoring/garments/exports/raw/mpfb-female-hair_signature_ponytail.summary.json`
- `authoring/garments/exports/raw/mpfb-female-accessory_city_bucket_hat.summary.json`
- `docs/garment-fitting-contract.md`
- `docs/physical-fit-system.md`
- `docs/contract-ownership.md`

Outcome:

- FreeStyle now has a typed seam between MPFB source artifacts and runtime garment promotion instead of treating raw authoring JSON as an unversioned implementation detail
- the next `Phase B` batch can move toward pattern/material metadata without reopening public runtime or admin payload contracts first

### `Phase B / Batch 2`

Status: `completed`

Completed work:

1. added a versioned `garment-pattern-spec.v1` contract in `packages/contracts` for authoring-only garment measurement/material metadata
2. committed starter garment `pattern-spec` sidecars under `authoring/garments/mpfb/specs/*.pattern-spec.json` instead of widening runtime `/v1` payloads
3. updated raw starter garment summaries so each garment summary now points at its sidecar through `patternSpec.relativePath`
4. updated the MPFB Blender starter-garment build path so future summary reruns regenerate the same pattern-spec reference through `--pattern-spec-json`
5. tightened `validate:garment3d` so starter garment summaries must resolve, parse, and stay in parity with the starter runtime metadata before garment QA passes

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `authoring/garments/mpfb/specs/*.pattern-spec.json`
- `authoring/garments/exports/raw/mpfb-*.summary.json`
- `authoring/garments/mpfb/scripts/build_runtime_garment.py`
- `scripts/build-mpfb-starter-garments.mjs`
- `scripts/validate-garment-3d.mjs`
- `docs/garment-fitting-contract.md`
- `docs/physical-fit-system.md`

Outcome:

- FreeStyle now has an explicit authoring-only pattern/material metadata layer for starter garments without reopening `PublishedGarmentAsset` or `/v1` contracts
- garment-side measurement truth can evolve upstream with validator-backed parity against the current starter runtime catalog instead of drifting in docs or ad-hoc JSON blobs

### `Phase B / Batch 3`

Status: `completed`

Completed work:

1. extracted starter `pattern-spec` semantic parity checks into a shared `packages/domain-garment` helper instead of leaving them inline inside `validate:garment3d`
2. widened the shared parity rule to cover starter `anchorIds` alongside measurements, measurement modes, size-chart rows, selected size, and physical profile
3. rewired `validate:garment3d` to consume that shared helper so committed authoring summaries and direct domain tests now enforce the same semantic rule set
4. added committed `authoring/garments/mpfb/specs/*.pattern-spec.json` regression coverage in `packages/domain-garment` plus a targeted mismatch test for drift detection
5. synced active docs and marked `Phase B` complete now that schema ownership, committed sidecars, builder regeneration, validator reuse, and semantic parity ownership all live on stable boundaries

Evidence:

- `packages/contracts/src/index.ts`
- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/validation.test.ts`
- `scripts/validate-garment-3d.mjs`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/garment-fitting-contract.md`
- `docs/physical-fit-system.md`
- `docs/contract-ownership.md`

Outcome:

- starter garment pattern/material metadata now has a single semantic parity source in the garment domain instead of duplicated validator-only logic
- `Phase B` is closed, so later work can start from a stable pattern/material metadata seam without reopening the public runtime or admin contracts

### `Phase C / Batch 1`

Status: `completed`

Completed work:

1. added a versioned `garment-instant-fit-report.v1` contract in `packages/contracts` for product-facing fit recommendations derived from the existing physical-fit assessment
2. formalized `overallFit`, normalized fit regions, confidence, summary copy, and explanation copy without widening current `/v1` payloads
3. added shared garment-domain helpers that convert `GarmentFitAssessment` into a contract-valid instant-fit report and expose a direct `assessGarmentInstantFit` path
4. added targeted contract and domain tests that lock both a canonical derived payload and a compression-heavy escalation path into `overallFit = risky`
5. synced active docs so `Phase C` now starts from a contracts-first seam instead of UI-only strings or ad-hoc per-surface formatting

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/validation.test.ts`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/garment-fitting-contract.md`
- `docs/physical-fit-system.md`
- `docs/freestyle-improvement-status.md`

Outcome:

- FreeStyle now has a typed, reusable instant-fit report layer above the lower-level physical-fit assessment
- later `Phase C` batches can wire this result into product surfaces or persistence without first inventing another fit-report contract

### `Phase C / Batch 2`

Status: `completed`

Completed work:

1. added a `Closet`-local fit display helper in `apps/web` so product UI can consume the shared instant-fit report without embedding region/label/tone logic inside the page shell
2. rewired `V18ClosetExperience` catalog tiles and equipped-item fit cards to read `overallFit / confidence / summary / focus regions` from the shared instant-fit report instead of the older assessment-specific summary path
3. kept the API boundary unchanged by deriving the report from the already-computed local `GarmentFitAssessment` map rather than widening `/v1/closet/runtime-garments`
4. added a targeted `apps/web` regression test for the fit display helper so primary-region ordering, tone mapping, and confidence text stay stable
5. synced active fit docs so the first product consumer of `garmentInstantFitReportSchema` is explicitly documented

Evidence:

- `apps/web/src/components/product/closet-fit-report.ts`
- `apps/web/src/components/product/closet-fit-report.test.ts`
- `apps/web/src/components/product/V18ClosetExperience.tsx`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/garment-fitting-contract.md`
- `docs/physical-fit-system.md`

Outcome:

- `Closet` now renders product-facing fit guidance from the shared instant-fit contract instead of relying on a surface-local summary formatter
- later `Phase C` batches can move this same report into API or persistence adapters without needing to redesign the product UI language first

### `Phase C / Batch 3`

Status: `completed`

Completed work:

1. introduced a product-only `closetRuntimeGarmentListResponseSchema` so `/v1/closet/runtime-garments` can carry a published garment plus an optional user-scoped instant-fit seed without widening the admin publication contract
2. rewired the product route to derive `instantFit` from the current persisted `BodyProfile` while preserving fail-soft behavior when no profile exists
3. updated the web runtime-garment parser and wardrobe hook so `Closet` can consume API-provided instant-fit reports as seeded guidance while still persisting only the canonical published garment asset catalog locally
4. rewired `V18ClosetExperience` so catalog items can start from API-provided instant-fit guidance but active tab and equipped-item fit cards continue to prefer locally derived reports from the current deferred body profile
5. added targeted contracts, API, and web regression coverage and synced active fit docs so `Phase C` closes on a contracts -> product API adapter -> product consumer path

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/modules/garments/runtime-garments.service.ts`
- `apps/api/src/routes/runtime-garments.routes.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `apps/web/src/hooks/publishedRuntimeGarment.ts`
- `apps/web/src/hooks/publishedRuntimeGarment.test.ts`
- `apps/web/src/hooks/useWardrobeAssets.ts`
- `apps/web/src/components/product/V18ClosetExperience.tsx`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/garment-fitting-contract.md`
- `docs/physical-fit-system.md`
- `docs/freestyle-improvement-status.md`

Outcome:

- `Phase C` is now closed on the active product path
- shared instant-fit recommendations now exist as a typed domain contract, a product API adapter, and a live `Closet` consumer without changing admin publication payloads

### `Phase D / Batch 1`

Status: `completed`

Completed work:

1. added a reserved `fit_simulate_hq_v1` contract in `packages/contracts` with a versioned orchestration request, normalized queue payload schema, typed artifact kinds, and a canonical `job-result.v1` envelope shape
2. extended `packages/shared` job typing so the queue layer now recognizes the reserved offline simulation job type without wiring a live handler yet
3. added targeted contract and queue regression tests that lock both request/result parsing and queue-envelope normalization for the reserved simulation path
4. replaced the older `cloth_simulate` draft doc with the current `fit_simulate_hq_v1` contract language and synced worker/gate ownership docs around that reserved seam
5. kept the batch intentionally narrow by leaving API create routes, worker handlers, and artifact persistence for later Phase D batches

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/job-contracts.test.ts`
- `docs/CLOTH_SIMULATE_JOB_DRAFT.md`
- `docs/worker-playbook.md`
- `docs/quality-gates.md`
- `docs/contract-ownership.md`
- `docs/physical-fit-system.md`
- `docs/freestyle-improvement-status.md`

Outcome:

- FreeStyle now has a fixed offline simulation contract seam that future worker and storage work can target without inventing another payload format
- `Phase D` has started, but the repo still does not expose or run HQ cloth simulation yet

### `Phase D / Batch 2`

Status: `completed`

Completed work:

1. added an active lab route pair for HQ fit simulation creation and detail reads: `POST /v1/lab/jobs/fit-simulations` and `GET /v1/lab/fit-simulations/:id`
2. added a replaceable fit-simulation persistence port with a versioned file adapter so queued simulation state, warnings, metrics, and artifacts are stored outside the route handler
3. wired `fit_simulate_hq_v1` into the runtime worker router with a baseline handler that processes the queued job and persists a `fit_map_json` artifact
4. kept the batch intentionally honest by deriving the artifact from current body-profile and published-garment snapshots instead of claiming full FEM/PBD drape output
5. synced API, worker, quality-gate, and architecture docs to the active baseline implementation

Evidence:

- `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/fit-simulations.routes.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `workers/fit_simulation/src/worker.ts`
- `workers/fit_simulation/src/worker.test.ts`
- `workers/runtime/src/worker.ts`
- `packages/contracts/src/index.ts`
- `packages/shared/src/index.ts`
- `docs/CLOTH_SIMULATE_JOB_DRAFT.md`
- `docs/api-contract.md`

### `Phase 5 / Batch 3`

Status: `completed`

Completed work:

1. split the fit-simulation read contract from the stored fit-simulation record so lab reads can grow without widening persistence
2. added a minimal derived `avatarPublication` snapshot to `GET /v1/lab/fit-simulations/:id`, sourced from the committed runtime avatar publication catalog
3. kept the new field intentionally narrow: no evidence paths, no authoring provenance, and no worker payload changes
4. documented the field as a read-time convenience snapshot rather than persisted historical lineage

Evidence:

- `packages/contracts/src/index.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/fit-simulations.routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `docs/worker-playbook.md`
- `docs/physical-fit-system.md`
- `docs/quality-gates.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/architecture-overview.md`
- `docs/freestyle-improvement-status.md`

Outcome:

- FreeStyle now has an active offline fit-simulation baseline path with API creation, queued worker handling, and persisted `fit_map_json` artifacts
- the remaining Phase D gap is fidelity, not plumbing: `draped_glb` and `preview_png` remain future outputs, while the current worker emits typed fit-map evidence from snapshot-based assessment

### `Phase D / Batch 3`

Status: `completed`

Completed work:

1. upgraded the active fit-simulation worker to emit a real `preview_png` artifact alongside the existing JSON artifact
2. moved the `fit_map_json` payload onto a shared contract with typed overlay maps instead of an ad-hoc worker-local blob
3. kept the implementation honest by deriving the preview from fit evidence rather than claiming rendered cloth output
4. extended targeted worker and contract tests to cover the overlay schema and PNG preview generation
5. synced API, worker, and fit-system docs to the new baseline artifact set

Evidence:

- `workers/fit_simulation/src/worker.ts`
- `workers/fit_simulation/src/worker.test.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `docs/CLOTH_SIMULATE_JOB_DRAFT.md`
- `docs/api-contract.md`
- `docs/worker-playbook.md`
- `docs/physical-fit-system.md`
- `docs/quality-gates.md`
- `README.md`

Outcome:

- the Phase D baseline now emits both `fit_map_json` and `preview_png`
- the main remaining Phase D fidelity gap is solver-backed `draped_glb`, not artifact plumbing

### `Phase E / Batch 1`

Status: `completed`

Completed work:

1. formalized the `fit_map_json` artifact as a shared `packages/contracts` schema instead of leaving it as worker-local JSON
2. defined four typed overlay maps for downstream fit-map work: `easeMap`, `stretchMap`, `collisionRiskMap`, and `confidenceMap`
3. wired the active Phase D worker to emit those overlays from the current `GarmentFitAssessment` and `garmentInstantFitReport`
4. added regression coverage so overlay drift fails in contract tests before later pressure/stress-map work widens the format
5. documented `Phase E` as starting from the shared overlay contract instead of inventing parallel pressure-map artifacts

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `workers/fit_simulation/src/worker.ts`
- `workers/fit_simulation/src/worker.test.ts`
- `docs/CLOTH_SIMULATE_JOB_DRAFT.md`
- `docs/physical-fit-system.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/freestyle-improvement-status.md`

Outcome:

- `Phase E` is now active on a shared typed overlay contract
- future stress/pressure-map work can build on the existing `fit_map_json` schema instead of replacing it

### `Phase E / Batch 2`

Status: `completed`

Completed work:

1. extended `fitSimulationRecordSchema` so lab-fit records can carry a persisted typed `fitMap` snapshot next to `instantFit` and artifact metadata
2. taught the fit-simulation worker to store that typed snapshot on success instead of keeping overlay evidence only in the JSON artifact file
3. wired `GET /v1/lab/fit-simulations/:id` to emit the same `fitMap` snapshot through the public lab response schema
4. added repository and route regressions so the typed overlay payload survives persistence round-trips and read-path parsing
5. synced API and fit-system docs so consumers know the lab read-path is now the primary Phase E evidence surface

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/fit-simulations.routes.test.ts`
- `workers/fit_simulation/src/worker.ts`
- `docs/api-contract.md`
- `docs/physical-fit-system.md`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- the typed Phase E overlay payload is now available directly from the lab fit-simulation record, not only from an artifact URL
- future fit/stress/pressure consumers can build on the API read-path without adding another parallel persistence format

### `Phase E / Batch 3`

Status: `completed`

Completed work:

1. added a shared `fitMapSummary` contract so typed overlay payloads also expose one consumer-friendly dominant-overlay summary
2. implemented `buildFitMapSummary` in `packages/domain-garment` so preview rendering and future consumers reuse one ranking rule
3. taught the fit-simulation worker to persist `fitMapSummary` next to `fitMap` and to use that summary for preview labeling and artifact metadata
4. extended repository, route, worker, and garment-domain regressions so summary drift fails closed with the rest of the fit-map contract
5. updated tracker and fit-system docs so `Phase E` is now a completed baseline, not an in-progress seam

Evidence:

- `packages/contracts/src/index.ts`
- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/validation.test.ts`
- `workers/fit_simulation/src/worker.ts`
- `workers/fit_simulation/src/worker.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/fit-simulations.routes.test.ts`
- `docs/api-contract.md`
- `docs/physical-fit-system.md`

Outcome:

- `Phase E` consumers now have both the raw typed overlays and a stable summary seam to build on
- the tracked execution program in this document is complete at its current baseline scope

## Current Batch

### `Phase 1 / Batch 1`

Status: `completed`

Completed work:

1. removed stale product-side fallback reads to non-product asset endpoints
2. made lab surface resolution explicit so `/app/lab` no longer inherits product navigation state
3. removed the historical widget canary bootstrap from the public web root layout
4. tightened boundary docs so historical widget/canary code is not treated as product shell behavior

Evidence:

- `apps/web/src/hooks/useWardrobeAssets.ts`
- `apps/web/src/lib/product-routes.ts`
- `apps/web/src/lib/product-routes.test.ts`
- `apps/web/src/components/layout/AppTopBar.tsx`
- `apps/web/src/components/layout/ProductAppShell.tsx`
- `apps/web/src/app/layout.tsx`
- `docs/product-boundaries.md`

Outcome:

- the main product shell no longer boots the historical widget canary path
- product navigation no longer treats the lab page as a primary product surface
- the first boundary hardening batch closed with code-backed fixes instead of docs-only assumptions

### `Phase 1 / Batch 2`

Status: `completed`

Completed work:

1. made `apps/web/route-map.mjs` the canonical route inventory consumed by `product-routes`
2. expanded route parity tests so every compatibility redirect resolves to the same surface as its declared destination
3. widened API boundary smoke coverage across product, admin, legacy, lab, and unscoped health routes
4. corrected the active maintenance docs to point at the implemented lab smoke path

Evidence:

- `apps/web/src/lib/product-routes.ts`
- `apps/web/src/lib/product-routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `docs/product-boundaries.md`
- `docs/quality-gates.md`
- `docs/MAINTENANCE_PLAYBOOK.md`

Outcome:

- route parity drift is now guarded by tests instead of spot checks
- admin namespace smoke is explicitly covered as part of the product surface
- health routes are guarded against accidentally inheriting a product/legacy/lab namespace header
- the active smoke docs now match the implemented lab route shape

### `Phase 1 / Batch 3`

Status: `completed`

Completed work:

1. marked pre-mannequin renewal and widget rollout docs as historical where they could be mistaken for active route guidance
2. added current-source-of-truth links from those historical docs back to the active tracker and boundary docs
3. clarified in active docs that older role and route labels should not override the current product boundary model
4. added an explicit scope note to the mixed `api-contract` reference so legacy sections are not mistaken for active product routes

Evidence:

- `README.md`
- `docs/SUBAGENT_TEAM.md`
- `docs/migration-notes.md`
- `docs/replatform-v2/execution-status.md`
- `docs/replatform-v2/ownership-map.md`
- `docs/replatform-v2/contracts-freeze.md`
- `docs/RENEWAL_APP_ARCHITECTURE.md`
- `docs/RENEWAL_INFORMATION_ARCHITECTURE.md`
- `docs/PROJECT_HEALTH_2026-02-11.md`
- `docs/api-contract.md`

Outcome:

- historical rollout and renewal docs are less likely to be mistaken for current route ownership or IA guidance
- active maintainers now have a clearer path back to the current boundary source of truth
- Phase 1 ambiguity from doc drift is reduced enough to move into contract and domain hardening work

### `Phase 2 / Batch 1`

Status: `completed`

Completed work:

1. converged the active `BodyProfile` web/API contract on `@freestyle/contracts` instead of leaving type truth and Zod truth split
2. taught the current `/v1/profile/body-profile` contract to accept the real web payload shape, including `version`, `gender`, and `bodyFrame`
3. normalized compatibility handling so legacy flat body-profile payloads and older stored records still land in the canonical envelope
4. tightened the product boundary test so the live profile route is verified against the shared contract schemas

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/routes/profile.routes.ts`
- `apps/api/src/modules/profile/body-profile.repository.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `packages/domain-avatar/src/index.ts`
- `packages/domain-avatar/src/mapping.test.ts`
- `apps/web/src/hooks/useBodyProfile.ts`
- `docs/api-contract.md`
- `docs/contract-ownership.md`

Outcome:

- the live product body-profile route now accepts the same canonical shape the web client actually sends
- `BodyProfile` contract ownership is more concrete because request, response, repository, and consumer code now share the same schema surface
- Phase 2 can move next to garment or canvas contract hardening without carrying a broken body-profile path

### `Phase 2 / Batch 2`

Status: `completed`

Completed work:

1. added canonical `CanvasComposition` and `ClosetSceneState` schemas in `packages/contracts`
2. normalized legacy flat body-profile snapshots during canvas deserialization to keep older saved looks readable
3. tightened `packages/domain-canvas` repository load and save paths so invalid compositions are dropped or rejected before the hook rehydrates them
4. expanded contract and canvas serialization coverage from a single happy path to malformed snapshot and repository filtering cases

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/domain-canvas/src/index.ts`
- `packages/domain-canvas/src/serialization.test.ts`
- `docs/architecture-overview.md`

Outcome:

- local canvas state no longer trusts raw JSON from storage, and the persisted shape now has an explicit schema source of truth
- canvas saved-look hydration now shares the same legacy body-profile compatibility behavior as the active profile boundary
- the remaining canvas gap is now the remote `/v1/canvas/looks` adapter contract, not unchecked local hydration

### `Phase 2 / Batch 3`

Status: `completed`

Completed work:

1. added canonical request and response envelope coverage for the implemented `/v1/canvas/looks` product routes
2. tightened `CanvasLookInput.data` so the route now accepts only canonical `CanvasComposition` payloads, with title drift rejected at the contract boundary
3. normalized the canvas API read-model through contract parsing before route responses are emitted, degrading malformed stored blobs to `data: null`
4. documented the active `/v1/canvas/looks` contract in the product API reference and added a narrow invalid-payload route test

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/routes/canvas.routes.ts`
- `apps/api/src/modules/canvas/canvas.service.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `docs/api-contract.md`

Outcome:

- `/v1/canvas/looks` no longer relies on ad hoc success payload shapes
- the remote canvas look path now shares one canonical write contract source with the local canvas composition model
- the next canvas issue is consumer behavior, not an undocumented or unvalidated API envelope

### `Phase 2 / Batch 4`

Status: `completed`

Completed work:

1. aligned the product-side published garment hydration path with the canonical `PublishedGarmentAsset` contract instead of the old snake_case asset adapter
2. added a focused runtime-garment parser that filters malformed or semantically invalid published garments without dropping valid entries
3. added a web-side regression test so `/v1/closet/runtime-garments` contract drift is now caught from the product consumer side
4. documented that the published runtime garment route is a camelCase canonical contract, not a legacy asset payload

Evidence:

- `apps/web/src/hooks/publishedRuntimeGarment.ts`
- `apps/web/src/hooks/publishedRuntimeGarment.test.ts`
- `apps/web/src/hooks/useWardrobeAssets.ts`
- `docs/api-contract.md`
- `docs/admin-asset-publishing.md`

Outcome:

- a successfully published garment can now hydrate into `Closet` through the implemented product read path instead of silently falling back to local cache
- product-side regression coverage now exists for the admin publish -> runtime catalog seam
- the next garment issue is admin draft default drift, not published garment hydration

### `Phase 2 / Batch 5`

Status: `completed`

Completed work:

1. replaced the invalid admin draft skeleton fallback with the canonical runtime default from the garment domain
2. normalized legacy invalid draft skeleton ids back onto the current registry during category-based draft normalization
3. regenerated category-owned runtime defaults for unsaved guided drafts so category changes do not keep stale model paths, anchors, collision zones, or body-mask zones
4. added admin-side regression coverage proving a brand-new guided draft is semantically publishable without raw JSON edits and that `tops -> shoes` draft normalization stays coherent
5. documented the guided draft baseline in the admin publishing notes

Evidence:

- `apps/admin/src/lib/publishedGarmentDraft.ts`
- `apps/admin/src/lib/publishedGarmentDraft.test.ts`
- `docs/admin-asset-publishing.md`

Outcome:

- the guided admin create flow no longer starts from a validator-rejected skeleton profile
- legacy draft state that still carries the old invalid skeleton id is automatically repaired during guided normalization
- unsaved guided drafts no longer keep tops-derived runtime defaults after a category change
- the next garment contract gap is API envelope hardening, not the default admin draft baseline

### `Phase 2 / Batch 6`

Status: `completed`

Completed work:

1. added canonical runtime-garment success envelope schemas in `@freestyle/contracts` for list and item responses
2. wrapped the implemented `/v1/closet/runtime-garments` and `/v1/admin/garments*` success paths in those contract parses instead of returning ad hoc objects
3. expanded garment route coverage to parse real create, list, detail, and update responses through the shared schemas
4. tightened product namespace smoke to parse representative garment list responses, not just status codes
5. corrected garment API docs so the live response shape and current valid skeleton profile match the implementation

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/routes/runtime-garments.routes.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `docs/api-contract.md`

Outcome:

- runtime-garment routes now share the same envelope-hardening pattern already used by the profile and canvas boundaries
- create, detail, update, and list success responses are guarded by canonical contract tests instead of field spot checks
- active API docs no longer advertise the invalid historical skeleton id or the stale id-only admin response example
- the next garment seam is persisted-read validation, not the success envelope shape

### `Phase 2 / Batch 7`

Status: `completed`

Completed work:

1. replaced the runtime garment repository's all-or-nothing persisted read with item-level structural filtering so one malformed row no longer zeroes the whole catalog
2. added semantic garment validation on persisted read paths, not just write paths, so API reads now agree with the product consumer's published-garment parser
3. made single-item runtime garment reads degrade invalid persisted rows to `404` instead of re-emitting semantically broken data
4. added regression coverage for mixed persisted stores containing valid, malformed, and semantically invalid rows
5. documented the read-side filtering rules in the active API contract reference

Evidence:

- `apps/api/src/modules/garments/runtime-garments.repository.ts`
- `apps/api/src/modules/garments/runtime-garments.service.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `docs/api-contract.md`

Outcome:

- malformed persisted runtime garment rows no longer blank out the entire API catalog
- the admin/API read path and the product-side published-garment consumer now agree on which persisted garments are valid enough to surface
- invalid persisted rows are degraded predictably: filtered from list responses and treated as missing on detail reads
- the next Phase 2 gap is fit-domain contract hardening, not the runtime garment publication seam

### `Phase 2 / Batch 8`

Status: `completed`

Completed work:

1. added the first explicit runtime schemas for `GarmentFitState`, `GarmentFitRisk`, `GarmentFitDimensionAssessment`, and `GarmentFitAssessment` in `@freestyle/contracts`
2. tightened the shared contract tests so malformed fit payloads are rejected when `limitingKeys` drift away from the assessed dimensions
3. wrapped `assessGarmentPhysicalFit` in the shared fit assessment parser so the canonical domain path now emits contract-valid payloads instead of raw objects
4. added domain regression coverage for both standard garment rows and head-measured accessories against the new fit assessment contract
5. updated the active fit-system docs to point at the contract-backed physical-fit payload instead of treating it as a type-only convention

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/domain-garment/src/index.ts`
- `packages/domain-garment/src/validation.test.ts`
- `docs/garment-fitting-contract.md`
- `docs/physical-fit-system.md`

Outcome:

- the active physical-fit payload is now a parsed contract instead of a type-only shape
- `Closet` and admin consumers that already rely on `assessGarmentPhysicalFit` now inherit the same runtime validation guarantees
- the remaining fit-domain drift is isolated to the legacy shared-3d `fitSummary` helper path rather than the product's canonical fit assessment route

### `Phase 2 / Batch 9`

Status: `completed`

Completed work:

1. removed the legacy `shared-3d/fittingCore` helper that still carried its own `tight / trim / regular / relaxed / oversized` fit vocabulary
2. removed the mannequin and studio shim exports that only re-exported that helper path
3. removed the helper-only mannequin and studio tests from `test:core` so the active core suite now tracks only canonical product and domain paths
4. closed the last known Phase 2 drift without adding another adapter layer on top of the canonical fit assessment route

Evidence:

- `package.json`
- `apps/web/src/features/shared-3d/fittingCore.ts`
- `apps/web/src/features/mannequin/fitting.ts`
- `apps/web/src/features/mannequin/fitting.test.ts`
- `apps/web/src/features/studio/fitting.ts`
- `apps/web/src/features/studio/fitting.test.ts`

Outcome:

- non-product helper paths no longer preserve a second incompatible fit vocabulary beside the canonical `assessGarmentPhysicalFit` path
- `Phase 2` can now be treated as complete on the active mannequin-first hardening track
- the next meaningful gap is no longer contracts drift; it is `Closet` and `runtime-3d` decomposition and regression hardening

### `Phase 3 / Batch 1`

Status: `completed`

Completed work:

1. extracted a shared runtime glTF loader so live stage loads and preloads now share one `DRACOLoader` + `MeshoptDecoder` configuration
2. moved runtime preload model-path collection into a pure helper instead of duplicating avatar and garment path selection inline
3. added focused runtime regression tests that lock shared decoder parity plus deduped avatar/garment preload behavior and default-model fallback semantics
4. updated the active runtime rules so future changes know the loader configuration is a single-source concern inside `packages/runtime-3d`

Evidence:

- `packages/runtime-3d/src/runtime-gltf-loader.ts`
- `packages/runtime-3d/src/runtime-gltf-loader.test.ts`
- `packages/runtime-3d/src/runtime-model-paths.ts`
- `packages/runtime-3d/src/runtime-model-paths.test.ts`
- `packages/runtime-3d/src/preload-runtime-assets.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/architecture-overview.md`

Outcome:

- runtime preloads no longer drift behind the live stage loader configuration
- meshopt-capable runtime GLBs now take the same decode path whether they are preloaded or opened on demand
- the next Phase 3 batch can focus on scene decomposition or disposal policy instead of another duplicated loader seam

### Next Batch

`Phase 3 / Batch 2` should keep `Closet` and `runtime-3d` stabilization moving by extracting stage composition or disposal ownership from `packages/runtime-3d/src/closet-stage.tsx` without widening the batch back into page-shell work.

### `Phase 3 / Batch 2`

Status: `completed`

Completed work:

1. extracted runtime clone-material ownership into a shared disposal helper instead of leaving clone/cleanup responsibility implicit inside `closet-stage.tsx`
2. added scene-bound cleanup for cloned avatar and garment material instances so stage-owned resources are released when the cloned scene changes or unmounts
3. added focused runtime disposal tests that lock “dispose only clone-owned materials” behavior for single and multi-material meshes
4. updated active runtime docs so future batches keep cleanup explicit without accidentally disposing shared `useGLTF` cache resources

Evidence:

- `packages/runtime-3d/src/runtime-disposal.ts`
- `packages/runtime-3d/src/runtime-disposal.test.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/architecture-overview.md`
- `docs/MAINTENANCE_PLAYBOOK.md`

Outcome:

- cloned runtime materials now have an explicit owner and cleanup path
- `closet-stage.tsx` no longer hides clone-material lifecycle policy inside a local helper
- the next Phase 3 batch can focus on stage composition or failure fallback ownership instead of material lifecycle ambiguity

### `Phase 3 / Batch 3`

Status: `completed`

Completed work:

1. moved host-level runtime loading, chunk-failure retry, and WebGL-unavailable fallback ownership into `AvatarStageViewport` instead of leaving the page with a silent dynamic-import hole
2. added a dedicated product-side fallback component so loading, error, and unsupported states share one visible shell outside the runtime canvas
3. added an in-canvas loading placeholder for `closet-stage` suspend paths so avatar and garment asset loads no longer collapse to backdrop-only emptiness
4. added focused regression coverage for both the host fallback component and the stage loading placeholder
5. updated active runtime docs so future batches keep fallback ownership split by seam instead of widening it into a global stage error boundary

Evidence:

- `apps/web/src/components/product/AvatarStageViewport.tsx`
- `apps/web/src/components/product/AvatarStageViewportFallback.tsx`
- `apps/web/src/components/product/AvatarStageViewportFallback.test.tsx`
- `packages/runtime-3d/src/closet-stage.tsx`
- `packages/runtime-3d/src/closet-stage-fallback.tsx`
- `packages/runtime-3d/src/closet-stage-fallback.test.tsx`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/MAINTENANCE_PLAYBOOK.md`
- `docs/architecture-overview.md`
- `docs/quality-gates.md`

Outcome:

- `AvatarStageViewport` now owns the first visible runtime boundary for chunk load and WebGL support instead of assuming the runtime package can always mount
- asset suspend paths inside `closet-stage` now show a visible placeholder instead of a blank canvas with only backdrop state
- `Phase 3` progress is now blocked more by composition extraction and broader lifecycle regression coverage than by missing visible fallback ownership

### `Phase 3 / Batch 4`

Status: `completed`

Completed work:

1. extracted the `AvatarStageViewport` support/load/retry policy into a pure lifecycle helper instead of leaving the host state machine implicit inside the component
2. added focused lifecycle regression coverage for unsupported WebGL, quality-tier clamping, retry state transitions, and stale load-result rejection
3. kept the rendered fallback UI and runtime package ownership unchanged while making the host-side lifecycle deterministic and testable
4. extended the active core suite so host stage lifecycle regressions are caught alongside fallback markup and runtime helper tests

Evidence:

- `apps/web/src/components/product/AvatarStageViewport.tsx`
- `apps/web/src/components/product/avatar-stage-viewport-lifecycle.ts`
- `apps/web/src/components/product/avatar-stage-viewport-lifecycle.test.ts`
- `package.json`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- `AvatarStageViewport` no longer hides its load-state transition rules inside local effect code
- unsupported, retry, and stale-attempt host lifecycle regressions now have node-level coverage without mounting `Canvas`
- the next Phase 3 gap is stage composition extraction or deeper runtime-side lifecycle coverage, not the unguarded host state machine

### `Phase 3 / Batch 5`

Status: `completed`

Completed work:

1. extracted top-level `Closet` scene policy into a pure runtime helper instead of leaving `dpr`, lighting, damping, and motion gating inline inside `closet-stage.tsx`
2. reused that helper from the live stage so top-level scene composition now consumes one policy source instead of repeating quality-tier and avatar-only branching
3. added node-level regression coverage for avatar-only vs dressed stage policy, long-hair/loose-garment motion gating, and low-tier damping/shadow fallback
4. extended the active core suite so runtime stage policy regressions are caught beside loader, fallback, and disposal helpers

Evidence:

- `packages/runtime-3d/src/reference-closet-stage-policy.ts`
- `packages/runtime-3d/src/reference-closet-stage-policy.test.ts`
- `packages/runtime-3d/src/closet-stage.tsx`
- `package.json`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/architecture-overview.md`

Outcome:

- `closet-stage.tsx` no longer hides its top-level scene policy inside inline quality/avatar branching
- runtime stage policy now has node-level coverage without mounting the full `Canvas`
- `Phase 3` is now limited less by runtime shell drift and more by unfinished persistence, worker, and release phases outside the current batch

### `Phase 4 / Batch 1`

Status: `completed`

Completed work:

1. introduced an explicit API-side `BodyProfile` persistence port instead of leaving the profile route coupled directly to one JSON-file implementation
2. moved the current file-backed `BodyProfile` store onto a versioned envelope so later remote adapter replacement has a stable migration seam
3. added focused repository tests for memory/file adapters, legacy object-map compatibility, and versioned envelope writes
4. added a route-level regression that proves unreadable profile backing stores fail as `500` without breaking the product namespace contract

Evidence:

- `apps/api/src/modules/profile/body-profile.repository.ts`
- `apps/api/src/modules/profile/body-profile.repository.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `package.json`
- `docs/api-contract.md`
- `docs/architecture-overview.md`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- `/v1/profile/body-profile` keeps the same product contract while the server-side persistence seam is now replaceable
- body-profile local file persistence is versioned instead of being an unstructured user-id map only
- the next Phase 4 gap is published runtime-garment persistence/auth hardening, not the unscoped profile backing store

### `Phase 4 / Batch 2`

Status: `completed`

Completed work:

1. split `/v1/admin/garments*` away from anonymous-capable product auth by introducing explicit admin auth for the publication boundary
2. moved published runtime-garment file persistence behind a replaceable API-side port with file and memory adapters
3. added focused repository coverage for runtime-garment persistence adapters and route coverage for anonymous rejection, unreadable backing stores, and admin-boundary failures
4. kept `/v1/closet/runtime-garments` on the existing product read contract while hardening only the admin publication seam

Evidence:

- `apps/api/src/modules/auth/auth.ts`
- `apps/api/src/modules/garments/runtime-garments.repository.ts`
- `apps/api/src/modules/garments/runtime-garments.repository.test.ts`
- `apps/api/src/routes/runtime-garments.routes.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `package.json`
- `docs/api-contract.md`
- `docs/admin-asset-publishing.md`
- `docs/architecture-overview.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/MAINTENANCE_PLAYBOOK.md`

Outcome:

- admin garment publication is no longer reachable through anonymous-header fallback
- published runtime-garment persistence now has the same replaceable-port seam as body profile without changing the public closet response contract
- the next Phase 4 gap is remote backing-store / RLS expansion, not an undocumented local file seam or open admin publish boundary

### `Phase 4 / Batch 3`

Status: `completed`

Completed work:

1. added a dedicated `published_runtime_garments` Supabase table plus authenticated-read RLS policy and trigger/index coverage for runtime publication rows
2. wired the API-side published runtime-garment persistence port to a real Supabase-backed adapter while preserving the file fallback for isolated dev/test workflows
3. propagated admin actor context through garment create/update writes and added focused repository coverage for the new remote adapter seam
4. documented the new driver selection and native-module execution workaround so local validation remains reproducible under Codex desktop

Evidence:

- `supabase/migrations/007_published_runtime_garments.sql`
- `supabase/schema.sql`
- `packages/db/src/index.ts`
- `apps/api/src/modules/garments/runtime-garments.repository.ts`
- `apps/api/src/modules/garments/runtime-garments.repository.test.ts`
- `apps/api/src/modules/garments/runtime-garments.service.ts`
- `apps/api/src/routes/runtime-garments.routes.ts`
- `apps/api/src/routes/runtime-garments.routes.test.ts`
- `apps/api/src/routes/product-boundary.routes.test.ts`
- `README.md`
- `docs/api-contract.md`
- `docs/admin-asset-publishing.md`
- `docs/architecture-overview.md`
- `docs/DEVELOPMENT_GUIDE.md`

Outcome:

- admin garment publication now has a real remote backing-store seam instead of only a local JSON publication file
- the public closet contract did not change while the admin publishing path gained an RLS-ready Supabase store
- `Phase 4` is now closed at the current program scope, and the next highest-signal work moves to worker/job contracts instead of persistence plumbing

### Next Batch

### `Phase 5 / Batch 1`

Status: `completed`

Completed work:

1. added canonical `job-payload.v1` and `job-result.v1` envelope contracts and wired the import-chain workers to normalize legacy rows before handling them
2. moved `createJob` to user-scoped idempotency lookup and added a follow-up migration that changes the uniqueness boundary to `(user_id, job_type, idempotency_key)`
3. wrapped worker success/failure results before persistence so status reads stop exposing arbitrary raw blobs as the primary contract
4. normalized `GET /v1/jobs/:job_id` responses through a dedicated serializer with `trace_id` and canonical result envelopes

Evidence:

- `packages/contracts/src/index.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/job-contracts.test.ts`
- `packages/db/src/index.ts`
- `packages/queue/src/index.ts`
- `packages/queue/src/index.test.ts`
- `apps/api/src/modules/jobs/jobs.service.ts`
- `apps/api/src/modules/jobs/jobs.service.test.ts`
- `workers/importer/src/worker.ts`
- `workers/background_removal/src/worker.ts`
- `workers/asset_processor/src/worker.ts`
- `supabase/migrations/008_jobs_user_scoped_idempotency.sql`
- `docs/api-contract.md`
- `docs/worker-playbook.md`
- `docs/quality-gates.md`

Outcome:

- the import-chain queue path now has a canonical payload/result contract instead of relying on ad hoc casts and raw result blobs
- trace propagation survives import -> background removal -> asset processing fan-out
- duplicate replay of the same idempotency key can no longer collide across different users

### `Phase 5 / Batch 2`

Status: `completed`

Completed work:

1. normalized `evaluator.outfit` and `tryon.generate` workers through the same canonical queued payload path already used by the import chain
2. fixed evaluator and try-on failure propagation so their domain rows now move to `failed` instead of getting stuck behind a failed queue job
3. hardened evaluator/tryon idempotency handling so replayed requests reuse the existing bound resource row instead of leaving a new orphaned row behind
4. added focused worker and service coverage for canonical and legacy payload binding on the lab queue paths

Evidence:

- `workers/evaluator/src/worker.ts`
- `workers/evaluator/src/worker.test.ts`
- `workers/tryon/src/worker.ts`
- `workers/tryon/src/worker.test.ts`
- `apps/api/src/modules/evaluations/evaluations.service.ts`
- `apps/api/src/modules/evaluations/evaluations.service.test.ts`
- `apps/api/src/modules/tryons/tryons.service.ts`
- `apps/api/src/modules/tryons/tryons.service.test.ts`
- `packages/db/src/index.ts`
- `package.json`
- `docs/api-contract.md`
- `docs/worker-playbook.md`

Outcome:

- Phase 5 queue/job contract rollout is now consistent across import, evaluator, and try-on workers
- lab callers no longer depend on bare payload casting behavior that broke once `createJob()` started writing canonical envelopes
- evaluator and try-on rows now track failure state more accurately under worker errors and idempotent replays

### Next Batch

`Phase 6 / Batch 1` should add release-facing smoke evidence for lab job creation/status reads, product/admin route/API smoke, and current screenshot/update evidence without reopening queue contract internals.

### `Phase 6 / Batch 1`

Status: `completed`

Completed work:

1. widened the active smoke docs so release-facing API checks now explicitly name legacy job status reads and the lab evaluation / try-on create-and-read routes
2. added an env-gated route smoke test for lab evaluation and try-on creation plus `/v1/legacy/jobs/:job_id` status reads, without reopening queue or worker internals
3. captured a fresh screenshot set for `Home`, `Closet`, `Canvas`, `Community`, and `Profile` and recorded the current local release evidence under `docs/qa/`

Evidence:

- `apps/api/src/routes/product-boundary.routes.test.ts`
- `docs/quality-gates.md`
- `docs/MAINTENANCE_PLAYBOOK.md`
- `docs/qa/phase6-batch1-release-evidence-2026-04-19.md`
- `docs/qa/assets/phase6-batch1/home.png`
- `docs/qa/assets/phase6-batch1/closet.png`
- `docs/qa/assets/phase6-batch1/canvas.png`
- `docs/qa/assets/phase6-batch1/community.png`
- `docs/qa/assets/phase6-batch1/profile.png`

Outcome:

- the active release checklist now points at the real lab status-read surfaces instead of stopping at a single try-on create route
- current product screenshots are checked in alongside a dated evidence note instead of being left as an implicit manual step
- release smoke still needs one env-enabled pass before RC because the workspace does not currently carry Supabase admin credentials for live lab create/status execution

### `Phase 6 / Batch 2`

Status: `completed`

Completed work:

1. ran the env-backed lab create/status smoke path using Railway `api` service variables instead of dummy/local Supabase values
2. fixed two remote-compatibility seams discovered by that live pass: optional `assets` insert columns on lagging remote stores and offset timestamp normalization for legacy job status reads
3. tightened the active release docs around RLS, browser-vs-backend Supabase key separation, trace artifact retention, and RC deployment freeze references
4. recorded a dated release-evidence note for the completed RC pass

Evidence:

- `packages/db/src/assets-schema-compat.ts`
- `packages/db/src/assets-schema-compat.test.ts`
- `packages/db/src/index.ts`
- `apps/api/src/modules/jobs/jobs.service.ts`
- `apps/api/src/modules/jobs/jobs.service.test.ts`
- `docs/quality-gates.md`
- `docs/MAINTENANCE_PLAYBOOK.md`
- `docs/api-contract.md`
- `docs/DEPLOYMENT_STACK_DECISION.md`
- `docs/qa/phase6-batch2-release-evidence-2026-04-20.md`

Outcome:

- env-backed lab evaluation and try-on create/status reads are now proven against the linked production backend credentials instead of remaining a skipped path
- RC docs now make the active Vercel browser key / Railway service key boundary explicit
- the remaining repo-improvement program is closed; follow-on work is ordinary maintenance rather than an open hardening phase

### `Phase 8 / Batch 1`

Status: `completed`

Completed work:

1. unified the active HQ fit cache identity around a canonical `fitSimulationCacheKeyParts` contract instead of letting API and queue fallback paths drift
2. widened the normalized `fit_simulate_hq_v1` payload to carry `avatarVariantId`, so the worker can preserve the same cache key the API create path derives
3. added a baseline-safe `fitSimulationArtifactLineage` schema and persisted `artifact-lineage.json` sidecar for the current four-artifact HQ bundle
4. stored that lineage snapshot on the internal fit-simulation record while keeping `GET /v1/lab/fit-simulations/:id` intentionally unchanged
5. added `artifactLineageId` to `metrics_json` so typed HQ metrics can point back to the current lineage manifest without claiming solver-grade cloth output

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/job-contracts.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.test.ts`
- `apps/api/src/routes/fit-simulations.routes.test.ts`
- `workers/fit_simulation/src/worker.ts`
- `workers/fit_simulation/src/worker.test.ts`
- `docs/CLOTH_SIMULATE_JOB_DRAFT.md`
- `docs/physical-fit-system.md`
- `docs/quality-gates.md`
- `docs/freestyle-viewer-platform/phase8/batch1.md`

Outcome:

- the active HQ fit baseline now has a typed artifact-lineage seam in addition to the existing artifact bundle
- the cache-key split between API create and queue fallback is closed for new jobs
- the repo still does **not** claim solver-backed cloth output or public lineage exposure on the lab read route

### `Phase 8 / Batch 2`

Status: `completed`

Completed work:

1. added a dedicated owner-scoped `GET /v1/lab/fit-simulations/:id/artifact-lineage` route instead of widening the existing fit-simulation detail response
2. exposed the persisted `artifactLineage` snapshot through a separate `fitSimulationArtifactLineageGetResponseSchema` contract in `packages/contracts`
3. kept `GET /v1/lab/fit-simulations/:id` intentionally unchanged, so product-adjacent consumers still read the same `fitSimulation` detail shape as before
4. made the new inspection seam fail closed with `404 NOT_FOUND` when the simulation does not exist for the caller and `409 PRECONDITION_FAILED` when the simulation exists but no lineage snapshot is available yet

Evidence:

- `packages/contracts/src/index.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/fit-simulations.routes.ts`
- `apps/api/src/routes/fit-simulations.routes.test.ts`
- `docs/api-contract.md`
- `docs/CLOTH_SIMULATE_JOB_DRAFT.md`
- `docs/physical-fit-system.md`
- `docs/quality-gates.md`
- `docs/freestyle-viewer-platform/phase8/batch2.md`

Outcome:

- artifact lineage is now inspectable through a narrow owner-scoped lab seam without changing the existing detail payload
- the repo still does **not** claim public solver-grade HQ output or a widened lab fit-simulation detail contract

### `Phase 8 / Batch 3`

Status: `completed`

Completed work:

1. taught the current `useFitSimulation()` web hook to fetch `/v1/lab/fit-simulations/:id/artifact-lineage` as separate read-only state once a simulation reaches a terminal status
2. kept `404` and `409 PRECONDITION_FAILED` on that route non-fatal for the web consumer so the panel does not overstate lineage availability while jobs are still converging
3. updated the `Closet` HQ fit panel to expose the lineage `manifestUrl` plus baseline `drapeSource` and `storageBackend` metadata without merging lineage into the main `fitSimulation` detail object
4. kept the product truth narrow: the panel still prefers `preview_png`, ordered artifact links, and typed fit-map summary as its primary output

Evidence:

- `apps/web/src/hooks/useFitSimulation.ts`
- `apps/web/src/components/product/V18ClosetExperience.tsx`
- `apps/web/src/components/product/closet-fit-simulation.tsx`
- `apps/web/src/components/product/closet-fit-simulation-display.ts`
- `apps/web/src/components/product/closet-fit-simulation.test.ts`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/physical-fit-system.md`
- `docs/quality-gates.md`
- `docs/freestyle-viewer-platform/phase8/batch3.md`

Outcome:

- the new artifact-lineage inspection route now has a first web consumer
- web state still keeps artifact lineage separate from the main fit-simulation detail payload
- the repo still does **not** claim stage swap-in, solver-grade cloth output, or a widened fit-simulation detail contract

### `Phase 8 / Batch 4`

Status: `completed`

Completed work:

1. added an admin-only `GET /v1/admin/fit-simulations/:id` inspection route for the persisted HQ fit simulation and lineage snapshot
2. kept the route read-only and detail-by-id only, without adding a registry or mutation workflow
3. reused the current persisted fit-simulation record plus lineage snapshot instead of inventing a second storage shape

Evidence:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/domain-contracts.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.test.ts`
- `docs/freestyle-viewer-platform/phase8/batch4.md`

Outcome:

- HQ artifact lineage is now inspectable through both owner-scoped lab and admin-scoped read-only seams
- the repo still does **not** claim artifact certification workflow, solver-grade cloth truth, or widened public detail contracts

### `Phase 8 Closeout`

Status: `completed`

Completed work:

1. closed the current repo-scoped HQ artifact identity / lineage / inspection baseline
2. recorded the closeout and its non-goals explicitly

Evidence:

- `docs/freestyle-viewer-platform/phase8/closeout.md`

Outcome:

- `Phase 8` is now closed for the current viewer-platform refactor track
- remaining HQ artifact tooling work moves to `Phase 8.5`

### `Phase 8.5 / Batch 1`

Status: `completed`

Completed work:

1. added a typed admin inspection envelope for `fitSimulation + artifactLineage`
2. added a separate read-only HQ artifact inspection panel in `apps/admin`
3. kept that inspection state isolated from garment draft editor state and starter certification state

Evidence:

- `apps/admin/src/components/FitSimulationInspectionPanel.tsx`
- `apps/admin/src/lib/fitSimulationInspection.ts`
- `apps/admin/src/lib/fitSimulationInspection.test.ts`
- `apps/admin/src/components/AdminWorkspace.tsx`
- `docs/freestyle-viewer-platform/phase8_5/batch1.md`

Outcome:

- `Phase 8.5` has started with a real admin tooling seam
- the repo still does **not** claim approve/reject/certify workflow or broader HQ artifact registry coverage

### `Phase 8.5 / Batch 2`

Status: `completed`

Completed work:

1. added a bounded admin HQ fit catalog route at `GET /v1/admin/fit-simulations`
2. added repository/service list seams with filterable, newest-first read-only summaries
3. kept store-missing behavior fail-soft as `200` empty list instead of widening this into a bundle/service outage

Evidence:

- `packages/contracts/src/index.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.repository.test.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.ts`
- `apps/api/src/modules/fit-simulations/fit-simulations.service.test.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.ts`
- `apps/api/src/routes/admin-fit-simulations.routes.test.ts`
- `docs/freestyle-viewer-platform/phase8_5/batch2.md`

Outcome:

- admin tooling no longer depends on out-of-band UUID lookup alone
- the repo still does **not** claim mutation workflow or write-side garment linkage

### `Phase 8.5 / Batch 3`

Status: `completed`

Completed work:

1. taught `apps/admin` to load current-garment HQ fit evidence from the new admin catalog seam
2. added local status / lineage filters and one-click selection into the existing detail inspector
3. kept HQ fit list state, detail state, and garment publication state separate

Evidence:

- `apps/admin/src/components/AdminWorkspace.tsx`
- `apps/admin/src/lib/fitSimulationInspection.ts`
- `apps/admin/src/lib/fitSimulationInspection.test.ts`
- `docs/freestyle-viewer-platform/phase8_5/batch3.md`
- `docs/freestyle-viewer-platform/phase8_5/closeout.md`

Outcome:

- `Phase 8.5` is now closed for the current repo-scoped baseline as read-only admin HQ fit inspection + triage tooling
- the repo still does **not** claim approve/reject/certify mutations, persisted garment-to-fit linkage, or solver-grade cloth truth

## Phase 0 Closeout

`Phase 0` is complete when all of the following are true:

- the active improvement tracker is present and linked from the core docs
- repo inventory and route boundary docs reflect the current codebase
- contract ownership is written down
- AI agent operating rules for this improvement program are written down
- quality gates are written down as an execution-facing summary
- the current program no longer depends on ambiguous `Phase 0 / 0.5 / 1A / 1B` terminology from the historical rollout docs

## Notes

- The historical rollout docs are still useful for widget/canary operational context.
- They are not the current source of truth for the mannequin-first hardening program.
