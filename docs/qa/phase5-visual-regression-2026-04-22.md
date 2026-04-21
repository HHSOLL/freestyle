# Phase 5 Visual Regression Evidence — 2026-04-22

## Scope

- Deep-research runtime plan `Phase 5`
- Release-grade visual regression and quality-tier evidence for current product IA

## Commands Run

```bash
PATH="/opt/homebrew/bin:$PATH" PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e:visual -- --update-snapshots
PATH="/opt/homebrew/bin:$PATH" PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e:visual
PATH="/opt/homebrew/bin:$PATH" npm run check
```

## Snapshot Set

- `/Users/sol/Desktop/fsp/apps/web/e2e/visual-regression.spec.ts-snapshots/home-shell-chromium-darwin.png`
- `/Users/sol/Desktop/fsp/apps/web/e2e/visual-regression.spec.ts-snapshots/canvas-empty-shell-chromium-darwin.png`
- `/Users/sol/Desktop/fsp/apps/web/e2e/visual-regression.spec.ts-snapshots/community-feed-shell-chromium-darwin.png`
- `/Users/sol/Desktop/fsp/apps/web/e2e/visual-regression.spec.ts-snapshots/profile-summary-shell-chromium-darwin.png`
- `/Users/sol/Desktop/fsp/apps/web/e2e/visual-regression.spec.ts-snapshots/closet-low-tier-chromium-darwin.png`
- `/Users/sol/Desktop/fsp/apps/web/e2e/visual-regression.spec.ts-snapshots/closet-balanced-tier-chromium-darwin.png`
- `/Users/sol/Desktop/fsp/apps/web/e2e/visual-regression.spec.ts-snapshots/closet-high-tier-chromium-darwin.png`

## Notes

- The committed visual baseline is now the primary RC evidence for route-shell and `Closet` tier regressions.
- Playwright Chromium now launches with software WebGL (`swiftshader`) so the headless suite renders the actual stage instead of the unsupported placeholder.
- The route baseline intentionally uses deterministic local storage for language, body profile, and closet scene so screenshot drift reflects product changes, not random session state.
- `Closet` tier coverage is desktop-first and current IA-first. Mobile export bundles remain optional operator artifacts rather than CI-blocking goldens.
