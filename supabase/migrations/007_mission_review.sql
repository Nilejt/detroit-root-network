-- Mission editorial workflow only. Does not modify farm policies or Auth roles.
begin;
create table public.mission_sections (
 id text primary key check (id in ('hero','environment','experiences','trust','origin','impact')),
 title text, body text,
 revision integer not null default 0,
 check ((title is null and body is null) or
   (length(trim(title)) between 1 and 200 and length(trim(body)) between 1 and 12000))
);
insert into public.mission_sections(id) values
 ('hero'),('environment'),('experiences'),('trust'),('origin'),('impact');
create table public.mission_suggestions (
 id uuid primary key default gen_random_uuid(),
 section_id text not null references public.mission_sections(id),
 author_id uuid not null default auth.uid() references auth.users(id),
 base_revision integer not null check (base_revision >= 0),
 title text not null check(length(trim(title)) between 1 and 200),
 body text not null check(length(trim(body)) between 1 and 12000),
 comment text not null check(length(trim(comment)) between 1 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz
);
alter table public.mission_sections enable row level security;
alter table public.mission_suggestions enable row level security;
revoke all on public.mission_sections, public.mission_suggestions from public, anon, authenticated;
grant select on public.mission_sections to anon, authenticated;
grant select on public.mission_suggestions to authenticated;
grant insert(section_id,base_revision,title,body,comment) on public.mission_suggestions to authenticated;
create policy mission_public_read on public.mission_sections for select to anon, authenticated using(true);
create policy mission_operator_read on public.mission_suggestions for select to authenticated using (
 exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','director_q'))
);
create policy mission_operator_propose on public.mission_suggestions for insert to authenticated with check (
 author_id=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null
 and exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','director_q'))
 and base_revision=(select revision from public.mission_sections where id=section_id)
);

-- Only this function can publish. Locking prevents two approvals overwriting
-- each other; stale suggestions must be resubmitted against the current text.
create function public.review_mission_suggestion(suggestion_id uuid, approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare s public.mission_suggestions; current_revision integer;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='owner') then
  raise exception 'Owner access required';
 end if;
 if approve is null then raise exception 'Review decision required'; end if;
 select * into s from public.mission_suggestions where id=suggestion_id for update;
 if not found or s.status <> 'pending' then raise exception 'Suggestion is not pending'; end if;
 if approve then
  select revision into current_revision from public.mission_sections where id=s.section_id for update;
  if current_revision <> s.base_revision then raise exception 'Section changed. Submit a fresh suggestion.'; end if;
  update public.mission_sections set title=s.title,body=s.body,revision=revision+1 where id=s.section_id;
 end if;
 update public.mission_suggestions set status=case when approve then 'approved' else 'rejected' end,
  reviewed_by=auth.uid(),reviewed_at=now() where id=s.id;
end;
$$;
revoke all on function public.review_mission_suggestion(uuid,boolean) from public,anon;
grant execute on function public.review_mission_suggestion(uuid,boolean) to authenticated;
commit;
