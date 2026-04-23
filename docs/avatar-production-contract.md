# Avatar Production Contract

## Purpose

Avatar production is a factory process, not a single export step.

The goal is to guarantee that every promoted avatar has compatible render, fit, and collision representations before it enters production.

## Required Avatar Bodies

Every production avatar must carry:

- `render body`
- `fit body`
- `collision body`

These roles must stay separate:

- render body optimizes silhouette and material readability
- fit body optimizes measurement fidelity
- collision body optimizes solver stability and runtime speed

## Required Artifacts

Every production avatar must provide:

- display GLBs for body, head, and hair LODs
- fit body mesh
- measurement landmarks
- body-signature model
- collision capsules, mesh, or SDF
- rig and morph-target sidecars
- skin and hair material contracts
- quality reports for visual fit, fit compatibility, and budgets

## Reject Criteria

Reject or hold certification when any of these are true:

- measurement landmarks are missing
- fit body and render body landmarks materially disagree
- collision body protrudes or undershoots visible anatomy beyond tolerance
- LOD transitions break silhouette beyond the configured threshold
- skin or hair textures use incorrect color-space handling
- normal or tangent data is invalid
- hair sorting artifacts break golden scenes
- mobile fallback materially collapses face or skin readability

## Review Gates

Certification requires:

- automated schema and budget validation
- golden-scene visual approval
- fit compatibility approval against the current body matrix
- manual review notes recorded in the publication metadata

## Current Phase 5 Boundary

The current repo only claims the first read-only avatar publication seam.

- `packages/runtime-3d/src/avatar-publication-catalog.ts` is the runtime/admin catalog source of truth for the committed MPFB base avatars
- `GET /v1/admin/avatars` exposes that catalog for admin inspection
- `output/avatar-certification/latest.json` is the machine-readable evidence bundle paired with that catalog
- `POST /v1/lab/jobs/fit-simulations` is the first production-adjacent consumer and resolves queued avatar runtime metadata from that catalog
- `GET /v1/lab/fit-simulations/:id` now returns a minimal derived `avatarPublication` snapshot for the queued avatar variant, but it is still a read-time convenience view rather than persisted lineage

This is not the same thing as a complete canonical `AvatarManifest` delivery tree. Treat the Phase 5 catalog as publication metadata and certification evidence for the shipped base avatars only.

The runtime publication seam uses `runtime-avatar-render-manifest.v1`, intentionally distinct from the asset-factory `avatar-manifest.v1`.
