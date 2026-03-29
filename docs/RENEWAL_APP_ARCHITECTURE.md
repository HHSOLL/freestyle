# Renewal App Architecture

## 1. 목적
이 문서는 리뉴얼 후 FreeStyle의 앱 구조, 라우트 체계, feature 모듈 경계, API/worker 영향 범위, 그리고 점진적 이행 전략을 정의한다.

## 2. 현재 상태 요약

- 웹은 `apps/web`의 Next.js App Router 기반이다.
- API는 `apps/api`의 `/v1/*` Fastify 계약을 사용한다.
- 무거운 작업은 Railway worker + Supabase jobs polling으로 비동기 처리한다.
- 현재 핵심 표면은 `Studio`, `Trends`, `Profile`, `Try-on`, `Evaluation` 중심이다.

이 구조는 유지 가능하다. 다만 제품 도메인과 화면 소유권을 새 중심축에 맞게 재조직해야 한다.

## 3. Target Bounded Contexts

### closet
- garments / attributes / categories / source metadata
- closet health
- duplicate detection

### looks
- look recipes
- canvas/workspace state
- look sharing
- reconstruction outputs

### discover
- inspiration ingestion
- reference images/links
- extracted garment candidates
- closet match status

### decision
- purchase candidates
- unlock score
- duplication risk
- wear potential summary

### journal
- wear logs
- satisfaction / context / notes
- historical summaries

### insight
- periodic summaries
- closet gaps
- recommendation surfaces

## 4. Target Route Structure

### Public
- `app/(marketing)/page.tsx`
- `app/(marketing)/how-it-works/page.tsx`
- `app/(marketing)/examples/page.tsx`

### Authenticated App
- `app/(app)/app/page.tsx`
- `app/(app)/app/closet/page.tsx`
- `app/(app)/app/closet/import/page.tsx`
- `app/(app)/app/closet/item/[id]/page.tsx`
- `app/(app)/app/looks/page.tsx`
- `app/(app)/app/looks/new/page.tsx`
- `app/(app)/app/looks/[id]/page.tsx`
- `app/(app)/app/discover/page.tsx`
- `app/(app)/app/discover/inspiration/[id]/page.tsx`
- `app/(app)/app/decide/page.tsx`
- `app/(app)/app/decide/item/[id]/page.tsx`
- `app/(app)/app/journal/page.tsx`
- `app/(app)/app/journal/[entryId]/page.tsx`
- `app/(app)/app/profile/page.tsx`

## 5. Frontend Module Structure

권장 구조:

```txt
apps/web/src/
  app/
    (marketing)/
    (app)/
  features/
    closet/
    looks/
    discover/
    decision/
    journal/
    insight/
    auth/
  components/
    brand/
    layout/
    ui/
  lib/
    api/
    auth/
    analytics/
    formatting/
```

## 6. Component Ownership

### layout
- app shell
- marketing shell
- nav
- header
- mobile tabs

### closet
- import drawers
- asset grid/list
- closet filters
- item detail panels

### looks
- workspace canvas
- asset rail
- inspector
- compare mode
- sharing controls

### discover
- inspiration grid
- source capture
- match summary

### decision
- score cards
- duplicate compare
- rationale blocks

### journal
- calendar strip
- entry cards
- feedback controls

## 7. API Evolution

현재 `/v1/jobs/import/*`, `/v1/assets`, `/v1/jobs/evaluations`, `/v1/jobs/tryons`는 유지하되, 리뉴얼 제품 중심축에 맞는 새 계약을 추가한다.

### Closet
- `GET /v1/closet/items`
- `GET /v1/closet/items/:id`
- `PATCH /v1/closet/items/:id`
- `DELETE /v1/closet/items/:id`
- `GET /v1/closet/health`

### Looks
- `GET /v1/looks`
- `POST /v1/looks`
- `GET /v1/looks/:id`
- `PATCH /v1/looks/:id`
- `POST /v1/looks/:id/share`

### Discover
- `GET /v1/inspirations`
- `POST /v1/inspirations`
- `GET /v1/inspirations/:id`
- `POST /v1/inspirations/:id/match`

### Decide
- `GET /v1/decisions`
- `POST /v1/decisions`
- `GET /v1/decisions/:id`
- `POST /v1/decisions/:id/recompute`

### Journal
- `GET /v1/journal`
- `POST /v1/journal`
- `PATCH /v1/journal/:id`

### Transitional
- `/v1/jobs/tryons`와 `/v1/jobs/evaluations`는 "Labs" 또는 optional features로 유지 가능
- 현재 구현 단계에서는 `/v1/outfits`가 user-owned looks compatibility layer 역할을 하며, `/app/looks`와 Studio 저장이 이 계약 위에서 동작한다.

## 8. Worker Implications

현재 worker topology는 유지한다. 다만 job type과 정의를 확장해야 한다.

### Existing
- `import.product_url`
- `import.cart_url`
- `import.upload_image`
- `background_removal.process`
- `asset_processor.process`
- `evaluator.outfit`
- `tryon.generate`

### New Recommended Jobs
- `closet.attribute_tag`
- `closet.duplicate_score`
- `discover.extract_reference`
- `discover.match_closet`
- `decision.unlock_score`
- `journal.summarize_period`

## 9. Data Model Changes

### Existing Assets Table Enhancements
- `style_tags`
- `season_tags`
- `layer_role`
- `formality`
- `silhouette`
- `color_family`
- `usage_count`
- `last_worn_at`

### New Tables
- `inspirations`
- `inspiration_items`
- `looks`
- `look_items`
- `decisions`
- `decision_matches`
- `wear_logs`
- `wear_log_items`
- `closet_insights`

## 10. Migration Strategy

### Phase 1. IA + Route Shell
- 새 app shell 추가
- legacy route에서 새 route로 soft redirect 또는 entry duplication
- 기존 `studio`는 `looks/new`로 연결

### Phase 2. Domain Extraction
- 기존 studio feature에서 looks 관련 컴포넌트 분리
- trends를 discover feature로 재구성
- profile archive/assets를 closet/journal로 분산

### Phase 3. API Expansion
- closet, looks, discover, decision, journal 계약 추가
- 레거시 endpoint는 compatibility layer 유지

### Phase 4. Data Backfill
- 기존 assets -> closet items view 정렬
- 기존 outfits -> looks로 매핑
- 기존 share/archive 메타데이터 재사용

### Phase 5. Labs Separation
- try-on, evaluator를 main flow에서 분리
- `Labs` 또는 optional modal experience로 축소

## 11. Risks

- legacy Studio 로직이 커서 looks 도메인 분리가 생각보다 오래 걸릴 수 있다.
- attribute tagging 품질이 낮으면 decision/discover 기능 전반이 흔들린다.
- profile/trends/studio를 동시에 재편하면 회귀 위험이 크다.
- 초기에는 UI 리뉴얼보다 domain/API 정리가 더 중요한데, 시각 작업이 먼저 들어오면 구조가 흔들릴 수 있다.

## 12. Recommended Delivery Order

1. marketing + app shell
2. closet domain
3. looks workspace
4. discover matching
5. decision scoring
6. journal loop
7. labs separation and premium surfaces
