# Railway Service: api

## Runtime
- Service Name: `api`
- Dockerfile: `infra/docker/railway/api.Dockerfile`
- Start Command: `npm run serve:api`
- Port: `PORT` (default `8080`)

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `STORAGE_PROVIDER=supabase` (or `s3`)

## Optional Environment Variables
- `CORS_ORIGIN`
- `CORS_ORIGIN_PATTERNS`
- `API_PUBLIC_ORIGIN`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `NAVER_STATE_SECRET`
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`
- `RAILWAY_DOCKERFILE_PATH=infra/docker/railway/api.Dockerfile`

## Health Checks
- `GET /healthz`
- `GET /readyz`

## Auth Notes
- Kakao 로그인은 Supabase Auth provider에서 직접 처리하므로 Railway API 비밀키가 필요하지 않습니다.
- Naver 로그인은 Railway `/v1/auth/naver/start`, `/v1/auth/naver/callback` bridge를 사용합니다.
- `API_PUBLIC_ORIGIN`을 지정하면 Naver developer console의 callback URL과 Railway runtime이 일치하도록 고정할 수 있습니다.
