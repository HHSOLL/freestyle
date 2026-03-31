alter table assets
  add column if not exists name text,
  add column if not exists brand text,
  add column if not exists source_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update assets as a
set
  name = coalesce(a.name, p.title),
  brand = coalesce(a.brand, p.brand),
  source_url = coalesce(a.source_url, p.source_url)
from products as p
where a.product_id = p.id;

update assets
set metadata = '{}'::jsonb
where metadata is null;

update assets
set name = coalesce(
  name,
  initcap(coalesce(category, 'item')) || ' ' || substring(id::text from 1 for 8)
)
where name is null;
