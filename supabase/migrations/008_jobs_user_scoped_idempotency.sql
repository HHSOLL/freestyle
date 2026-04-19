drop index if exists jobs_job_type_idempotency_key_idx;

create unique index if not exists jobs_user_job_type_idempotency_key_idx
on jobs(user_id, job_type, idempotency_key)
where idempotency_key is not null;
