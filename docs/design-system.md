# Design System

![Wardrobe Reference](reference/wardrobe-reference.jpg)

## 1. Visual Truth Source

The reference image above is the design truth source for the wardrobe product. The goal is not vague mood matching. The goal is matching the interaction hierarchy:

- central full-height mannequin stage
- slim left information rail
- slim right outfit and catalog rail
- top micro-toolbar
- bottom segmented mode bar
- soft translucent surfaces
- thin separators
- restrained neutral palette

## 2. Token Sources

Current code-level token sources:

- `packages/design-tokens/src/index.ts`
- `packages/ui/src/index.tsx`

Core token families:

- color
- radius
- spacing
- shadow
- shell width

## 3. Color And Surface Rules

Required look:

- gray and white first
- glassmorphism with low saturation
- no loud purple bias
- no dashboard-style solid blocks
- warm accent only as a subtle support tone

The current shell tokens already reflect this:

- frosted white surfaces
- soft gray shell gradient
- thin dark dividers
- muted text hierarchy

## 4. Layout Rules

### Closet

This is the reference page.

- left rail for body profile and outfit context
- center stage for the mannequin
- right rail for dense catalog browsing
- floating top navigation
- floating bottom mode bar

### Fitting

- keep the same shell language
- bias controls toward pose, quality, and current garment focus

### Canvas

- keep the same shell treatment
- allow more stage area for arrangement work

### Discover

- keep the same tone, spacing, radii, and control style
- do not revert into a generic card dashboard

### Profile

- keep the same product surfaces and panel hierarchy
- saved looks and preferences should feel like part of the same wardrobe system

## 5. Component Rules

Preferred controls:

- pill buttons
- circular options
- slim segmented controls
- dense catalog cards
- translucent panels

Avoid:

- oversized marketing cards
- saturated CTA colors
- unrelated icon styles
- mixed spacing scales from old surfaces

## 6. Typography And Density

Typography should stay quiet and dense. The reference image uses small but precise labels, with the stage remaining visually dominant.

That means:

- small uppercase secondary labels
- compact metadata
- narrow gaps
- long descriptive copy kept off the main fitting surfaces

## 7. Accessibility Rules

Even with dense controls:

- keep visible focus states
- preserve keyboard access
- keep touch targets reasonable
- avoid low-contrast text on translucent surfaces
- keep errors and empty states explicit

## 8. Implementation References

Use these as the current implementation anchors:

- `apps/web/src/components/layout/ProductAppShell.tsx`
- `apps/web/src/components/product/ProductMiniToolbar.tsx`
- `apps/web/src/components/product/BodyProfilePanel.tsx`
- `apps/web/src/components/product/ClosetCatalogPanel.tsx`
- `apps/web/src/components/product/AvatarStageViewport.tsx`

If a new page looks visually cheaper than `Closet`, it is out of spec.
