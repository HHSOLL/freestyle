create table if not exists published_runtime_garments (
  id text primary key,
  category text not null,
  source_system text not null,
  published_at timestamptz not null,
  payload jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists published_runtime_garments_category_idx
  on published_runtime_garments (category);

create index if not exists published_runtime_garments_source_system_idx
  on published_runtime_garments (source_system);

create index if not exists published_runtime_garments_published_at_idx
  on published_runtime_garments (published_at desc);

create or replace function set_published_runtime_garments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists published_runtime_garments_set_updated_at on published_runtime_garments;
create trigger published_runtime_garments_set_updated_at
before update on published_runtime_garments
for each row
execute function set_published_runtime_garments_updated_at();

alter table published_runtime_garments enable row level security;

drop policy if exists published_runtime_garments_authenticated_read on published_runtime_garments;
create policy published_runtime_garments_authenticated_read on published_runtime_garments
for select
using (auth.role() = 'authenticated');
