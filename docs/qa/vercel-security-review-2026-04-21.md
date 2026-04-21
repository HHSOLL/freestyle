# Vercel Security Review 2026-04-21

## Trigger

- Official Vercel bulletin:
  - `https://vercel.com/kb/bulletin/vercel-april-2026-security-incident`

## Project Scope

- linked Vercel project: `freestyle`
- project id: `prj_RihVclie2mM6WBnCtLW8AufSLtTH`
- org id: `team_2aXOaUp9TMlKV6grlyL4ZM40`

## Commands Run

```bash
PATH="/opt/homebrew/bin:$PATH" vercel whoami
PATH="/opt/homebrew/bin:$PATH" vercel env ls production
PATH="/opt/homebrew/bin:$PATH" vercel list
PATH="/opt/homebrew/bin:$PATH" vercel activity --since 72h --project freestyle
```

## Findings

1. Authenticated Vercel user at review time was `hhsoll`.
2. Production env names visible through the linked project were:
   - `NEXT_PUBLIC_AUTH_NAVER_ENABLED`
   - `NEXT_PUBLIC_AUTH_KAKAO_ENABLED`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `BACKEND_ORIGIN`
3. No backend-only secret such as `SUPABASE_SERVICE_ROLE_KEY` was visible in Vercel production env for this project.
4. Recent deployment, alias, and accessible env-read activity surfaced by `vercel activity` was attributable to `hhsoll`.
5. No suspicious actor or unexpected log drain surfaced through the accessible project-level CLI review.

## Assessment

- No immediate evidence of project-specific compromise was observed from the accessible Vercel CLI surfaces reviewed here.
- The current Vercel project posture still appears to match the intended split:
  - browser/public runtime values on Vercel
  - backend/admin secrets retained on Railway / server-side surfaces
- The higher-priority follow-on remains backend secret posture and lab-route auth hardening, not urgent Vercel-side secret rotation from this evidence alone.

## Immediate Follow-Up Applied

1. `/v1/lab/*` routes no longer accept anonymous-header fallback.
2. Release guidance now requires a fresh `vercel env ls production` plus `vercel activity --since 72h --project freestyle` review when an active Vercel security bulletin exists.
