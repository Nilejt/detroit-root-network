-- DISPOSABLE DATABASE ONLY: run after grow-layout-db.sql, never on Supabase.
\set ON_ERROR_STOP on
\ir ../supabase/migrations/011_grow_plot_recovery.sql
create function pg_temp.check_true(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
create function pg_temp.reject(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if sqlstate = expected then return; end if;
    raise exception 'Unexpected error %: %',sqlstate,sqlerrm;
  end;
  raise exception 'Expected rejection: %',statement;
end $$;
insert into grow_harvests(farm_id,plot_id,harvested_on,quantity,unit)
values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','2026-09-17',2,'lb');
set role authenticated;
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000001';
select pg_temp.check_true(drn_archive_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',2,true)=3,'member deletes own plot');
select pg_temp.check_true((select count(*)=0 from grow_layouts where archived_at is null),'deleted plot removed from active list');
select pg_temp.check_true((select count(*)=1 from grow_harvests),'harvest preserved');
select pg_temp.check_true((select count(*)=1 from grow_plots),'crop identity preserved');
select pg_temp.check_true((select is_archived from grow_layout_revisions where revision=3),'deletion audited');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',3,'hidden edit','{"unit":"ft","cells":[0],"layers":[]}')$q$,'55000');
select pg_temp.reject($q$select drn_archive_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',2,false)$q$,'40001');
select pg_temp.check_true(drn_archive_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',3,false)=4,'restore advances revision');
select pg_temp.check_true((select count(*)=1 from grow_layouts where archived_at is null),'restored plot visible');
select pg_temp.check_true((select document->'cells'='[0,1]'::jsonb from grow_layouts),'restored geometry preserved');
select pg_temp.check_true((select count(*)=4 from grow_layout_revisions),'all versions retained');
select pg_temp.reject($q$select drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',2,'stale edit','{"unit":"ft","cells":[0],"layers":[]}')$q$,'40001');
select pg_temp.check_true(drn_save_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',4,'restored edit','{"unit":"ft","cells":[0,1],"layers":[]}')=5,'restored plot editable');
select pg_temp.reject($q$delete from grow_layouts$q$,'42501');
select pg_temp.reject($q$update grow_layouts set archived_at=now()$q$,'42501');
select pg_temp.reject($q$select drn_archive_grow_layout('10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001',5,true)$q$,'42501');
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000002';
select pg_temp.reject($q$select drn_archive_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5,true)$q$,'42501');
select pg_temp.reject($q$select drn_archive_grow_layout('10000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',5,true)$q$,'42501');
select pg_temp.check_true(drn_archive_grow_layout('10000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',1,true)=2,'Q deletes own farm plot');
reset role;
update grow_beta_settings set owner_support_enabled=false;
set role authenticated;
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000003';
select pg_temp.reject($q$select drn_archive_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5,true)$q$,'42501');
reset role;
update grow_beta_settings set owner_support_enabled=true;
set role authenticated;
select pg_temp.check_true(drn_archive_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',5,true)=6,'Owner support switch applies');
reset role;
set role anon;
select pg_temp.reject($q$select drn_archive_grow_layout('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',6,false)$q$,'42501');
reset role;
\echo 'PASS: recoverable deletion, revisions, stale editors, crop/harvest preservation, member/Q/Owner/T2/anonymous boundaries.'
