# Fit Quality Contract

## Purpose

Fit quality is evaluated by body region, garment category, visibility, and performance.

Global averages alone are not sufficient.

The canonical typed seam begins in:

- `packages/asset-schema/src/quality.ts`
- `packages/asset-schema/src/index.ts`

## Body Region Taxonomy

The minimum taxonomy is:

- `head`
- `neck`
- `shoulder_left`
- `shoulder_right`
- `chest`
- `bust`
- `under_bust`
- `upper_back`
- `waist`
- `abdomen`
- `hip`
- `pelvis`
- `upper_arm_left`
- `upper_arm_right`
- `forearm_left`
- `forearm_right`
- `wrist_left`
- `wrist_right`
- `thigh_left`
- `thigh_right`
- `knee_left`
- `knee_right`
- `calf_left`
- `calf_right`
- `ankle_left`
- `ankle_right`
- `foot_left`
- `foot_right`
- `toe_left`
- `toe_right`
- `heel_left`
- `heel_right`

## Hard Fail Baseline

Initial hard fail thresholds are:

- visible critical penetration max `> 3mm`
- visible non-critical penetration max `> 6mm`
- visible penetration `p95 > 2mm`
- forbidden visible body masking
- NaN or invalid vertices
- severe self-intersection
- unstable preview or HQ solve
- preview latency `P95 > 120ms`
- HQ cache-hit latency `P95 > 500ms`

## Golden Matrices

Current minimum matrices are:

- body matrix `B01..B12`
- foot matrix `F01..F06`
- pose matrix `P01..P08`

These matrices are used for certification and for regression control.

## Required Fit Reports

Every certified fit path must be able to emit:

- fit score and grade
- penetration metrics
- clearance metrics
- floating metrics
- body-mask metrics
- stability metrics
- performance metrics

## Visual Fit Gate

Visual fit gates compare:

- front
- side
- back
- 3/4
- zoom waist
- zoom shoulder
- zoom foot
- zoom hem

These gates should compare more than RGB deltas when possible:

- silhouette
- depth
- normal response
- shadow/contact
- fit heatmap
