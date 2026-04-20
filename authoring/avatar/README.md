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
6. keep `schemaVersion`, preset path, summary path, and runtime model path in parity via `npm run validate:avatar3d`
