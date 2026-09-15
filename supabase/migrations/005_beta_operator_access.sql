-- Existing-project migration: requires original schema plus migrations 003 and 004.
-- Run as database administrator AFTER both confirmed Auth users exist.
begin;
do $$ begin
  if (select count(*) from auth.users where lower(email) in ('nilejt@gmail.com','qhamilton@gmail.com') and email_confirmed_at is not null) <> 2 then
    raise exception 'Create/confirm Owner and Director Q Auth users before migration 005';
  end if;
  if not exists(select 1 from public.farms where slug='qs-stall' and test_tier::text='T1') then
    raise exception 'Q''s Stall must exist as T1';
  end if;
end $$;
insert into public.profiles(id,email,display_name,role)
select id,email,case lower(email) when 'nilejt@gmail.com' then 'Owner' else 'Director Q' end,
 case lower(email) when 'nilejt@gmail.com' then 'owner'::public.app_role else 'director_q'::public.app_role end
from auth.users where lower(email) in ('nilejt@gmail.com','qhamilton@gmail.com')
on conflict(id) do update set email=excluded.email,display_name=excluded.display_name,role=excluded.role;
insert into public.farm_members(farm_id,user_id,role)
select f.id,u.id,'owner'::public.farm_member_role from public.farms f join auth.users u on lower(u.email)='qhamilton@gmail.com' where f.slug='qs-stall'
on conflict(farm_id,user_id) do update set role=excluded.role;

-- Read trusted database roles, never browser input or editable user_metadata.
create or replace function public.drn_beta_operator()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role::text in ('owner','director_q'));
$$;
revoke all on function public.drn_beta_operator() from public, anon;
grant execute on function public.drn_beta_operator() to authenticated;

-- Add operator T1 access without replacing existing farmer/public policies.
alter table public.farms enable row level security;
drop policy if exists drn_operator_t1 on public.farms;
create policy drn_operator_t1 on public.farms for all to authenticated
using (test_tier::text='T1' and public.drn_beta_operator())
with check (test_tier::text='T1' and public.drn_beta_operator());
do $$ declare t text; begin
 foreach t in array array['selling_locations','inventory_items','volunteer_opportunities'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists drn_operator_t1 on public.%I',t);
  execute format('create policy drn_operator_t1 on public.%I for all to authenticated using (public.drn_beta_operator() and exists(select 1 from public.farms f where f.id=farm_id and f.test_tier::text=''T1'')) with check (public.drn_beta_operator() and exists(select 1 from public.farms f where f.id=farm_id and f.test_tier::text=''T1''))',t);
 end loop;
end $$;

-- Guard BOTH old and new rows: blocks retiering T2 and moving children out of T2.
create or replace function public.block_t2_app_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
declare old_tier text; new_tier text;
begin
 if coalesce(auth.jwt()->>'role','') not in ('authenticated','anon') then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if tg_table_name='farms' then
  if tg_op <> 'INSERT' then old_tier=old.test_tier::text; end if;
  if tg_op <> 'DELETE' then new_tier=new.test_tier::text; end if;
 else
  if tg_op <> 'INSERT' then select test_tier::text into old_tier from public.farms where id=old.farm_id; end if;
  if tg_op <> 'DELETE' then select test_tier::text into new_tier from public.farms where id=new.farm_id; end if;
 end if;
 if old_tier='T2' or new_tier='T2' then raise exception 'T2 stalls are read-only discovery data'; end if;
 if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

-- Even a permissive legacy profile-update policy must not permit role escalation.
create or replace function public.drn_protect_profile_identity()
returns trigger language plpgsql set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','') in ('authenticated','anon') then
  if tg_op='INSERT' then
   if new.role::text in ('owner','director_q') then raise exception 'Privileged roles require administrator provisioning'; end if;
  elsif new.role is distinct from old.role or new.id is distinct from old.id or new.email is distinct from old.email then
   raise exception 'Profile identity and roles require administrator provisioning';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists drn_protect_profile_identity on public.profiles;
create trigger drn_protect_profile_identity before insert or update on public.profiles for each row execute function public.drn_protect_profile_identity();
commit;
