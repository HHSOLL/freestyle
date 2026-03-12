# Domains and CORS Runbook

## Current Safe Baseline
- Vercel primary domain: default production domain first
- Railway API domain: Railway provided domain first
- Supabase Auth `site_url`: stable Vercel production domain only
- Supabase Auth `uri_allow_list`: localhost + Vercel production callback + approved preview callbacks

커스텀 도메인이 아직 안정화되지 않았다면, `site_url`이나 OAuth redirect URL을 커스텀 도메인으로 먼저 고정하지 않는다.

## Recommended Policy
1. Vercel
- Production: stable default Vercel domain
- Preview: Vercel preview domains only

2. Railway API CORS
- `CORS_ORIGIN`: exact allowlist for localhost + stable production origin
- `CORS_ORIGIN_PATTERNS`: preview wildcard only
  - Example: `https://*-sols-projects-7e25d3b5.vercel.app`

3. Supabase Auth
- `site_url`: production domain only
- `uri_allow_list`:
  - `http://localhost:3000/auth/callback`
  - `https://<stable-production-domain>/auth/callback`
  - `https://<approved-preview-domain>/auth/callback`

## Kakao / Naver Notes
- Kakao: Supabase provider redirect URL과 `site_url`/`uri_allow_list`를 같은 기준으로 유지
- Naver: Railway `/v1/auth/naver/callback`를 provider console에 등록하고, 최종 브라우저 redirect는 Vercel `/auth/callback`으로 넘긴다.

## When Custom Domain Becomes Stable
1. Vercel custom domain 연결
2. Supabase `site_url`을 custom domain으로 변경
3. Supabase `uri_allow_list`에 custom domain callback 추가
4. Railway `CORS_ORIGIN`에 custom domain 추가
5. OAuth providers(Kakao/Naver) redirect URL도 같은 custom domain 기준으로 동기화
6. localhost / preview / production callback smoke test 재실행
