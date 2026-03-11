create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_type text not null check (source_type in ('product_url', 'cart_url', 'upload_image')),
  source_url text not null,
  merchant text,
  merchant_product_id text,
  title text,
  brand text,
  status text not null default 'queued' check (status in ('queued', 'imported', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  source_url text not null,
  normalized_url text not null,
  candidate_rank int,
  score numeric,
  is_selected boolean not null default false,
  width int,
  height int,
  sha256 text,
  storage_key text,
  created_at timestamptz not null default now(),
  unique(product_id, normalized_url)
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid references products(id) on delete set null,
  original_image_url text not null,
  cutout_image_url text,
  mask_url text,
  thumbnail_small_url text,
  thumbnail_medium_url text,
  category text,
  embedding vector(1536),
  embedding_model text,
  perceptual_hash text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists outfit_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  request_payload jsonb not null,
  compatibility_score numeric,
  explanation jsonb,
  model_provider text,
  model_name text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tryons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  asset_id uuid not null references assets(id) on delete cascade,
  input_image_url text not null,
  output_image_url text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed')),
  provider text,
  provider_job_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();

drop trigger if exists assets_set_updated_at on assets;
create trigger assets_set_updated_at
before update on assets
for each row execute function set_updated_at();

drop trigger if exists outfit_evaluations_set_updated_at on outfit_evaluations;
create trigger outfit_evaluations_set_updated_at
before update on outfit_evaluations
for each row execute function set_updated_at();

drop trigger if exists tryons_set_updated_at on tryons;
create trigger tryons_set_updated_at
before update on tryons
for each row execute function set_updated_at();

drop trigger if exists outfits_set_updated_at on outfits;
create trigger outfits_set_updated_at
before update on outfits
for each row execute function set_updated_at();
