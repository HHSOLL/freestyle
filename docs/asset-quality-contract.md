# Asset Quality Contract

## Purpose

This document defines the production-grade certification contract for FreeStyle avatar assets, garment assets, material assets, and fit artifacts.

This contract exists so production readiness is not decided by ad-hoc visual opinion alone.

The canonical schema seam lives in:

- `packages/asset-schema/src/index.ts`
- `packages/asset-schema/src/approval-state.ts`
- `packages/asset-schema/src/quality.ts`

## Approval States

Every production-facing asset must carry one of these approval states:

- `DRAFT`
- `TECH_CANDIDATE`
- `VISUAL_CANDIDATE`
- `FIT_CANDIDATE`
- `CERTIFIED`
- `PUBLISHED`
- `DEPRECATED`
- `REJECTED`

Rules:

- product routes default to `PUBLISHED` assets only
- admin and QA surfaces may inspect candidate states
- legacy converted assets may be used for migration, testing, and fallback only until they pass this certification flow
- promoted states (`CERTIFIED`, `PUBLISHED`, `DEPRECATED`) require certification metadata on the active admin/API write path

## Minimum Production Contract

Before an asset can be promoted to `PUBLISHED`, it must have:

- schema-valid manifest data
- explicit approval-state metadata
- quality reports for visual, fit, and budget checks
- versioned production artifacts with rollback lineage
- category-specific fit policy where applicable

The required artifact families are:

- display asset
- fit asset
- collision asset where the category needs solver-grade collision
- material asset
- fit artifact asset for HQ simulation outputs

## Certification Workflow

The certification workflow is:

1. `DRAFT`
2. automated schema and topology validation
3. budget validation
4. visual review
5. fit review
6. performance review
7. `CERTIFIED`
8. publish approval
9. `PUBLISHED`

Failure handling:

- schema failure: `REJECTED` or back to `DRAFT`
- budget failure: remain `TECH_CANDIDATE`
- visual failure: remain `VISUAL_CANDIDATE`
- fit failure: remain `FIT_CANDIDATE`
- manual operator reject: `REJECTED`

## Required Automation

Automation must be able to produce and persist:

- schema parse result
- quality summary
- budget summary
- certification notes
- approver identity and timestamp
- artifact lineage identifiers
