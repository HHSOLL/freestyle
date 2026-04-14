---
name: blender-prop-style-normalizer
description: Normalize a set of Blender props to a shared project style. Use when asked to make mixed props feel like one asset family through bevel, material, roughness, and detail-density consistency.
---

# Blender Prop Style Normalizer

Use this skill when the problem is visual inconsistency across props, not missing geometry.

## Workflow

1. Confirm the target objects or collections inside `blend_file`.
2. Ask what should be normalized:
   - bevel softness
   - material count
   - roughness/metalness palette
   - edge sharpness
   - detail density
3. Use `blender_run_python` to apply bounded style normalization.
4. Save to a new path and report what changed.

## Good Fits

- mixed open-source props that need one unified look
- desk prop sets
- background filler kits
