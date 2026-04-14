# MPFB Garment Authoring

This directory contains the offline Blender/MPFB pipeline that exports starter garments on the same `game_engine` rig used by the shipped MPFB avatar bases.

Build command:

```bash
npm run authoring:garments:mpfb:build
```

Environment overrides:

- `MPFB_REPO_ROOT`
- `MPFB_SOURCE_DIR`
- `MPFB_ASSET_PACK_ZIP`
- `BLENDER_BIN`

Output layout:

- `authoring/garments/exports/raw/*.blend`
- `authoring/garments/exports/raw/*.summary.json`
- `apps/web/public/assets/garments/mpfb/*/*.glb`

Current starter mapping:

- `top_soft_casual`
  - female: `female_casualsuit01`
  - male: `male_casualsuit01`
- `top_city_relaxed`
  - female: `female_casualsuit02`
  - male: `male_casualsuit02`
- `outer_tailored_layer`
  - female: `female_elegantsuit01`
  - male: `male_elegantsuit01`
- `shoes_soft_sneaker`
  - female/male: `shoes01`
- `shoes_night_runner`
  - female/male: `shoes04`
