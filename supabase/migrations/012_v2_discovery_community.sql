-- Detroit Root Network — Migration 012
-- V2 discovery, verified Community Board publishing, alert architecture, and
-- five additional read-only fixtures for a 15-farm pilot demonstration.

-- Enum additions are idempotent. Policies compare role text so this migration
-- does not need to cast a newly-added enum value in the same transaction.
alter type public.app_role add value if not exists 'admin';
alter type public.app_role add value if not exists 'community_partner';

-- Quinn and Nile share the platform-owner permission boundary. Display labels
-- are presentation concerns; authorization reads this trusted profile column.
update public.profiles
set role = 'owner'::public.app_role,
    display_name = case when lower(email)='qhamilton@gmail.com' then 'Quinn' else display_name end
where lower(email) in ('nilejt@gmail.com','qhamilton@gmail.com');

alter table public.selling_locations add column if not exists is_self_service boolean not null default false;
alter table public.inventory_items add column if not exists expected_available_on date;
alter table public.inventory_items add column if not exists publish_coming_soon boolean not null default false;
alter table public.inventory_items add column if not exists show_expected_date boolean not null default false;

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references public.farms(id) on delete cascade,
  publisher_type text not null check (publisher_type in ('farm','partner','community_space')),
  organization_name text not null check (char_length(organization_name) between 2 and 120),
  event_type text not null,
  title text not null check (char_length(title) between 2 and 120),
  description text not null check (char_length(description) between 2 and 600),
  starts_at timestamptz not null,
  ends_at timestamptz,
  address text not null,
  registration_url text,
  is_free boolean not null default false,
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_members (
  organization_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users(id),
  primary key (organization_name,user_id)
);

-- Provider-neutral subscriptions support email first and aggregated SMS later.
-- Raw phone/email values should be encrypted or moved to a messaging provider
-- before live collection; the V2 interface intentionally remains a mock.
create table if not exists public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email','sms')),
  destination_ciphertext text not null,
  alert_types text[] not null default '{}',
  digest_frequency text not null default 'weekly' check (digest_frequency in ('daily','weekly')),
  consented_at timestamptz not null default now(),
  is_active boolean not null default true
);

create or replace function public.drn_platform_operator()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role::text in ('owner','admin','director_q'));
$$;
revoke all on function public.drn_platform_operator() from public, anon;
grant execute on function public.drn_platform_operator() to authenticated;

alter table public.community_events enable row level security;
alter table public.partner_members enable row level security;
alter table public.alert_subscriptions enable row level security;

drop policy if exists community_events_public_read on public.community_events;
create policy community_events_public_read on public.community_events for select to anon, authenticated using (is_published);
drop policy if exists community_events_operator_manage on public.community_events;
create policy community_events_operator_manage on public.community_events for all to authenticated
using (public.drn_platform_operator()) with check (public.drn_platform_operator());
drop policy if exists community_events_farm_publish on public.community_events;
create policy community_events_farm_publish on public.community_events for insert to authenticated with check (
  publisher_type='farm' and farm_id is not null and exists(
    select 1 from public.farms f left join public.farm_members m on m.farm_id=f.id and m.user_id=auth.uid()
    where f.id=farm_id and f.test_tier::text='T1' and (m.user_id is not null or public.drn_platform_operator())
  )
);
drop policy if exists community_events_partner_publish on public.community_events;
create policy community_events_partner_publish on public.community_events for insert to authenticated with check (
  publisher_type='partner' and created_by=auth.uid() and exists(
    select 1 from public.partner_members p where p.user_id=auth.uid() and p.organization_name=organization_name
  )
);
drop policy if exists partner_members_operator_manage on public.partner_members;
create policy partner_members_operator_manage on public.partner_members for all to authenticated
using (public.drn_platform_operator()) with check (public.drn_platform_operator());
drop policy if exists alert_subscriptions_own on public.alert_subscriptions;
create policy alert_subscriptions_own on public.alert_subscriptions for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

insert into public.farms (id,name,slug,blurb,region,base_address,base_city,base_state,test_tier,is_published,payment_methods,is_accepting_volunteers)
values
('20000000-0000-4000-8000-000000000006','Brightmoor Growing Test','brightmoor-growing-test','A read-only westside fixture featuring fruit and garden staples.','West','18900 Lahser Rd','Detroit','MI','T2',true,array['Cash'],false),
('20000000-0000-4000-8000-000000000007','Corktown Harvest Test','corktown-harvest-test','A read-only market fixture for nutrition and route testing.','Southwest','1620 Michigan Ave','Detroit','MI','T2',true,array['Cash','Card'],false),
('20000000-0000-4000-8000-000000000008','Jefferson Chalmers Test','jefferson-chalmers-test','A read-only eastside fixture with seasonal produce.','East','14500 E Jefferson Ave','Detroit','MI','T2',true,array['Cash'],false),
('20000000-0000-4000-8000-000000000009','Northwest Greens Test','northwest-greens-test','A read-only fixture offering greens and low-prep produce.','West','17300 Livernois Ave','Detroit','MI','T2',true,array['Cash','SNAP'],false),
('20000000-0000-4000-8000-000000000010','Riverbend Roots Test','riverbend-roots-test','A read-only riverfront-area fixture for discovery testing.','East','7600 Jefferson Ave','Detroit','MI','T2',true,array['Cash','Card'],false)
on conflict (slug) do update set name=excluded.name,blurb=excluded.blurb,region=excluded.region,base_address=excluded.base_address,is_published=true;

insert into public.selling_locations (farm_id,location_name,address,city,state,opens_at,closes_at,is_active,is_visible,address_validated,validation_source,is_self_service)
select f.id,v.location_name,f.base_address,'Detroit','MI',v.opens_at::time,v.closes_at::time,true,true,true,'seeded_test_data',v.self_service
from (values
('brightmoor-growing-test','Brightmoor test stand','09:00','15:00',true),
('corktown-harvest-test','Corktown test pop-up','11:00','17:00',false),
('jefferson-chalmers-test','Jefferson test market','10:00','14:00',false),
('northwest-greens-test','Livernois test stand','08:00','13:00',true),
('riverbend-roots-test','Riverbend test pickup','12:00','18:00',false)
) as v(slug,location_name,opens_at,closes_at,self_service)
join public.farms f on f.slug=v.slug
where not exists(select 1 from public.selling_locations s where s.farm_id=f.id);

insert into public.inventory_items (farm_id,item_name,quantity,unit,price_cents,stock_status,is_visible,expected_available_on,publish_coming_soon,show_expected_date)
select f.id,v.item_name,v.quantity,v.unit,v.price_cents,v.status::public.stock_status,true,
  case when v.status='coming_soon' then current_date+14 else null end,
  v.status='coming_soon',v.status='coming_soon'
from (values
('brightmoor-growing-test','Apples',18::numeric,'pound',350,'available'),
('brightmoor-growing-test','Broccoli',10::numeric,'bunch',400,'available'),
('corktown-harvest-test','Spinach',12::numeric,'bag',450,'available'),
('corktown-harvest-test','Blueberries',8::numeric,'pint',550,'low_stock'),
('jefferson-chalmers-test','Carrots',20::numeric,'bunch',300,'available'),
('jefferson-chalmers-test','Winter squash',0.5::numeric,'each',500,'coming_soon'),
('northwest-greens-test','Collard greens',16::numeric,'bunch',350,'available'),
('northwest-greens-test','Cabbage',9::numeric,'each',400,'available'),
('riverbend-roots-test','Tomatoes',14::numeric,'pound',375,'available'),
('riverbend-roots-test','Sweet potatoes',22::numeric,'pound',300,'available')
) as v(slug,item_name,quantity,unit,price_cents,status)
join public.farms f on f.slug=v.slug
where not exists(select 1 from public.inventory_items i where i.farm_id=f.id and i.item_name=v.item_name);

insert into public.community_events (farm_id,publisher_type,organization_name,event_type,title,description,starts_at,address,is_free,is_published)
select f.id,'farm',f.name,'Farm learning','Fall harvest open house','Meet a Detroit grower and learn how seasonal produce moves from plot to market.',now()+interval '10 days',f.base_address||', Detroit, MI',true,true
from public.farms f where f.slug='qs-stall'
and not exists(select 1 from public.community_events where title='Fall harvest open house');

insert into public.community_events (publisher_type,organization_name,event_type,title,description,starts_at,address,is_free,is_published)
select 'partner','Detroit Community Health Partner · Demo','Health screening','Neighborhood wellness and produce pickup','A demonstration verified-partner listing for a free screening and fresh-produce pickup.',now()+interval '14 days','Detroit, MI',true,true
where not exists(select 1 from public.community_events where title='Neighborhood wellness and produce pickup');
