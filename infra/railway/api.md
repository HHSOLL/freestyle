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
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`
- `RAILWAY_DOCKERFILE_PATH=infra/docker/railway/api.Dockerfile`

## Health Checks
- `GET /healthz`
- `GET /readyz`
