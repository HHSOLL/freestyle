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

## Notes
- 권장 경로는 `BACKEND_ORIGIN` rewrite 기반입니다.
- 프론트엔드는 무거운 작업을 수행하지 않고, 잡 생성/상태조회/결과 렌더링만 담당합니다.
- 로그인은 Supabase magic link 기반입니다. Studio/Profile은 세션이 없으면 로그인 게이트를 렌더링합니다.
