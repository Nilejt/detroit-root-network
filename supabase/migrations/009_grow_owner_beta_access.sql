-- Requires 008. Deploy the farmer-facing support notice BEFORE enabling access.
begin;
create table public.grow_beta_settings (
 id boolean primary key default true check(id),
 owner_support_enabled boolean not null default false
);
insert into public.grow_beta_settings(id,owner_support_enabled) values(true,false);
alter table public.grow_beta_settings enable row level security;
revoke all on public.grow_beta_settings from public,anon,authenticated;
-- Only a database administrator may enable/disable this temporary exception.
-- A missing setting fails closed; ordinary membership access stays available.
create or replace function public.drn_can_grow(target_farm uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from public.farms f where f.id=target_farm and f.test_tier::text='T1'
  and (
   exists(select 1 from public.farm_members m where m.farm_id=f.id and m.user_id=auth.uid())
   or (
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role::text='owner')
    and exists(select 1 from public.grow_beta_settings s where s.id=true and s.owner_support_enabled)
   )
  )
 );
$$;
revoke all on function public.drn_can_grow(uuid) from public,anon;
grant execute on function public.drn_can_grow(uuid) to authenticated;
commit;
