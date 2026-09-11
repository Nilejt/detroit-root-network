-- Detroit Root Network — Migration 003
-- Regions, automatic stock state, and representative T1/T2 test records.

alter table public.farms add column if not exists region text;
alter table public.farms drop constraint if exists farms_region_check;
alter table public.farms add constraint farms_region_check check (
  region is null or region in ('Downtown','Midtown','North End/New Center','West','Southwest','East')
);

create or replace function public.normalize_inventory_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.quantity = 0 and new.stock_status <> 'coming_soon'::public.stock_status then
    new.stock_status = 'sold_out'::public.stock_status;
  elsif new.quantity > 0 and new.stock_status = 'sold_out'::public.stock_status then
    new.stock_status = 'available'::public.stock_status;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_normalize_status on public.inventory_items;
create trigger inventory_normalize_status before insert or update of quantity, stock_status
on public.inventory_items for each row execute function public.normalize_inventory_status();

-- Establish the project creator as the platform owner after their first sign-in.
update public.profiles set role = 'owner'::public.app_role where lower(email) = 'nilejt@gmail.com';

insert into public.farms (id,name,slug,blurb,region,base_address,base_city,base_state,test_tier,is_published,payment_methods,is_accepting_volunteers)
values
('10000000-0000-4000-8000-000000000001','Q''s Stall','qs-stall','Fresh neighborhood produce, grown with care and shared with clarity.','Downtown','2934 Russell St','Detroit','MI','T1',true,array['Cash','Card'],true),
('10000000-0000-4000-8000-000000000002','Oakland Avenue Farm','oakland-avenue-farm','Seasonal Detroit-grown produce and community food programs.','North End/New Center','9227 Goodwin St','Detroit','MI','T1',true,array['Cash','SNAP'],true),
('10000000-0000-4000-8000-000000000003','Keep Growing Detroit','keep-growing-detroit','Locally grown produce supporting a stronger food-sovereign Detroit.','East','1445 Adelaide St','Detroit','MI','T1',true,array['Cash','Card','SNAP'],true),
('10000000-0000-4000-8000-000000000004','North End Test Grower','north-end-test-grower','Small-batch greens and herbs grown for nearby neighbors.','North End/New Center','8900 Oakland St','Detroit','MI','T1',true,array['Cash'],false),
('10000000-0000-4000-8000-000000000005','Southwest Harvest Test Farm','southwest-harvest-test','Seasonal vegetables available at neighborhood pop-ups.','Southwest','2826 Bagley St','Detroit','MI','T1',true,array['Cash','Card'],true),
('20000000-0000-4000-8000-000000000001','D-Town Farm Test Record','d-town-test','Community-rooted growing represented here as isolated test data.','West','14027 Outer Dr W','Detroit','MI','T2',true,array['Cash'],false),
('20000000-0000-4000-8000-000000000002','Georgia Street Test Record','georgia-street-test','Community-grown food represented here as isolated test data.','East','8902 Vinton Ave','Detroit','MI','T2',true,array['Cash'],false),
('20000000-0000-4000-8000-000000000003','Midtown Market Garden Test','midtown-market-test','A clearly labeled test vendor for interface review.','Midtown','4500 Cass Ave','Detroit','MI','T2',true,array['Cash'],false),
('20000000-0000-4000-8000-000000000004','Eastside Roots Test Stall','eastside-roots-test','A clearly labeled test stall with representative inventory.','East','14800 Mack Ave','Detroit','MI','T2',true,array['Cash','Card'],false),
('20000000-0000-4000-8000-000000000005','Westside Produce Test Stall','westside-produce-test','A clearly labeled test stall for mobile and filter testing.','West','18400 Grand River Ave','Detroit','MI','T2',true,array['Cash'],false)
on conflict (slug) do update set
  name=excluded.name, blurb=excluded.blurb, region=excluded.region,
  base_address=excluded.base_address, test_tier=excluded.test_tier,
  is_published=excluded.is_published, payment_methods=excluded.payment_methods;

insert into public.selling_locations (farm_id,location_name,address,city,state,opens_at,closes_at,is_active,is_visible,address_validated,validation_source)
select f.id, v.location_name, f.base_address, 'Detroit', 'MI', v.opens_at::time, v.closes_at::time, true, true, true, 'seeded_test_data'
from (values
('qs-stall','Eastern Market','09:00','14:00'),('oakland-avenue-farm','North End farm stand','10:00','15:00'),
('keep-growing-detroit','Grown in Detroit market','11:00','16:00'),('north-end-test-grower','Oakland Avenue pop-up','10:00','14:00'),
('southwest-harvest-test','Bagley community pop-up','12:00','17:00'),('d-town-test','Rouge Park test location','10:00','14:00'),
('georgia-street-test','Georgia Street test location','12:00','16:00'),('midtown-market-test','Cass Corridor test market','11:00','15:00'),
('eastside-roots-test','Mack Avenue test pop-up','09:00','13:00'),('westside-produce-test','Grand River test stand','10:00','15:00')
) as v(slug,location_name,opens_at,closes_at)
join public.farms f on f.slug=v.slug
where not exists (select 1 from public.selling_locations s where s.farm_id=f.id);

insert into public.inventory_items (farm_id,item_name,quantity,unit,price_cents,stock_status,is_visible)
select f.id,v.item_name,v.quantity,v.unit,v.price_cents,v.status::public.stock_status,true
from (values
('qs-stall','Collard greens',18::numeric,'bunch',400,'available'),('qs-stall','Cherry tomatoes',7::numeric,'pint',500,'low_stock'),
('oakland-avenue-farm','Kale',24::numeric,'bunch',350,'available'),('keep-growing-detroit','Sweet peppers',12::numeric,'basket',600,'available'),
('north-end-test-grower','Herbs',15::numeric,'bundle',300,'available'),('southwest-harvest-test','Tomatoes',20::numeric,'pound',350,'available'),
('d-town-test','Summer squash',0::numeric,'each',250,'coming_soon'),('georgia-street-test','Basil',10::numeric,'bundle',250,'available'),
('midtown-market-test','Salad mix',8::numeric,'bag',550,'low_stock'),('eastside-roots-test','Okra',14::numeric,'pound',450,'available'),
('westside-produce-test','Sweet potatoes',25::numeric,'pound',300,'available')
) as v(slug,item_name,quantity,unit,price_cents,status)
join public.farms f on f.slug=v.slug
where not exists (select 1 from public.inventory_items i where i.farm_id=f.id and i.item_name=v.item_name);

insert into public.volunteer_opportunities (farm_id,title,description,opportunity_date,volunteers_needed,is_open,is_visible)
select id,'Saturday harvest help','Help wash, bundle, and prepare produce for market.',current_date+7,4,true,true
from public.farms where slug='qs-stall'
and not exists (select 1 from public.volunteer_opportunities v where v.farm_id=farms.id and v.title='Saturday harvest help');
