alter table products enable row level security;
alter table product_images enable row level security;
alter table assets enable row level security;
alter table outfit_evaluations enable row level security;
alter table tryons enable row level security;
alter table jobs enable row level security;
alter table outfits enable row level security;

drop policy if exists products_owner_all on products;
create policy products_owner_all on products
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists product_images_owner_all on product_images;
create policy product_images_owner_all on product_images
for all
using (
  exists (
    select 1
    from products p
    where p.id = product_images.product_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from products p
    where p.id = product_images.product_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists assets_owner_all on assets;
create policy assets_owner_all on assets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists outfit_evaluations_owner_all on outfit_evaluations;
create policy outfit_evaluations_owner_all on outfit_evaluations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists tryons_owner_all on tryons;
create policy tryons_owner_all on tryons
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists jobs_owner_all on jobs;
create policy jobs_owner_all on jobs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- outfits는 공유 공개 조회를 위해 읽기 정책을 분리한다.
drop policy if exists outfits_public_read on outfits;
create policy outfits_public_read on outfits
for select
using (is_public = true);

revoke all on function claim_jobs(text, text[], int) from public;
revoke all on function heartbeat_jobs(text, uuid[]) from public;
revoke all on function requeue_stale_jobs(timestamptz, int) from public;

grant execute on function claim_jobs(text, text[], int) to service_role;
grant execute on function heartbeat_jobs(text, uuid[]) to service_role;
grant execute on function requeue_stale_jobs(timestamptz, int) to service_role;
