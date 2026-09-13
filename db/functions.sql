-- =====================================================================
-- THIN SLICE HELPER FUNCTIONS & VIEWS
-- =====================================================================
-- PostgREST (Supabase's REST layer) can't serialize PostGIS geography
-- columns as plain JSON lat/lng, and geography columns don't accept
-- lat/lng pairs directly over REST inserts. These views/functions give
-- the backend a plain-numbers interface so the app layer never has to
-- deal with WKB/EWKT directly. Run this after schema.sql.
-- =====================================================================

create or replace function make_point(lng double precision, lat double precision)
returns geography language sql immutable as $$
  select case when lng is null or lat is null then null
    else st_setsrid(st_makepoint(lng, lat), 4326)::geography end;
$$;

-- ---------------------------------------------------------------------
-- Read views: expose lat/lng instead of raw geography
-- ---------------------------------------------------------------------
create or replace view hubs_view as
  select id, tenant_id, name, hub_type, address, is_active, created_at,
         st_y(location::geometry) as lat,
         st_x(location::geometry) as lng
  from hubs;

create or replace view orders_view as
  select id, tenant_id, order_type, requires_recycling, requires_installation,
         pickup_address,
         st_y(pickup_location::geometry) as pickup_lat,
         st_x(pickup_location::geometry) as pickup_lng,
         dropoff_address,
         st_y(dropoff_location::geometry) as dropoff_lat,
         st_x(dropoff_location::geometry) as dropoff_lng,
         package_volume_m3, package_weight_kg,
         preferred_window_start, preferred_window_end,
         recipient_name, recipient_phone, special_notes,
         base_service_time_min, additional_service_time_min, total_service_time_min,
         status, created_at, updated_at
  from orders;

create or replace view route_stops_view as
  select id, tenant_id, route_id, order_id, sequence_number, stop_type,
         planned_arrival_time, actual_arrival_time,
         st_y(location::geometry) as lat,
         st_x(location::geometry) as lng,
         service_time_min, status, created_at
  from route_stops;

-- ---------------------------------------------------------------------
-- Write helpers: create/update rows from plain lat/lng
-- ---------------------------------------------------------------------
create or replace function create_hub(
  p_tenant_id uuid, p_name text, p_hub_type text,
  p_address text, p_lat double precision, p_lng double precision
) returns uuid language plpgsql as $$
declare
  new_id uuid;
begin
  insert into hubs (tenant_id, name, hub_type, address, location)
  values (p_tenant_id, p_name, coalesce(p_hub_type, 'main_hub'), p_address, make_point(p_lng, p_lat))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function create_order(
  p_tenant_id uuid,
  p_order_type text,
  p_pickup_address text, p_pickup_lat double precision, p_pickup_lng double precision,
  p_dropoff_address text, p_dropoff_lat double precision, p_dropoff_lng double precision,
  p_package_volume_m3 numeric, p_package_weight_kg numeric,
  p_preferred_window_start timestamptz, p_preferred_window_end timestamptz,
  p_recipient_name text, p_recipient_phone text, p_special_notes text
) returns uuid language plpgsql as $$
declare
  new_id uuid;
begin
  insert into orders (
    tenant_id, order_type, pickup_address, pickup_location,
    dropoff_address, dropoff_location, package_volume_m3, package_weight_kg,
    preferred_window_start, preferred_window_end, recipient_name, recipient_phone, special_notes
  ) values (
    p_tenant_id, coalesce(p_order_type, 'delivery'), p_pickup_address, make_point(p_pickup_lng, p_pickup_lat),
    p_dropoff_address, make_point(p_dropoff_lng, p_dropoff_lat), p_package_volume_m3, p_package_weight_kg,
    p_preferred_window_start, p_preferred_window_end, p_recipient_name, p_recipient_phone, p_special_notes
  ) returning id into new_id;
  return new_id;
end;
$$;

create or replace function create_route_stop(
  p_tenant_id uuid, p_route_id uuid, p_order_id uuid, p_sequence_number integer,
  p_stop_type text, p_planned_arrival_time timestamptz,
  p_lat double precision, p_lng double precision, p_service_time_min integer
) returns uuid language plpgsql as $$
declare
  new_id uuid;
begin
  insert into route_stops (
    tenant_id, route_id, order_id, sequence_number, stop_type,
    planned_arrival_time, location, service_time_min
  ) values (
    p_tenant_id, p_route_id, p_order_id, p_sequence_number, coalesce(p_stop_type, 'delivery'),
    p_planned_arrival_time, make_point(p_lng, p_lat), p_service_time_min
  ) returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants: views and RPC functions aren't covered by whatever default-
-- privilege rule gives service_role access to plain tables, so they
-- need explicit grants or the backend gets "permission denied" even
-- though it's using the service_role key.
-- ---------------------------------------------------------------------
grant select on hubs_view to service_role;
grant select on orders_view to service_role;
grant select on route_stops_view to service_role;

grant execute on function make_point(double precision, double precision) to service_role;
grant execute on function create_hub(uuid, text, text, text, double precision, double precision) to service_role;
grant execute on function create_order(uuid, text, text, double precision, double precision, text, double precision, double precision, numeric, numeric, timestamptz, timestamptz, text, text, text) to service_role;
grant execute on function create_route_stop(uuid, uuid, uuid, integer, text, timestamptz, double precision, double precision, integer) to service_role;
