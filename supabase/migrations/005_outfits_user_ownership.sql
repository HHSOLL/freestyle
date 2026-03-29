alter table outfits
add column if not exists user_id uuid;

update outfits
set user_id = '00000000-0000-0000-0000-000000000000'
where user_id is null;

alter table outfits
alter column user_id set not null;

create index if not exists outfits_user_idx
on outfits(user_id);

drop policy if exists outfits_owner_all on outfits;
create policy outfits_owner_all on outfits
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
