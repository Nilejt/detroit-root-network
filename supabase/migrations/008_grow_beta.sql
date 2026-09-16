-- Private Grow beta. Explicit membership is required, even for operators.
begin;
create function public.drn_can_grow(target_farm uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.farm_members m join public.farms f on f.id=m.farm_id
 where m.user_id=auth.uid() and m.farm_id=target_farm and f.test_tier::text='T1');
$$;
revoke all on function public.drn_can_grow(uuid) from public,anon;
grant execute on function public.drn_can_grow(uuid) to authenticated;
create table public.grow_plots (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id),
 name text not null check(length(trim(name)) between 1 and 120),
 crop text not null check(length(trim(crop)) between 1 and 120),
 season integer not null check(season between 2000 and 2200),
 planted_on date, planned_harvest_on date,
 soil_type text not null default '' check(length(soil_type)<=200),
 notes text not null default '' check(length(notes)<=2000),
 created_at timestamptz not null default now(),
 unique(id,farm_id),
 check(planted_on is null or planned_harvest_on is null or planned_harvest_on>=planted_on)
);
create table public.grow_harvests (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id),
 plot_id uuid not null, harvested_on date not null,
 quantity numeric not null check(quantity>0 and quantity<1000000),
 unit text not null check(unit in ('lb','kg','bunch','each','bag','box')),
 notes text not null default '' check(length(notes)<=2000),
 created_at timestamptz not null default now(),
 foreign key(plot_id,farm_id) references public.grow_plots(id,farm_id)
);
-- Keep previous values for corrections. No client may write or erase history.
create table public.grow_history (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null,
 record_id uuid not null, record_type text not null,
 previous_value jsonb not null, changed_by uuid, changed_at timestamptz not null default now()
);
alter table public.grow_plots enable row level security;
alter table public.grow_harvests enable row level security;
alter table public.grow_history enable row level security;
revoke all on public.grow_plots,public.grow_harvests,public.grow_history from public,anon,authenticated;
grant select,insert on public.grow_plots,public.grow_harvests to authenticated;
grant update(name,crop,season,planted_on,planned_harvest_on,soil_type,notes) on public.grow_plots to authenticated;
grant update(harvested_on,quantity,unit,notes) on public.grow_harvests to authenticated;
grant select on public.grow_history to authenticated;
create policy grow_plot_read on public.grow_plots for select to authenticated using(public.drn_can_grow(farm_id));
create policy grow_plot_add on public.grow_plots for insert to authenticated with check(public.drn_can_grow(farm_id));
create policy grow_plot_edit on public.grow_plots for update to authenticated using(public.drn_can_grow(farm_id)) with check(public.drn_can_grow(farm_id));
create policy grow_harvest_read on public.grow_harvests for select to authenticated using(public.drn_can_grow(farm_id));
create policy grow_harvest_add on public.grow_harvests for insert to authenticated with check(public.drn_can_grow(farm_id));
create policy grow_harvest_edit on public.grow_harvests for update to authenticated using(public.drn_can_grow(farm_id)) with check(public.drn_can_grow(farm_id));
create policy grow_history_read on public.grow_history for select to authenticated using(public.drn_can_grow(farm_id));
create function public.drn_grow_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.grow_history(farm_id,record_id,record_type,previous_value,changed_by)
 values(old.farm_id,old.id,tg_table_name,to_jsonb(old),auth.uid());
 return new;
end;
$$;
revoke all on function public.drn_grow_history() from public,anon,authenticated;
create trigger grow_plot_history before update on public.grow_plots for each row execute function public.drn_grow_history();
create trigger grow_harvest_history before update on public.grow_harvests for each row execute function public.drn_grow_history();
commit;
