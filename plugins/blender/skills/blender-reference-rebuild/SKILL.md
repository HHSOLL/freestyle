---
name: blender-reference-rebuild
description: Rebuild a Blender asset from one or more local reference images. Use when asked to match the silhouette, proportions, or key details of a reference photo for a prop or garment.
---

# Blender Reference Rebuild

Use this skill when the user provides local reference images and wants a close but clean 3D interpretation.

## Workflow

1. Confirm the local reference image paths and the target asset type.
2. Use `blender_run_python` to load image references into the scene when helpful.
3. Match these first:
   - silhouette
   - proportion
   - major seam or panel lines
   - material split points
4. Save the rebuilt asset as a `.blend`, then export a `.glb` if requested.

## Guardrails

- Favor silhouette accuracy over small decorative detail.
- Keep the asset production-friendly rather than chasing pixel-perfect photo realism.
