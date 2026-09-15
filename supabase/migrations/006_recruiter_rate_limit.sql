-- Run once through Supabase SQL Editor before enabling the recruiter page.
-- Contains no access codes, IP addresses, farm records, or Auth identities.
begin;
create schema if not exists drn_private;
revoke all on schema drn_private from public, anon, authenticated;
create table if not exists drn_private.recruiter_attempts (
 bucket text not null, window_start timestamptz not null, attempts integer not null,
 primary key(bucket,window_start)
);
alter table drn_private.recruiter_attempts enable row level security;
revoke all on drn_private.recruiter_attempts from public, anon, authenticated;
create or replace function public.drn_recruiter_attempt(client_bucket text)
returns boolean language plpgsql security definer set search_path='' as $$
declare w timestamptz; n integer; bucket_name text; cap integer;
begin
 if client_bucket is null or client_bucket !~ '^[a-f0-9]{64}$' then return false; end if;
 w = to_timestamp(floor(extract(epoch from now()) / 900) * 900);
 delete from drn_private.recruiter_attempts where window_start < w - interval '1 hour';
 -- Same lock order for every caller; atomic across serverless instances.
 foreach bucket_name in array array['global',client_bucket] loop
  cap = case when bucket_name='global' then 50 else 5 end;
  insert into drn_private.recruiter_attempts values(bucket_name,w,1)
  on conflict(bucket,window_start) do update set attempts=drn_private.recruiter_attempts.attempts+1
  returning attempts into n;
  if n > cap then return false; end if;
 end loop;
 return true;
end;
$$;
revoke all on function public.drn_recruiter_attempt(text) from public, anon, authenticated;
grant execute on function public.drn_recruiter_attempt(text) to service_role;
commit;
