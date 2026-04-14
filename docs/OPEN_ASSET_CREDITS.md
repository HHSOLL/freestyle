# Open Asset Credits

현재 메인 `Closet` / `Canvas` / `Community` surface에서 실제 shipped 상태로 쓰는 공개 라이선스 3D asset은 MPFB 계열만 남긴다.

## Runtime Avatar
- `apps/web/public/assets/avatars/mpfb-female-base.glb`
- `apps/web/public/assets/avatars/mpfb-male-base.glb`
  - Source pipeline: [MPFB2](https://github.com/makehumancommunity/mpfb2) + [makehuman_system_assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)
  - Authoring source: MakeHuman Community
  - License: MPFB2 addon code is GPL-3.0-or-later, generated avatar outputs and the official system asset pack are documented as CC0-compatible on the official asset page
  - Note: the repo ships generated runtime GLBs, not the full upstream asset pack zip
  - Current promoted presets: female uses `ponytail01` hair, `eyebrow001`, `eyelashes01`; male uses `short02`

## Runtime Garments
- `apps/web/public/assets/garments/mpfb/female/*.glb`
- `apps/web/public/assets/garments/mpfb/male/*.glb`
  - Usage: `/app/closet` starter outfit and shoes catalog
  - Source pipeline: `authoring/garments/mpfb/scripts/build_runtime_garment.py` -> `scripts/build-mpfb-starter-garments.mjs`
  - Upstream sources: [MPFB2](https://github.com/makehumancommunity/mpfb2), [makehuman_system_assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)
  - License: generated runtime outputs from the official MakeHuman Community asset pack
  - Current promoted starter set: `Soft Tucked Tee`, `Soft Wool Trousers`, `Soft Day Shoe`
  - Official pack inputs: `shirts01`, `pants01`, `shoes01`

## Runtime Hair
- `apps/web/public/assets/garments/mpfb/female/hair_*.glb`
- `apps/web/public/assets/garments/mpfb/male/hair_*.glb`
  - Usage: `/app/closet` selectable hair-style catalog
  - Source pipeline: `authoring/garments/mpfb/scripts/build_runtime_hair.py` -> `scripts/build-mpfb-hair-assets.mjs`
  - Upstream sources: [MPFB2](https://github.com/makehumancommunity/mpfb2), [makehuman_system_assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)
  - License: generated runtime outputs from the official MakeHuman Community asset pack
  - Current promoted starter set: `Signature Ponytail`, `Soft Bob`, `Long Fall`, `Textured Crop`
  - Official pack inputs: `ponytail01`, `bob01`, `long01`, `short03`

## Runtime Accessories
- `apps/web/public/assets/garments/mpfb/female/accessory_*.glb`
- `apps/web/public/assets/garments/mpfb/male/accessory_*.glb`
  - Usage: `/app/closet` accessory catalog
  - Source pipeline: `authoring/garments/mpfb/scripts/build_runtime_accessory.py` -> `scripts/build-mpfb-accessory-assets.mjs`
  - Authoring source: generated in-repo against the promoted MPFB base avatars
  - License: repo-authored runtime meshes and materials
  - Current promoted starter set: `City Bucket Hat`, `Oval Shades`

## Removed Legacy Open Assets
- old Quaternius avatar FBX/GLB samples
- legacy `assets/closet/models/*` slot-test garments
- demo SVG clothing placeholders
- unused Poly Pizza prop GLBs
  - These were removed from the repo during the mannequin-first realignment because they no longer participate in the live product path.

## Closet Stage
- `apps/web/public/assets/avatars/mpfb-female-base.glb`
- `apps/web/public/assets/avatars/mpfb-male-base.glb`
- `apps/web/public/assets/garments/mpfb/female/*.glb`
- `apps/web/public/assets/garments/mpfb/male/*.glb`
  - Usage: `/app/closet`의 실제 shipped mannequin, outfit, shoes, accessory, hair runtime
  - Avatar pipeline: `authoring/avatar/mpfb/presets/*` -> `authoring/avatar/mpfb/scripts/build_runtime_avatar.py` -> `scripts/build-mpfb-base-avatars.mjs`
  - Garment pipeline: `authoring/garments/mpfb/scripts/build_runtime_garment.py` -> `scripts/build-mpfb-starter-garments.mjs`
  - Hair pipeline: `authoring/garments/mpfb/scripts/build_runtime_hair.py` -> `scripts/build-mpfb-hair-assets.mjs`
  - Accessory pipeline: `authoring/garments/mpfb/scripts/build_runtime_accessory.py` -> `scripts/build-mpfb-accessory-assets.mjs`
  - Upstream sources: [MPFB2](https://github.com/makehumancommunity/mpfb2), [makehuman_system_assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)
  - License: generated assets tracked as CC0-compatible source outputs; see MakeHuman Community asset-pack page and commercial-use FAQ

## Integration Notes
- 새 공개 asset을 추가할 때는 source URL, author, license를 preset/문서에 같이 기록한다.
- `/app/closet`는 MPFB-authored human avatar(GLB)를 visible base body로 사용하고, 같은 authoring scale의 MPFB garment GLB를 같은 runtime wrapper 안에서 함께 렌더링한다.
- garment stage transform은 garment bounding box를 다시 피팅하지 않고, avatar fit transform을 그대로 공유한다.
- 포즈/체형 보정은 avatar와 garment skeleton에 같은 규칙으로 적용하고, 원격 asset API가 비어도 로컬 starter pack으로 동작이 유지된다.
- avatar manifest와 stage registration은 `packages/runtime-3d/src/avatar-manifest.ts`와 `packages/runtime-3d/src/closet-stage.tsx`가 source of truth다.
