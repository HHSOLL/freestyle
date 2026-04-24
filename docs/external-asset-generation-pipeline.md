# External Asset Generation Pipeline

## Purpose

This pipeline is an intake seam for generated 3D assets. It does not certify or publish generated output.

Generated assets may come from manual DCC work, internal Blender automation, or an approved external API adapter. Regardless of source, the output starts as a certification candidate and must pass the same production gates as authored assets.

## Current Contract

The canonical schemas live in `@freestyle/contracts`:

- `assetGenerationRequestInputSchema`
- `assetGenerationRecordSchema`
- `assetGenerationCreateResponseSchema`
- `assetGenerationListResponseSchema`

Admin-only API seam:

- `POST /v1/admin/asset-generation`
- `GET /v1/admin/asset-generation`
- `GET /v1/admin/asset-generation/:id`

The current implementation is deliberately vendor-neutral. `external-api` requests create a provider task placeholder with `raw_status: PENDING_PROVIDER_APPROVAL`; no paid provider call is made until a concrete adapter and credentials are explicitly approved.

## Required Input

Every request must include:

- `provider`: `manual-dcc`, `internal-blender`, `external-api`, or `mock`
- `intent`: garment/avatar/material generation intent
- HTTPS-only source images
- `category`
- `material_class`
- measurement constraints with `size_label`, garment measurements, and millimeter tolerance
- output requirements with `require_fit_mesh: true`, `require_collision_policy: true`, and `allow_auto_publish: false`

## Certification Rule

Generated output is never production-grade by default.

Every generated garment candidate must remain at `TECH_CANDIDATE` until the certification pipeline proves:

- display GLB exists and passes visual/topology validation
- fit mesh GLB exists and aligns with display mesh
- material JSON satisfies visual and physical material contracts
- body mask policy exists and respects forbidden visible regions
- collision policy exists
- fit metrics JSON exists
- golden fit report exists

`CERTIFIED` and `PUBLISHED` transitions must happen through the asset and fit certification workflow, not through the generation provider webhook.

## Provider Adapter Policy

External provider adapters must stay behind the neutral `asset-generation` seam.

Before adding a concrete adapter:

- confirm data retention, licensing, webhook, and asset ownership terms
- verify it can return GLB or another convertible source format
- verify whether it can produce usable topology or only display-quality geometry
- require a scale/measurement reconciliation step before certification
- keep generated output isolated from `PUBLISHED` runtime catalog reads

Photo-to-3D providers are acceptable for display-mesh bootstrap and texture/reference acceleration. They are not accepted as fit truth unless they also pass display/fit mesh alignment, body-region fit gates, and golden matrix certification.
