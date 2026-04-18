# Renewal Information Architecture

## Historical Planning Status
- This document captures an earlier IA proposal before the current mannequin-first boundary reset.
- Routes such as `looks`, `decide`, and `journal` are historical planning terms here, not the active product IA.
- For the current route map, use `README.md`, `docs/product-boundaries.md`, and `docs/migration-notes.md`.

## 1. 목적
이 문서는 리뉴얼 후 FreeStyle의 sitemap, navigation model, 주요 화면 목록, 그리고 low-fidelity wireframe 수준의 화면 구조를 정의한다.

## 2. IA 원칙

1. 사용자는 앱을 "피드"보다 "작업 공간"으로 느껴야 한다.
2. 핵심 경험은 `Closet -> Discover -> Looks -> Decide -> Journal` 순환 구조로 연결된다.
3. 랜딩은 이미지 중심 editorial 톤, 앱 내부는 calm utility 톤으로 분리한다.
4. 모든 핵심 행동은 2탭 이내에서 접근 가능해야 한다.

## 3. Global Navigation

### Public Web
- Home
- How It Works
- Examples
- Sign in
- Start Your Closet

### Authenticated App
- Home
- Closet
- Looks
- Discover
- Decide
- Journal
- Profile

## 4. Sitemap

### Public Routes
- `/`
- `/how-it-works`
- `/examples`
- `/auth/callback`
- `/login` 또는 modal-driven auth entry

### App Routes
- `/app`
- `/app/closet`
- `/app/closet/import`
- `/app/closet/item/[id]`
- `/app/looks`
- `/app/looks/new`
- `/app/looks/[id]`
- `/app/discover`
- `/app/discover/inspiration/[id]`
- `/app/decide`
- `/app/decide/item/[id]`
- `/app/journal`
- `/app/journal/[entryId]`
- `/app/profile`

### Legacy Compatibility
- `/studio` -> `/app/looks/new` 또는 `/app/looks`
- `/trends` -> `/app/discover`
- `/profile`는 점진적으로 `/app/profile`로 흡수

## 5. Route Roles

### `/`
브랜드 랜딩. FreeStyle이 무엇인지, 왜 기존 try-on 앱과 다른지, 어떤 미래 상태를 주는지 설명한다.

### `/app`
오늘의 대시보드. 옷장 현황, 최근 영감, 미완성 look, 구매 판단 후보, 이번 주 journal을 요약한다.

### `/app/closet`
개인 옷장 운영 화면. 카테고리, 필터, 시즌, 활용도 기준으로 정리한다.

### `/app/looks`
저장된 look 목록과 최근 작업. 기존 Studio의 상위 개념.

### `/app/discover`
영감/트렌드/저장한 레퍼런스 기반 탐색 공간. 핵심은 소비가 아니라 "내 옷으로의 변환 가능성"이다.

### `/app/decide`
구매 후보 리스트와 상품별 unlock score, duplication warning, 추천 이유를 제공한다.

### `/app/journal`
실제 착용과 만족도 기록. 개인화 루프의 핵심.

## 6. Core Screen List

### 6-1. Home Dashboard
- 오늘의 제안
- 최근 저장한 inspiration
- unfinished looks
- 구매 판단 대기 아이템
- 최근 착용 로그

### 6-2. Closet Grid
- 아이템 그리드
- 카테고리/시즌/스타일/레이어 필터
- import CTA
- closet health summary

### 6-3. Closet Item Detail
- 큰 상품 이미지
- source link
- 속성 태깅
- 연결 가능한 look
- 유사 아이템

### 6-4. Looks Index
- saved looks
- draft looks
- 최근 편집 순
- share 상태

### 6-5. Look Workspace
- 중앙 large canvas
- 좌측 asset rail
- 우측 inspector / notes / score
- 상단 mode switch: build / compare / share

### 6-6. Discover
- inspiration masonry/grid
- source filter
- save / rebuild actions
- "closet match" 배지

### 6-7. Inspiration Detail
- 원본 이미지/링크
- key garments 추출
- 내 closet 대체 아이템
- 부족한 아이템 제안

### 6-8. Decide List
- 구매 후보 카드/리스트
- unlock score
- duplicate risk
- season fit
- reason summary

### 6-9. Decide Detail
- 상품 이미지
- source metadata
- what it unlocks
- what it duplicates
- related existing items
- decision CTA: buy / wait / skip / already own similar

### 6-10. Journal
- calendar/list hybrid
- 날짜별 착용 룩
- 날씨/상황/만족도
- revisit suggestions

## 7. Low-Fidelity Wireframes

### 7-1. Public Home
Structure:
- Full-bleed hero image or motion-led collage
- Narrow text rail with one dominant message
- "How it works" as 3-stage narrative
- Example transformations
- Final CTA

Primary takeaway:
- FreeStyle is not another try-on toy. It is a wardrobe decision system.

### 7-2. App Shell
Structure:
- Left rail nav on desktop / bottom nav on mobile
- Top context bar for search, add, notifications
- Main work area with minimal chrome
- Right contextual panel only where needed

Primary takeaway:
- Feels like a tool, not a feed.

### 7-3. Closet Screen
Structure:
- Header: closet summary + import CTA
- Filter row
- Main grid
- Optional side summary panel

Primary takeaway:
- The closet is a system with health, gaps, and redundancies.

### 7-4. Looks Workspace
Structure:
- Left: inventory/assets
- Center: canvas/work area
- Right: inspector, score, notes, source links
- Bottom mobile tray for selected item controls

Primary takeaway:
- This is where inspiration becomes a reusable look recipe.

### 7-5. Discover Screen
Structure:
- Large visual feed
- Sticky filter/header
- Each card shows image, source, closet match percentage, quick actions

Primary takeaway:
- Discovery is only useful if it translates into your real wardrobe.

### 7-6. Decide Screen
Structure:
- Split list/detail or expandable stacked cards
- Score first
- Explanation second
- Images and comparison third

Primary takeaway:
- Buying is a decision with evidence, not impulse only.

### 7-7. Journal Screen
Structure:
- Date navigation
- outfit cards by day
- compact summary metrics
- notes and mood/satisfaction controls

Primary takeaway:
- The system learns from what you actually wear.

## 8. Responsive Behavior

### Desktop
- Workspace-first
- persistent navigation
- 3-column layouts where useful

### Mobile
- task-first
- bottom navigation
- sheets/drawers for secondary controls
- capture/import flows simplified to single-column

## 9. Signature Interaction Ideas

1. Closet Match Reveal
- inspiration 카드에서 scrub/hover 시 "내 옷으로 대체 가능한 부분"이 레이어처럼 드러난다.

2. Unlock Score Expansion
- 점수 숫자만 보여주는 것이 아니라, 열리는 look 조합이 stacked preview로 펼쳐진다.

3. Look Compare Mode
- 기존 look과 새 look 또는 inspiration과 reconstructed look을 side-by-side 또는 split reveal로 비교한다.

4. Journal Memory Strip
- 최근 착용과 만족도가 timeline strip처럼 이어지고, 반복 패턴이 시각적으로 강조된다.

## 10. Visual Direction

Visual thesis:
- editorial atelier + calm intelligence

Guidelines:
- 이미지가 주인공이고 UI chrome은 얇다.
- serif display + neutral sans 조합
- bone / ink / charcoal 계열 기반, accent는 1개
- 과한 카드 나열 금지
- landing과 app의 톤 차이는 분명하되 하나의 브랜드처럼 느껴져야 한다.
