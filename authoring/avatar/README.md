# Avatar Authoring

Expected structure:

- `mpfb/`
  - Blender + MPFB2 source files
  - preset notes
  - target notes
- `exports/raw/`
  - high-fidelity export candidates before optimization
- `exports/optimized/`
  - runtime-ready candidates before promotion into app assets

Promotion checklist:

1. validate bind pose
2. validate skeleton aliases
3. validate morph or deformation controls
4. document source and license
5. register in runtime manifest
6. keep `schemaVersion`, preset path, summary path, sidecar paths, and runtime model path in parity via `npm run validate:avatar3d`
7. keep `buildProvenance` populated with MPFB revision, asset-pack checksum, and builder metadata

Required raw-sidecar outputs per promoted avatar variant:

- `*.summary.json`
- `*.skeleton.json`
- `*.measurements.json`
- `*.morph-map.json`

Authoring input lock:

- `authoring/avatar/mpfb/source-lock.json` is the pinned source-of-truth for MPFB revision and expected asset-pack checksum
