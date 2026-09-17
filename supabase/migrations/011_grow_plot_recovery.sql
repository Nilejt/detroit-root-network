-- Requires 010. User-facing deletion is recoverable: hide a physical plot without
-- destroying its layout revisions, crop identities, or historical harvest links.
begin;
alter table public.grow_layouts add column archived_at timestamptz;
alter table public.grow_layout_revisions add column is_archived boolean not null default false;

-- Existing/older clients cannot continue editing a deleted plot through the 010
-- save RPC. This guard also protects against a stale editor after a delete.
create function public.drn_guard_archived_layout() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.archived_at is not null and new.archived_at is not null then
    raise exception 'Restore this deleted plot before editing it' using errcode = '55000';
  end if;
  return new;
end;
$$;
revoke all on function public.drn_guard_archived_layout() from public, anon, authenticated;
create trigger grow_layout_archive_guard before update on public.grow_layouts
  for each row execute function public.drn_guard_archived_layout();

create function public.drn_archive_grow_layout(target_farm uuid, target_layout uuid, expected_revision integer, archive_plot boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  current_row public.grow_layouts%rowtype;
  next_revision integer;
begin
  if auth.uid() is null or not public.drn_can_grow(target_farm) then
    raise exception 'Grow access denied' using errcode = '42501';
  end if;
  if target_layout is null or expected_revision is null or expected_revision < 1 or archive_plot is null then
    raise exception 'Invalid plot action';
  end if;
  -- Same lock order as drn_save_grow_layout; a save and delete cannot interleave.
  perform pg_advisory_xact_lock(hashtextextended(target_layout::text, 0));
  select * into current_row from public.grow_layouts where id = target_layout and farm_id = target_farm for update;
  if not found then raise exception 'Plot unavailable' using errcode = '42501'; end if;
  if current_row.revision <> expected_revision then
    raise exception 'Plot changed; reload before continuing' using errcode = '40001';
  end if;
  if (current_row.archived_at is not null) = archive_plot then return current_row.revision; end if;
  next_revision := current_row.revision + 1;
  update public.grow_layouts set archived_at = case when archive_plot then now() else null end,
    revision = next_revision, updated_at = now() where id = target_layout;
  insert into public.grow_layout_revisions(layout_id,farm_id,revision,name,document,saved_by,is_archived)
    values(target_layout,target_farm,next_revision,current_row.name,current_row.document,auth.uid(),archive_plot);
  return next_revision;
end;
$$;
revoke all on function public.drn_archive_grow_layout(uuid,uuid,integer,boolean) from public, anon;
grant execute on function public.drn_archive_grow_layout(uuid,uuid,integer,boolean) to authenticated;
commit;
