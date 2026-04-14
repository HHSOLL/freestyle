# Perfect Fitting Execution Plan

## 1. Purpose

This document is the execution contract for finishing FreeStyle as a mannequin-first 3D fitting product.

The target is not a placeholder mannequin, a sprite-based try-on, or a simple scaled body.

The target is:

1. a human-looking rigged 3D avatar
2. generated from user body measurements through a formal mapping layer
3. dressed in real time with curated 3D garment assets
4. stable under pose changes, zoom, rotation, and canvas handoff

This file is intentionally operational. It is meant to be followed directly during implementation.

## 2. Product Definition

The main product experience is:

1. user enters body measurements and body-frame traits
2. body profile maps into normalized avatar parameters
3. runtime avatar morph and rig transforms generate a human avatar
4. curated 3D garments are fitted to that avatar in real time
5. the user saves looks and sends them into Canvas
6. Community and Profile consume the same look and body-profile graph

Main surfaces:

- `/`
- `/app/closet`
- `/app/canvas`
- `/app/community`
- `/app/profile`

`Fitting` is a capability inside `Closet`, not an independent page.

## 3. Non-Negotiable Done Criteria

Work is not complete until all of the following are true.

### Avatar

- the body reads as a human avatar, not a primitive proxy
- height, shoulder, chest, waist, hip, inseam, and arm-length changes affect the correct regions
- no-garment state still looks like a complete person
- at least one female-base and one male-base variant ship

### Garments

- garments are rig-compatible with the promoted base avatar
- garments can be equipped and removed in real time
- layer order is stable: base -> mid -> outer -> shoes
- body masking and clearance reduce obvious poke-through

### Poses

- `neutral`
- `relaxed`
- `contrapposto`
- `stride`
- `tailored`

All standard poses must keep the body and garments readable.

### Product

- `Closet` is the main fitting surface
- `Canvas` reuses the same design language but swaps the center stage for composition work
- `Community` reads as a feed product, not a dashboard
- `Profile` reads as a service profile, not a placeholder page
- `/` is a real landing page using the same wardrobe tone

### Quality

- `npm run lint`
- `npm run typecheck`
- `npm run test:core`
- `npm run build:services`
- `npm run build`

All must pass before the milestone can be called complete.

## 4. Execution Rules For The Agent

The implementation agent must follow these rules:

1. keep the repo aligned to the current product definition at all times
2. prefer structural fixes over temporary patches
3. remove dead code instead of working around it
4. never solve body sizing through a single global scale
5. keep page files orchestration-only where possible
6. keep body-profile logic, garment logic, and scene runtime separated
7. if a blocker requires user action, ask immediately in one short direct message
8. if an open-source asset or tool can be adopted safely and legally, integrate it without waiting
9. track every promoted external asset in `docs/OPEN_ASSET_CREDITS.md`
10. update this document when the execution plan materially changes

## 5. User Escalation Rules

Ask the user immediately only when one of these is true:

1. a required source asset is proprietary or missing
2. a license does not clearly allow redistribution in the repo
3. a visual direction choice is ambiguous enough to change the asset pipeline
4. the desired fidelity requires a paid third-party tool or service
5. a large destructive removal would conflict with current unmerged user work

Do not ask the user for things that can be solved by:

- using official open-source tooling
- adopting permissive compatible assets
- writing validation scripts
- restructuring code
- documenting a temporary blocker honestly

## 6. Open-Source Adoption Policy

Preferred avatar authoring stack:

1. `MPFB2 / MakeHuman`
2. `CharMorph` fallback
3. Blender cleanup and export
4. GLB runtime delivery

Preferred garment workflow:

1. curated Blender-authored garments on the same avatar base
2. shared skeleton profile
3. corrective morph support
4. exported GLB with manifest metadata

Allowed open-source adoption:

- Blender-compatible authoring add-ons
- permissive or clearly redistributable mannequin and garment sources
- official glTF exporter pipeline
- validation and optimization scripts

Not allowed:

- shipping untracked third-party assets
- mixing incompatible rig standards without a manifest bridge
- undocumented copied models from games, marketplaces, or videos

## 7. System Architecture Target

Canonical package boundaries:

```txt
apps/web
apps/api
packages/design-tokens
packages/ui
packages/shared-types
packages/shared-utils
packages/domain-avatar
packages/domain-garment
packages/domain-canvas
packages/runtime-3d
```

Required runtime ownership:

- `domain-avatar`
  - body profile schema
  - normalization
  - measurement mapping
  - repository boundaries
- `domain-garment`
  - garment manifests
  - skeleton profiles
  - validation
  - fitting metadata
- `runtime-3d`
  - canonical live stage implementation
  - avatar loading
  - morph application
  - pose application
  - garment binding
  - body masking
- `apps/web`
  - only surface orchestration and product composition

## 8. Canonical Data Flow

The body flow must be:

`BodyProfile -> AvatarNormalizedParams -> AvatarMorphPlan -> Runtime Scene Apply`

The garment flow must be:

`GarmentManifest -> Compatibility Check -> Runtime Binding -> Corrective Fit Apply`

Publication boundary:

`Admin / Partner Authoring -> Published Runtime Garment -> /v1/closet/runtime-garments -> Closet Runtime`

The canvas flow must be:

`Closet Scene Snapshot -> Canvas Composition -> Saved Look / Shared Look`

## 9. Workstreams

Execution should be split into the following workstreams.

### Workstream A. Canonical Human Avatar

Goal:

- promote a real human-looking base avatar asset with a stable rig and runtime metadata

Deliverables:

- `authoring/avatar/mpfb/*`
- `authoring/avatar/exports/raw/*`
- `authoring/avatar/exports/optimized/*`
- avatar manifest entries
- validation script for skeleton aliases, bind pose, and morph presence

Required properties:

- humanoid skeleton
- `Y-up`
- meter units
- clean materials
- A-pose bind state
- morph targets or equivalent formal body parameterization

### Workstream B. Body Measurement Mapping

Goal:

- replace ad-hoc body deformation with a formal measurement mapping layer

Deliverables:

- explicit `AvatarNormalizedParams`
- explicit `AvatarMorphPlan`
- tests for:
  - height mapping
  - shoulder mapping
  - chest and waist mapping
  - hip and inseam mapping
  - male/female/base variance

Rules:

- do not use a single global scale shortcut
- region-specific change must remain region-specific

### Workstream C. Garment Fitting Contract

Goal:

- make garments participate in the same body parameter space as the avatar

Deliverables:

- garment manifest expansion
- corrective fit metadata
- compatibility matrix
- body mask profiles
- collision proxy metadata
- validation tooling

Every promoted garment must declare:

- `modelPath`
- `skeletonProfileId`
- `anchorBindings`
- `collisionZones`
- `bodyMaskZones`
- `surfaceClearanceCm`
- `renderPriority`
- `metadata.measurements`
- `metadata.fitProfile`
- `compatibleAvatarVariants`
- `correctiveMorphSet`

### Workstream D. Closet Runtime

Goal:

- make `Closet` the production fitting surface

Deliverables:

- one canonical live stage component
- rotate / zoom / pose controls
- body customization controls
- garment equip / remove
- load, error, and fallback UI

Rules:

- the canonical stage must live under `packages/runtime-3d`
- `apps/web` may wrap it, but should not own rig math permanently
- no duplicated scene implementations

### Workstream E. Canvas, Community, Profile, Home

Goal:

- make the rest of the app consume the same fitting core

Deliverables:

- `Canvas` uses saved look and item snapshots, not its own body system
- `Community` uses shared look cards and rendered previews
- `Profile` owns body profile, saved looks, and closet state summaries
- `Home` explains and demonstrates the exact product

### Workstream F. Persistence And API

Goal:

- persist body profile, closet scene, saved looks, and canvas compositions cleanly

Deliverables:

- repository interfaces
- local adapters
- API-backed adapters
- storage schema docs
- versioned payloads

### Workstream G. QA, Validation, Release

Goal:

- make the product shippable without hand-wavy claims

Deliverables:

- automated validation for avatar assets
- automated validation for garments
- route smoke
- UI rendering smoke
- screenshot regression set
- release checklist updates

## 10. Milestone Plan

### Milestone 0. Planning Lock

Definition:

- this document exists
- all related docs point to the same target product
- workstreams are accepted as the canonical execution order

### Milestone 1. Avatar Promotion

Exit criteria:

- promoted base avatar asset checked into the pipeline
- avatar manifest updated
- basic runtime loading works in `Closet`
- no-garment state shows a believable person

### Milestone 2. Measurement Fidelity

Exit criteria:

- body profile changes visibly and correctly affect the avatar
- unit tests cover normalized mapping and morph plan behavior

### Milestone 3. Real-Time Fitting

Exit criteria:

- garments equip and remove in real time
- starter catalog covers at least tops, outerwear, bottoms, shoes
- starter catalog also covers head-worn assets such as accessories and hair
- body masks and render order behave correctly

### Milestone 4. Pose Stability

Exit criteria:

- core pose set passes manual and automated QA
- major clipping regressions are reduced to acceptable levels

### Milestone 5. Surface Unification

Exit criteria:

- `Home`, `Closet`, `Canvas`, `Community`, and `Profile` all read as one product
- screenshot review passes against the wardrobe reference

### Milestone 6. Persistence And Sharing

Exit criteria:

- body profile, closet scene, saved looks, and canvas compositions persist cleanly
- Community can consume saved look data

## 11. Immediate Task Queue

These are the next concrete tasks to execute in order.

1. move the live `Closet` stage into a canonical runtime location under `packages/runtime-3d`
2. remove duplicate scene logic and keep one source of truth
3. remove stale Railway worker services and deployment residue from the main topology
4. create the `authoring/` directory structure
5. add avatar asset validation tooling
6. promote the first canonical human base asset through the manifest
7. expand garment manifest fields for compatibility and corrective fitting
8. fix no-garment silhouette quality
9. tighten starter garment catalog so every default outfit reads correctly
10. promote MPFB morph-target runtime application and keep it under validation
11. add screenshot-based verification artifacts for `Closet`
12. wire canvas and community to saved-look outputs from `Closet`

## 12. Progress Snapshot

As of 2026-04-14, the following are implemented:

- Railway residue cleanup for old dedicated worker services
- canonical `Closet` live stage ownership under `packages/runtime-3d`
- runtime avatar asset validation tooling
- hybrid visible-avatar plus hidden-driver-rig `Closet` runtime
- local-first client guards that stop dead `/v1/*` fetch attempts when no public API base is configured
- official MakeHuman `shirts01 / pants01 / shoes01` starter garments promoted into the shipped starter catalog
- starter accessory assets now exist for both base variants, including a bucket hat and oval sunglasses built against the MPFB base blends
- starter hair assets now exist for both base variants, including `Signature Ponytail`, `Soft Bob`, `Long Fall`, and `Textured Crop`
- MPFB base avatars rebuilt with exported runtime shape keys plus segmented body meshes
- runtime morph-target application re-enabled for MPFB base avatars
- the female MPFB base preset was rebuilt to use `ponytail01 + eyebrow001 + eyelashes01` and now exports with one subdivision level for a less faceted review silhouette
- the MPFB body mapping now uses derived lean / mass / curve / proportion signals instead of a single average-weight heuristic, and the male mapping now reaches the exported `ideal proportion` keys
- garment metadata expanded with size-chart, measurement-mode, and physical-profile fields
- first physical fit assessment layer promoted into `packages/domain-garment`
- `Closet` now surfaces selected garment fit summaries from the active body profile
- `Closet` now allows runtime hairstyle switching without rebuilding the avatar base asset, and hides the baked base-hair meshes when a runtime hair asset is equipped
- runtime garment consumption is no longer starter-only; the domain now supports published runtime garments from an external admin/publishing surface
- `apps/admin` now supports guided garment creation and publishing through `POST /v1/admin/garments`
- `apps/admin` now previews fit across representative body archetypes before publish, and the same archetype set powers `validate:fit-calibration`
- hero garments now receive offline Blender fit passes before export, and the current female source blends show improved body clearance:
  - `City Relaxed` top: `448 -> 341` vertices at `<= 1mm`
  - `Tailored Layer` outerwear: `803 -> 553` vertices at `<= 1mm`
- sourced adoption notes captured in `docs/physical-fit-system.md`

The main remaining blocker for the “human-like real person” bar is no longer tool availability or the absence of MPFB assets. Blender and the MPFB pipeline are now active, the repo ships MPFB-authored base avatars with exported shape keys, and it ships starter garment GLBs from the official MakeHuman packs. The remaining blocker is quality: the current measurement-to-morph mapping is still too coarse for MPFB, and the starter garment set still needs curation/corrective fit work before the Closet stage reads as a production-grade human try-on surface.

Update `2026-04-14`:

- `metadata.correctiveFit` is now part of the garment contract and is applied in the live `Closet` runtime.
- `runtime.poseTuning` is now part of the garment binding, allowing pose-specific body masks and clearance scaling for clipping-prone looks.
- The next fidelity gap is no longer “missing corrective response”; it is deeper per-garment tuning for a larger hero catalog and tighter measurement-to-MPFB morph calibration.

## 13. What The User May Need To Provide

Most of the work can be done without waiting.

The user is only likely to be needed for:

1. choosing between multiple acceptable human-face or hair art directions
2. providing proprietary brand garments that cannot be sourced legally from open assets
3. approving a specific visual target if two near-final options both work technically

If none of those are blocking, implementation should continue without pause.

## 14. Verification Matrix

Every milestone must be checked against this matrix.

### Code

- `npm run lint`
- `npm run typecheck`
- `npm run test:core`
- `npm run validate:garment3d`
- `npm run validate:avatar3d`
- `npm run validate:fit-calibration`
- `npm run build:services`
- `npm run build`

### Runtime

- default `Closet` render
- no-garment render
- female-base render
- male-base render
- pose change render
- garment swap render
- body-profile change render

### Product

- route smoke for `/`, `/app/closet`, `/app/canvas`, `/app/community`, `/app/profile`
- top bar presence
- login CTA presence
- shared design language consistency

## 15. Success Definition

FreeStyle is complete when a new maintainer can open the repo and immediately read it as:

`a mannequin-first real-time 3D fitting and styling product with a human avatar pipeline`

and not as:

- an old shopping import experiment
- an AI try-on demo
- a placeholder mannequin prototype
- a collection of unrelated wardrobe screens

## 16. Source References

The following external sources inform this plan:

- MPFB2 getting started
- MakeHuman ecosystem and asset creation workflow
- Blender glTF 2.0 exporter docs
- CharMorph official repository

Exact URLs should remain tracked in product docs when those sources directly influence shipped assets or tooling.
