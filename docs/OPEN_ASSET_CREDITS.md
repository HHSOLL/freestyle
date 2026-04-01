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

## Integration Notes
- wardrobe avatar preset metadata는 `apps/web/src/features/shared-3d/avatarPresets.ts`에서 관리한다.
- 새 공개 asset을 추가할 때는 source URL, author, license를 preset/문서에 같이 기록한다.
- 현재 렌더링은 실제 cloth simulation이 아니라 `measurement-driven preview`이므로 asset은 avatar silhouette reference와 dressing-room staging 용도로 사용한다.
