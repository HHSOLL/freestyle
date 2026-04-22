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
