# Open Asset Credits

현재 옷장/3D fitting surface는 공개 라이선스 3D asset을 함께 사용한다.

## Avatar / Props
- `apps/web/public/models/quaternius/Casual.fbx`
- `apps/web/public/models/quaternius/Suit.fbx`
- `apps/web/public/models/quaternius/Witch.fbx`
- `apps/web/public/models/quaternius/Worker.fbx`
  - Source pack: [Ultimate Modular Women Pack - Quaternius](https://quaternius.com/packs/ultimatemodularwomen.html)
  - Author: Quaternius
  - License: CC0
- `apps/web/public/assets/avatars/quaternius-animated-woman.glb`
  - Source: [Animated Woman - Poly Pizza](https://poly.pizza/m/9kF7eTDbhO)
  - Author: Quaternius
  - License: CC0
- `apps/web/public/assets/avatars/quaternius-man.glb`
  - Source: [Man - Poly Pizza](https://poly.pizza/m/HMnuH5geEG)
  - Author: Quaternius
  - License: CC0
- `apps/web/public/assets/props/reyshapes-mannequin.glb`
  - Source: [Mannequin - Poly Pizza](https://poly.pizza/m/tYwjQJvcFX)
  - Author: reyshapes
  - License: CC0
- `apps/web/public/assets/props/polygonalmind-jacket.glb`
  - Source: [Jacket - Poly Pizza](https://poly.pizza/m/eeKk3ObCbf)
  - Author: Polygonal Mind
  - License: CC0

## Closet Stage
- `apps/web/public/assets/avatars/quaternius-animated-woman.glb`
- `apps/web/public/assets/avatars/quaternius-man.glb`
  - Usage: `/app/closet`의 실제 사람형 rigged base body
  - Source: [Animated Woman - Poly Pizza](https://poly.pizza/m/9kF7eTDbhO), [Man - Poly Pizza](https://poly.pizza/m/HMnuH5geEG)
  - Author: Quaternius
  - License: CC0
- `apps/web/public/assets/closet/models/rig-base.glb`
- `apps/web/public/assets/closet/models/top_shirt.glb`
- `apps/web/public/assets/closet/models/top_tee.glb`
- `apps/web/public/assets/closet/models/outer_bomber.glb`
- `apps/web/public/assets/closet/models/outer_blazer.glb`
- `apps/web/public/assets/closet/models/outer_coat.glb`
- `apps/web/public/assets/closet/models/bottom_cargo.glb`
- `apps/web/public/assets/closet/models/bottom_denim.glb`
- `apps/web/public/assets/closet/models/bottom_shorts.glb`
- `apps/web/public/assets/closet/models/shoes_boot.glb`
- `apps/web/public/assets/closet/models/shoes_runner.glb`
- `apps/web/public/assets/closet/models/shoes_sneaker.glb`
  - Usage: `/app/closet` slot-based fitting용 body-compatible local starter pack
  - Source: project-local reference pack from `v18/public/assets/models/*`, generated/curated by `v18/tools/generate_rigged_assets.py`
  - License: repository-local experimental assets provided with this workspace
  - Note: 공개 clothing pack 호환성이 맞지 않아, 현재는 스켈레톤/스케일 안정성을 우선한 로컬 기본 팩으로 고정했다.

## Integration Notes
- wardrobe avatar preset metadata는 `apps/web/src/features/shared-3d/avatarPresets.ts`에서 관리한다.
- 새 공개 asset을 추가할 때는 source URL, author, license를 preset/문서에 같이 기록한다.
- `/app/closet`는 Quaternius human avatar(GLB)를 visible base body로 사용하고, 로컬 starter pack garment GLB를 slot별로 겹쳐 렌더링한다.
- clothing stage transform은 garment bounding box가 아니라 `apps/web/public/assets/closet/models/rig-base.glb`의 고정 fit reference 높이 기준으로만 계산한다.
- 포즈/체형 보정은 avatar와 clothing skeleton에 같은 규칙으로 적용하고, 원격 asset API가 비어도 로컬 starter pack으로 동작이 유지된다.
