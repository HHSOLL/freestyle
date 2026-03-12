# Vercel (apps/web) Environment

## Project Settings
- Framework: Next.js
- Root Directory: `apps/web`
- Build Command: `npm run build`
- Output: Next.js default

## Required Environment Variables
- `BACKEND_ORIGIN=https://<railway-api-domain>`
- `NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>`

## Optional
- `NEXT_PUBLIC_API_BASE_URL` (direct API call mode; rewrite 대신 직접 호출 시)
- `NEXT_PUBLIC_AUTH_KAKAO_ENABLED=true|false`
- `NEXT_PUBLIC_AUTH_NAVER_ENABLED=true|false`

## Notes
- 권장 경로는 `BACKEND_ORIGIN` rewrite 기반입니다.
- 프론트엔드는 무거운 작업을 수행하지 않고, 잡 생성/상태조회/결과 렌더링만 담당합니다.
- 로그인은 Supabase magic link를 기본으로 하고, Kakao/Naver 버튼은 public env flag가 켜졌을 때만 활성화합니다.
- 로그인 redirect callback 경로는 `/auth/callback`입니다.
