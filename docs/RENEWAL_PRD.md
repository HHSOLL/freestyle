# Renewal PRD

## 1. 문서 목적
이 문서는 FreeStyle 전체 리뉴얼의 제품 요구사항 문서(PRD)다. 목표는 기존의 "AI 가상 피팅 실험 앱" 인식을 넘어서, 개인 옷장을 이해하고 구매/코디/기록을 연결하는 "Wardrobe Operating System"으로 제품 중심축을 재정의하는 것이다.

## 2. 문제 정의
현재 FreeStyle는 다음 한계를 가진다.

- 가상 피팅/이미지 생성은 이미 범용화되고 있어 단독 차별점이 되기 어렵다.
- Studio, Trends, Profile이 느슨하게 연결되어 있어 사용자가 제품의 핵심 가치를 한 문장으로 이해하기 어렵다.
- 사용자의 실제 옷장, 구매 판단, 반복 착용 기록이 하나의 루프로 연결되지 않는다.
- "이 옷이 어울리는가"는 보여주지만, "왜 이 옷을 사야 하는가" 또는 "이미 가진 옷으로 어떻게 해결할 수 있는가"는 충분히 답하지 못한다.

## 3. 제품 비전
FreeStyle은 사용자의 옷장, 영감, 구매 후보, 실제 착용 데이터를 연결해 "더 잘 입고, 덜 사고, 더 오래 활용하게 만드는" 개인 스타일 운영 시스템이 된다.

한 문장 정의:

> FreeStyle is the operating system for your wardrobe: capture inspiration, rebuild it from your closet, and decide what is actually worth buying.

## 4. 목표 사용자

### Primary Segment
- 이미 패션 콘텐츠를 자주 저장하거나 스크린샷/좋아요/장바구니를 많이 모으는 사용자
- 옷은 좋아하지만 실제 옷장 운영은 비효율적인 사용자
- "비슷한 옷을 또 사고", "있는 옷으로 어떻게 입을지 못 정하는" 사용자

### Secondary Segment
- 룩북/코디 기록을 좋아하는 패션 헤비 유저
- 시즌별 캡슐 워드로브를 만들고 싶은 사용자
- 구매 전에 활용도를 점검하고 싶은 합리적 소비 성향 사용자

## 5. 핵심 Jobs To Be Done

1. 영감 이미지를 봤을 때 내 옷으로 얼마나 재현 가능한지 알고 싶다.
2. 새 상품을 봤을 때 내 옷장에 실제로 도움이 되는지 판단하고 싶다.
3. 옷장을 정리하고 조합 가능한 룩을 더 많이 만들고 싶다.
4. 실제로 자주 입는 조합과 실패하는 조합을 기록하고 다음 선택에 반영하고 싶다.

## 6. 리뉴얼 후 제품 포지셔닝

### 하지 않을 것
- generic AI try-on 앱을 메인 가치로 두지 않는다.
- 단순 트렌드 피드 소비형 앱으로 가지 않는다.
- 예쁜 2D 캔버스 편집기로만 머무르지 않는다.

### 집중할 것
- Closet intelligence
- Look reconstruction
- Purchase decision support
- Wear memory
- Capsule planning

## 7. 차별화 포인트

### 7-1. Look Match
영감 이미지, 상품 링크, 스크린샷을 입력하면 사용자의 옷장 기준으로 재현 가능도를 계산한다.

### 7-2. Unlock Score
새 상품이 들어왔을 때 기존 옷장과 결합해 몇 개의 새 조합을 여는지, 얼마나 중복되는지, 계절/상황 적합성이 어떤지 점수화한다.

### 7-3. Wear Memory
실제 착용 기록과 만족도, 상황, 반응을 저장해 추천 품질을 개선한다.

### 7-4. Capsule Builder
출장, 여행, 계절, 상황별로 최소 구성 코디 세트를 제안한다.

## 8. 핵심 경험 원칙

1. "새로 사라"보다 "지금 가진 걸로 먼저 해결하라"를 우선한다.
2. 분석 결과는 이미지와 수치 둘 다로 보여준다.
3. 사용자는 앱을 "구매 보조 툴"이 아니라 "옷장 의사결정 툴"로 느껴야 한다.
4. 결과는 예쁘기만 한 추천이 아니라 실제 행동으로 이어져야 한다.

## 9. 기능 범위

### MVP
- Closet
  - 링크/업로드/장바구니 import
  - 카테고리/시즌/스타일/레이어 속성 정리
- Looks Workspace
  - 기존 Studio를 리뉴얼한 룩 조립 공간
  - 룩 저장, 공유, 버전 관리
- Discover
  - 영감 이미지/링크 저장
  - 내 옷장 기준 대체 가능 아이템 매칭
- Decide
  - 상품별 unlock score
  - 유사 아이템 경고
  - 예상 활용도 요약
- Journal
  - 오늘 입은 룩 기록
  - 만족도/상황/메모 저장

### V2
- 자동 스타일/실루엣 군집화
- 캡슐 워드로브 빌더
- 여행/날씨/일정 기반 제안
- 다중 룩 비교와 구매 시뮬레이션

### V3
- 3D mannequin viewer
- 제한적 realtime motion
- 프리미엄 스타일 리포트

## 10. 비기능 요구사항

- 모바일 우선이어야 하지만 데스크톱 워크스페이스 경험도 강해야 한다.
- 무거운 분석/생성 경로는 비동기 job 기반을 유지한다.
- 결과 해석이 즉시 가능하도록 설명 가능성(explainability)을 보장한다.
- 사용자가 자신의 데이터를 신뢰할 수 있도록 import provenance와 source link를 유지한다.

## 11. 성공 지표

### Activation
- 첫 7일 내 10개 이상 asset 등록 비율
- 첫 7일 내 첫 look 저장 비율
- 첫 7일 내 첫 decide 사용 비율

### Engagement
- 주간 active closet users
- look rebuild 수
- saved inspiration -> reconstructed look 전환율
- decide 사용 후 save/skip 행동 비율

### Retention
- 4주 후 wear journal 재방문율
- 재구매 방지율(유사 아이템 경고 이후 미구매/보류 비율)
- 월별 look reuse 수

## 12. Non-goals

- 범용 쇼핑몰 대체
- full social network 구축
- 정교한 실시간 cloth simulation을 MVP 범위에 포함
- 완전 자동 스타일리스트처럼 행동하는 블랙박스 추천

## 13. 주요 리스크

- import 품질이 낮으면 전체 경험 신뢰도가 무너진다.
- attribute tagging이 약하면 look match / unlock score 정확도가 떨어진다.
- 지나치게 복잡한 정보 구조는 초기 onboarding을 해친다.
- generic try-on 기대와 실제 제품 중심축 사이의 메시지 충돌이 생길 수 있다.

## 14. 단계별 로드맵

### Phase 1. Structure Reset
- 브랜드/메시지 재정의
- IA 및 라우트 재구성
- Studio -> Looks Workspace 리브랜딩
- Trends -> Discover 리포지셔닝

### Phase 2. Decision Intelligence
- inspiration ingestion
- closet matching
- unlock score
- duplication detection

### Phase 3. Memory Loop
- wear journal
- satisfaction feedback
- weekly/monthly insight summaries

### Phase 4. Premium Surface
- capsule builder
- advanced compare
- 3D mannequin viewer

## 15. 출시 메시지 초안

- "Try on less. Understand your wardrobe more."
- "Capture a look. Rebuild it from your closet. Buy only what unlocks more."
- "Your wardrobe, finally organized around decisions."
