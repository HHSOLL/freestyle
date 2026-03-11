create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed', 'cancelled')),
  priority smallint not null default 100,
  payload jsonb not null,
  result jsonb,
  error_code text,
  error_message text,
  attempt int not null default 0,
  max_attempts int not null default 5,
  run_after timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  heartbeat_at timestamptz,
  parent_job_id uuid references jobs(id) on delete set null,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists jobs_job_type_idempotency_key_idx
on jobs(job_type, idempotency_key)
where idempotency_key is not null;

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at
before update on jobs
for each row execute function set_updated_at();

create or replace function claim_jobs(
  p_worker_name text,
  p_job_types text[],
  p_batch_size int
)
returns setof jobs
language plpgsql
security definer
as $$
begin
  return query
  with candidate as (
    select id
    from jobs
    where status = 'queued'
      and run_after <= now()
      and job_type = any(p_job_types)
    order by priority asc, created_at asc
    for update skip locked
    limit p_batch_size
  )
  update jobs j
  set status = 'processing',
      locked_by = p_worker_name,
      locked_at = now(),
      heartbeat_at = now(),
      attempt = j.attempt + 1,
      updated_at = now()
  from candidate
  where j.id = candidate.id
  returning j.*;
end;
$$;

create or replace function heartbeat_jobs(
  p_worker_name text,
  p_job_ids uuid[]
)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  update jobs
  set heartbeat_at = now(),
      updated_at = now()
  where id = any(p_job_ids)
    and locked_by = p_worker_name
    and status = 'processing';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function requeue_stale_jobs(
  p_stale_before timestamptz,
  p_limit int default 100
)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  with stale as (
    select id, attempt, max_attempts
    from jobs
    where status = 'processing'
      and heartbeat_at < p_stale_before
    order by heartbeat_at asc
    limit p_limit
    for update skip locked
  )
  update jobs j
  set status = case when stale.attempt >= stale.max_attempts then 'failed' else 'queued' end,
      run_after = case
        when stale.attempt >= stale.max_attempts then j.run_after
        else now() + ((least(300, greatest(3, power(2, stale.attempt)::int)))::text || ' seconds')::interval
      end,
      locked_by = null,
      locked_at = null,
      heartbeat_at = null,
      error_code = case when stale.attempt >= stale.max_attempts then coalesce(j.error_code, 'STALE_TIMEOUT') else j.error_code end,
      error_message = case when stale.attempt >= stale.max_attempts then coalesce(j.error_message, 'Job became stale and exceeded max attempts.') else j.error_message end,
      completed_at = case when stale.attempt >= stale.max_attempts then now() else j.completed_at end,
      updated_at = now()
  from stale
  where j.id = stale.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
