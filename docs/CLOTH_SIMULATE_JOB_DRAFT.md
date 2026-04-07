# `cloth_simulate` Job Draft (Reserved, Not Implemented)

## 상태
- 설계 초안만 존재한다.
- 현재 런타임/DB/worker에 `cloth_simulate` job type은 추가되지 않았다.

## 배경
- 실시간 preview-grade cloth는 클라이언트에서 처리한다.
- 고정밀(베이크/공유/재현) 결과가 필요해질 때 worker 기반 비동기 경로로 확장한다.

## 제안 입력 계약
```json
{
  "body_profile": {
    "heightCm": 172,
    "shoulderCm": 44,
    "chestCm": 94,
    "waistCm": 78,
    "hipCm": 95,
    "inseamCm": 79
  },
  "garment_asset_id": "uuid",
  "material_params": {
    "stretch": 0.2,
    "drape": 0.5,
    "friction": 0.35
  },
  "simulation_profile": "quality_v1"
}
```

## 제안 출력 계약
```json
{
  "asset_id": "uuid",
  "draped_mesh_url": "https://...",
  "heatmap_url": "https://...",
  "summary": {
    "penetrationScore": 0.08,
    "strainScore": 0.31
  }
}
```

## 운영 원칙
- API는 job 생성/상태 조회만 담당하고, 무거운 연산은 worker가 수행한다.
- 기존 jobs 모델(`FOR UPDATE SKIP LOCKED`)과 동일한 retry/heartbeat 정책을 따른다.
- 결과물은 object storage에 저장하고 `jobs.result`에는 URL/요약만 기록한다.
