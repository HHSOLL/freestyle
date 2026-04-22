# Material Contract

## Purpose

Visual material and physical material are separate contracts.

The visual contract serves rendering quality.
The physical contract serves fit and simulation quality.

## Material Classes

Current production classes are:

- `skin`
- `hair`
- `cotton`
- `denim`
- `leather`
- `rubber`
- `knit`
- `silk`
- `synthetic`
- `metal`
- `plastic`

## Visual Contract

Visual material may include:

- base color
- normal
- ORM
- detail normal
- opacity
- sheen
- clearcoat
- anisotropy

Rules:

- KTX2 is the default runtime texture format for 3D material maps
- WebP or AVIF are for thumbnails and UI imagery, not the primary 3D material path
- color-space handling and tangent-space validity are release gates

## Physical Contract

Physical material must include:

- thickness
- stretch warp
- stretch weft
- bend stiffness
- shear stiffness
- damping
- friction

Optional:

- density

## Reject Criteria

Reject or hold certification when any of these are true:

- color-space handling is wrong
- normal/tangent basis is invalid
- ORM packing is wrong
- mobile fallback collapses material readability
- physical-material data is missing for production garments that enter fit certification
