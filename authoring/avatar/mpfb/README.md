# MPFB Avatar Authoring

This directory contains the canonical offline source-of-truth for promoted human base avatars.

Contents:

- `presets/`
  - deterministic human info JSON used to generate base female and male avatars
- `source-lock.json`
  - pinned MPFB git revision and expected asset-pack checksum/source URLs
- `scripts/`
  - Blender Python entrypoints for MPFB setup, asset-pack installation, and GLB export

The intended command path is:

1. fetch MPFB source into `authoring/avatar/.cache/mpfb2`
2. fetch the official `makehuman_system_assets` pack into `authoring/avatar/.cache`
3. run the Blender build wrapper
4. inspect `authoring/avatar/exports/raw/*`
5. promote approved GLBs into `apps/web/public/assets/avatars/*`

Do not commit the downloaded MPFB source or asset-pack zip. Only commit source presets, scripts, and approved outputs.

The exported base-avatar summaries and sidecars are part of the authoring contract. They must keep:

- `schemaVersion`
- `buildProvenance.mpfb.repoUrl`
- `buildProvenance.mpfb.revision`
- `buildProvenance.assetPack.sha256`
- `source-lock.json` parity for MPFB revision and asset-pack checksum
- `authoringProvenance.variantId`
- `authoringProvenance.presetPath`
- `authoringProvenance.outputModelPath`
- `authoring/avatar/exports/raw/*.skeleton.json`
- `authoring/avatar/exports/raw/*.measurements.json`
- `authoring/avatar/exports/raw/*.morph-map.json`

in parity with `packages/runtime-3d/src/avatar-manifest.ts`.
