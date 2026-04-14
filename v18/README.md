# ZOI Style Editor v18

Local glass-overlay UI refresh with stable local fitting avatar.

## What changed
- left/right panels changed to glass overlay that fades into the background
- right panel narrowed and re-laid out to a fixed 3-column asset grid
- duplicate top category strip removed
- top controls reduced to small back/reset/save buttons
- scene fitting now uses a fixed base-body reference instead of re-fitting to clothing bounds
- mannequin presets are fully local and apply gender + body measurements directly
- clothing fitting stays modular by top / outerwear / bottom / shoes

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
