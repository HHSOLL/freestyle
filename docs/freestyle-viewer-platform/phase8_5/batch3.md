# Phase 8.5 / Batch 3

## Goal

Turn the new admin fit-simulation catalog into contextual operator tooling inside `apps/admin`.

The smallest safe slice is:

1. show current-garment HQ fit evidence without manual UUID lookup
2. keep list state, detail state, and garment publish state separate
3. support local read-only triage without implying certification mutation

## Implemented

1. `apps/admin` now loads `GET /v1/admin/fit-simulations` for the current working garment id
2. the HQ Fit section exposes local read-only filters for:
   - status
   - lineage coverage
3. operators can select a catalog row and open the existing detail inspection with one click
4. manual `Fit Simulation ID` loading remains available as an override

## Evidence

- `apps/admin/src/components/AdminWorkspace.tsx`
- `apps/admin/src/lib/fitSimulationInspection.ts`
- `apps/admin/src/lib/fitSimulationInspection.test.ts`
- `apps/admin/src/components/FitSimulationInspectionPanel.tsx`

## Non-goals

This batch does **not** add:

- automatic garment publish approval from HQ fit evidence
- write-time linkage into `/v1/admin/garments*`
- broader fit registry/search UX outside the current admin workspace
- solver-grade cloth truth or authoritative `draped_glb` certification
