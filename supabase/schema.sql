create extension if not exists "pgcrypto";

create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  share_slug text unique not null,
  title text not null,
  description text,
  preview_image text not null,
  data jsonb not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outfits_share_slug_idx on outfits (share_slug);
create index if not exists outfits_public_idx on outfits (is_public);

create or replace function set_outfits_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists outfits_set_updated_at on outfits;
create trigger outfits_set_updated_at
before update on outfits
for each row
execute function set_outfits_updated_at();
