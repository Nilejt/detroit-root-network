-- DESTRUCTIVE TEST FIXTURE: run only against a NEW, disposable local database.
-- This is NOT a Supabase migration. It creates synthetic roles and base tables.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to authenticated;
create table public.farms(id uuid primary key, test_tier text);
create table public.profiles(id uuid primary key, role text);
create table public.farm_members(farm_id uuid, user_id uuid);
\ir ../supabase/migrations/008_grow_beta.sql
\ir ../supabase/migrations/009_grow_owner_beta_access.sql
\ir ../supabase/migrations/010_grow_layouts.sql
\ir ../supabase/migrations/013_grow_plot_dimensions.sql
insert into farms values ('10000000-0000-4000-8000-000000000001','T1'),('10000000-0000-4000-8000-000000000002','T1'),('10000000-0000-4000-8000-000000000003','T2');
insert into profiles values ('20000000-0000-4000-8000-000000000001','farmer'),('20000000-0000-4000-8000-000000000002','director_q'),('20000000-0000-4000-8000-000000000003','owner');
insert into farm_members values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001');
insert into grow_plots(id,farm_id,name,crop,season) values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Bed A collards','Collards',2026),('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Q lettuce','Lettuce',2026);
create function pg_temp.check_true(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
create function pg_temp.reject(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if sqlstate = expected then return; end if;
    raise exception 'Unexpected error %: %', sqlstate,sqlerrm;
  end;
  raise exception 'Expected rejection: %',statement;
end $$;
set role authenticated;
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000001';
select pg_temp.check_true(drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',0,'Real name','{"unit":"ft","cells":[0,1,12,13],"layers":[{"plotId":"30000000-0000-4000-8000-000000000001","x":0,"y":0,"width":1,"height":1,"color":"#386b50"}],"plot_size":{"width_ft":500,"length_ft":200}}')=1,'member can save physical dimensions');
select pg_temp.check_true((select name='Real name' from grow_layouts),'name preserved during validation');
select pg_temp.check_true((select document->'plot_size'='{"width_ft":500,"length_ft":200}'::jsonb from grow_layouts),'physical dimensions preserved');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004',0,'Too wide','{"unit":"ft","cells":[0],"layers":[],"plot_size":{"width_ft":501,"length_ft":200}}')$q$,'P0001');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004',0,'Unknown field','{"unit":"ft","cells":[0],"layers":[],"plot_size":null,"extra":true}')$q$,'P0001');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',0,'stale','{"unit":"ft","cells":[0],"layers":[]}')$q$,'40001');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,'bad crop','{"unit":"ft","cells":[0],"layers":[{"plotId":"30000000-0000-4000-8000-000000000002","x":0,"y":0,"width":1,"height":1,"color":"#386b50"}]}')$q$,'P0001');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,'outside','{"unit":"ft","cells":[0],"layers":[{"plotId":"30000000-0000-4000-8000-000000000001","x":1,"y":0,"width":1,"height":1,"color":"#386b50"}]}')$q$,'P0001');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,'units','{"unit":"m","cells":[0],"layers":[]}')$q$,'P0001');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000003',0,'T2','{"unit":"ft","cells":[0],"layers":[]}')$q$,'42501');
select pg_temp.reject($q$update grow_layouts set revision=99$q$,'42501');
select pg_temp.reject($q$delete from grow_layout_revisions$q$,'42501');
select pg_temp.check_true(drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,'Revision two','{"unit":"ft","cells":[0,1],"layers":[]}')=2,'second revision saved');
select pg_temp.check_true((select count(*)=2 from grow_layout_revisions),'both snapshots retained');
select pg_temp.check_true((select jsonb_array_length(document->'layers')=1 from grow_layout_revisions where revision=1),'old placement retained');
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000002';
select pg_temp.check_true((select count(*)=0 from grow_layouts),'Q cannot read unrelated Grow farm');
select pg_temp.check_true((select count(*)=0 from grow_layout_revisions),'Q cannot read unrelated history');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',2,'Q denied','{"unit":"ft","cells":[0],"layers":[]}')$q$,'42501');
select pg_temp.check_true(drn_save_grow_layout('10000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',0,'Q plot','{"unit":"ft","cells":[0],"layers":[]}')=1,'Q can save own farm');
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000003';
select pg_temp.check_true((select count(*)=0 from grow_layouts),'Owner switch off denies nonmember');
reset role;
update grow_beta_settings set owner_support_enabled=true;
set role authenticated;
select pg_temp.check_true((select count(*)=2 from grow_layouts),'Owner switch on permits T1 support');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000003',0,'Owner T2','{"unit":"ft","cells":[0],"layers":[]}')$q$,'42501');
reset role;
set role anon;
select pg_temp.reject($q$select * from grow_layouts$q$,'42501');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',2,'Anon','{"unit":"ft","cells":[0],"layers":[]}')$q$,'42501');
reset role;
\echo 'PASS: layout revisions, validation, T1 membership, Q isolation, Owner switch, T2 and anonymous denial.'
