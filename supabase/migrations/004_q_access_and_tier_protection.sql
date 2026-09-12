-- Run after qhamilton@gmail.com exists in Supabase Authentication > Users.
insert into public.profiles (id,email,display_name,role)
select id,email,'Director Q','director_q'::public.app_role from auth.users where lower(email)='qhamilton@gmail.com'
on conflict (id) do update set email=excluded.email,display_name='Director Q',role='director_q'::public.app_role;

insert into public.farm_members (farm_id,user_id,role)
select f.id,u.id,'owner'::public.farm_member_role from public.farms f join auth.users u on lower(u.email)='qhamilton@gmail.com' where f.slug='qs-stall'
on conflict (farm_id,user_id) do update set role=excluded.role;

create or replace function public.block_t2_app_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_farm_id uuid; target_tier text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'authenticated' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_table_name='farms' then
    target_tier=case when tg_op='DELETE' then old.test_tier::text else new.test_tier::text end;
  else
    target_farm_id=case when tg_op='DELETE' then old.farm_id else new.farm_id end;
    select test_tier::text into target_tier from public.farms where id=target_farm_id;
  end if;
  if target_tier='T2' then raise exception 'T2 stalls are read-only discovery data'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
do $$ declare table_name text; begin
 foreach table_name in array array['farms','selling_locations','inventory_items','volunteer_opportunities'] loop
  execute format('drop trigger if exists protect_t2_app_data on public.%I',table_name);
  execute format('create trigger protect_t2_app_data before insert or update or delete on public.%I for each row execute function public.block_t2_app_mutation()',table_name);
 end loop;
end $$;
