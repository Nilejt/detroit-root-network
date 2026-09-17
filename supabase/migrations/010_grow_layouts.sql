-- Private, versioned physical plots. Existing grow_plots remain dated crop plans;
-- no existing crop, harvest link, or correction history is rewritten.
begin;
create table public.grow_layouts (
  id uuid primary key,
  farm_id uuid not null references public.farms(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  revision integer not null default 0 check (revision >= 0),
  document jsonb not null,
  updated_at timestamptz not null default now(),
  unique(id, farm_id)
);
create table public.grow_layout_revisions (
  layout_id uuid not null,
  farm_id uuid not null,
  revision integer not null,
  name text not null,
  document jsonb not null,
  saved_by uuid not null,
  saved_at timestamptz not null default now(),
  primary key(layout_id, revision),
  foreign key(layout_id, farm_id) references public.grow_layouts(id, farm_id)
);
alter table public.grow_layouts enable row level security;
alter table public.grow_layout_revisions enable row level security;
revoke all on public.grow_layouts, public.grow_layout_revisions from public, anon, authenticated;
grant select on public.grow_layouts, public.grow_layout_revisions to authenticated;
create policy grow_layout_read on public.grow_layouts for select to authenticated using (public.drn_can_grow(farm_id));
create policy grow_layout_history_read on public.grow_layout_revisions for select to authenticated using (public.drn_can_grow(farm_id));
create index grow_layout_farm on public.grow_layouts(farm_id);
create index grow_layout_history_farm on public.grow_layout_revisions(farm_id, saved_at desc);

-- The only client write interface. Security definer is necessary because clients
-- must not bypass validation, revision checks, or the immutable revision snapshot.
-- Identity and drn_can_grow are checked here, including T1 and Owner kill switch.
create function public.drn_save_grow_layout(target_farm uuid, layout_id uuid, expected_revision integer, layout_name text, layout_document jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  current_row public.grow_layouts%rowtype;
  layer jsonb; cell jsonb; field_name text; crop_id uuid; seen_ids uuid[] := '{}';
  x integer; y integer; w integer; h integer; cx integer; cy integer;
  next_revision integer;
begin
  if auth.uid() is null or not public.drn_can_grow(target_farm) then
    raise exception 'Grow access denied' using errcode = '42501';
  end if;
  if layout_id is null or expected_revision is null or expected_revision < 0 or layout_name is null or length(btrim(layout_name)) not between 1 and 120 then
    raise exception 'Invalid layout name or revision';
  end if;
  if layout_document is null or jsonb_typeof(layout_document) <> 'object' or pg_column_size(layout_document) > 65536 then raise exception 'Invalid layout'; end if;
  if (layout_document->>'unit') is null or (layout_document->>'unit') not in ('ft','m')
    or jsonb_typeof(layout_document->'cells') is distinct from 'array'
    or jsonb_typeof(layout_document->'layers') is distinct from 'array' then raise exception 'Invalid layout structure'; end if;
  if jsonb_array_length(layout_document->'cells') not between 1 and 144 or jsonb_array_length(layout_document->'layers') > 60 then raise exception 'Layout limit exceeded'; end if;
  if (select count(*) from jsonb_object_keys(layout_document)) <> 3 then raise exception 'Unknown layout fields'; end if;
  for cell in select value from jsonb_array_elements(layout_document->'cells') loop
    if jsonb_typeof(cell) <> 'number' or cell::text !~ '^[0-9]{1,3}$' then raise exception 'Invalid cell'; end if;
    if (cell::text)::integer not between 0 and 143 then raise exception 'Cell outside canvas'; end if;
  end loop;
  if (select count(distinct value) from jsonb_array_elements(layout_document->'cells')) <> jsonb_array_length(layout_document->'cells') then raise exception 'Duplicate cells'; end if;
  for layer in select value from jsonb_array_elements(layout_document->'layers') loop
    if jsonb_typeof(layer) <> 'object' then raise exception 'Invalid crop layer'; end if;
    if (select count(*) from jsonb_object_keys(layer)) <> 6
      or not (layer ?& array['plotId','x','y','width','height','color']) then raise exception 'Invalid crop fields'; end if;
    if (layer->>'color') is null or (layer->>'color') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid color'; end if;
    foreach field_name in array array['x','y','width','height'] loop
      if jsonb_typeof(layer->field_name) is distinct from 'number' or (layer->>field_name) !~ '^[0-9]{1,2}$' then raise exception 'Invalid crop geometry'; end if;
    end loop;
    crop_id := (layer->>'plotId')::uuid;
    if crop_id is null or crop_id = any(seen_ids) or not exists(select 1 from public.grow_plots p where p.id = crop_id and p.farm_id = target_farm) then raise exception 'Crop must belong to this farm and appear once per layout'; end if;
    seen_ids := array_append(seen_ids, crop_id);
    x := (layer->>'x')::integer; y := (layer->>'y')::integer;
    w := (layer->>'width')::integer; h := (layer->>'height')::integer;
    if w < 1 or h < 1 or x+w > 12 or y+h > 12 then raise exception 'Crop outside canvas'; end if;
    for cy in y..y+h-1 loop for cx in x..x+w-1 loop
      if not (layout_document->'cells' @> jsonb_build_array(cy*12+cx)) then raise exception 'Crop outside plot'; end if;
    end loop; end loop;
  end loop;
  -- Serialize first creation and later edits of this ID, then compare revisions.
  perform pg_advisory_xact_lock(hashtextextended(layout_id::text, 0));
  select * into current_row from public.grow_layouts l where l.id = layout_id for update;
  if found then
    if current_row.farm_id <> target_farm then raise exception 'Layout access denied' using errcode = '42501'; end if;
    if current_row.revision <> expected_revision then raise exception 'Layout changed; reload before saving' using errcode = '40001'; end if;
    if current_row.document->>'unit' <> layout_document->>'unit' then raise exception 'Saved plot units cannot change'; end if;
  elsif expected_revision <> 0 then raise exception 'Layout changed; reload before saving' using errcode = '40001';
  end if;
  next_revision := expected_revision + 1;
  insert into public.grow_layouts(id,farm_id,name,revision,document) values(layout_id,target_farm,btrim(drn_save_grow_layout.layout_name),next_revision,layout_document)
    on conflict(id) do update set name=excluded.name,revision=excluded.revision,document=excluded.document,updated_at=now();
  insert into public.grow_layout_revisions(layout_id,farm_id,revision,name,document,saved_by)
    values(layout_id,target_farm,next_revision,btrim(drn_save_grow_layout.layout_name),layout_document,auth.uid());
  return next_revision;
end;
$$;
revoke all on function public.drn_save_grow_layout(uuid,uuid,integer,text,jsonb) from public, anon;
grant execute on function public.drn_save_grow_layout(uuid,uuid,integer,text,jsonb) to authenticated;
commit;
