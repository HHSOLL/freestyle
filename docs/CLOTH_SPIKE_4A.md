# Cloth Spike 4A (Preview-Grade)

## 목적
- 정확 물리 시뮬레이션이 아니라, 선택 레이어 1개에서 중력/충돌 기반 드레이프 느낌을 검증한다.
- 실패 시 기존 shell/legacy preview로 즉시 복귀 가능한 안전한 통합 경로를 확보한다.

## 범위(고정)
- 대상 의류: `tops` 또는 `outerwear` 중 선택된 레이어 1개
- 대상 아바타: 현재 공용 humanoid skeleton 경로 1종
- 충돌: torso capsule 근사치만 사용
- 제외: self-collision, 다중 의류 동시 cloth, 패턴/물성 기반 정확 solver

## 통합 게이트
- `NEXT_PUBLIC_CLOTH_MVP_ENABLED=true`
- `NEXT_PUBLIC_CLOTH_SPIKE_PASSED=true`
- 두 조건이 동시에 참일 때만 cloth 경로를 사용한다.
- 조건 불충족/오류/성능 저하 시 `FittingCanvas3D`는 legacy preview로 폴백한다.

## 통과 기준
1. 기준 환경에서 평균 30fps 이상
2. 체형 슬라이더 연속 조작 시 프리즈/크래시 없음
3. solver 실패 또는 프레임 저하 시 자동 복귀 동작 확인

## 현재 상태 (2026-04-07)
- 선택 레이어 1개 cloth preview 컴포넌트가 feature flag 뒤에 연결됨
- torso capsule collision + reset/recover + fallback 트리거 로직 포함
- 4A 판정: `PASS` (로컬 QA evidence 기준)
- 근거 문서: `docs/qa/cloth-4a-2026-04-07.md`
- 통합 정책: `NEXT_PUBLIC_CLOTH_SPIKE_PASSED=true`일 때만 cloth 경로 활성화(기본값은 운영 rollout 정책에 따름)
