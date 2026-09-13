-- =====================================================================
-- TMS/WMS SAAS PLATFORM — THIN SLICE v1 SCHEMA
-- PostgreSQL 15+ / PostGIS / Supabase-compatible
-- =====================================================================
-- Subset of the full platform schema (tms_wms_schema_v1.sql), activated
-- for the MVP thin slice: order import -> VRP optimization -> map view.
--
-- Tables included: tenants, hubs, vehicles, orders, routes, route_stops.
-- Everything else in the full schema (subscriptions/billing, users/roles,
-- employees/shifts/payroll, contracts_3pl/billing_rules,
-- warehouse_storage, vehicle_sync_groups, driver app/PoD, live tracking)
-- is deliberately NOT created here — out of scope for this phase.
--
-- Multi-tenancy: tenant_id is present on every table (matching the full
-- schema) so this slice stays forward-compatible, but Row Level Security
-- is NOT enabled in this phase. The app assumes a single tenant row and
-- enforces nothing at the DB layer yet — do not enable RLS here without
-- discussing it first.
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "postgis";   -- geography/geometry types

-- =====================================================================
-- 1. TENANTS
-- =====================================================================
create table tenants (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null,
    legal_name          text,
    tax_id              text,
    tax_office          text,
    country             text not null default 'GR',
    city                text,
    address             text,
    timezone            text not null default 'Europe/Athens',
    status              text not null default 'trial'
                            check (status in ('trial','active','suspended','canceled')),
    home_hub_id         uuid,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table tenants is 'Single-row in this phase: one tenant per deployment, no multi-tenant app logic yet.';

-- =====================================================================
-- 2. HUBS (route starting points / depots)
-- =====================================================================
create table hubs (
    id                  uuid primary key default gen_random_uuid(),
    tenant_id           uuid not null references tenants(id) on delete cascade,
    name                text not null,
    hub_type            text not null default 'main_hub'
                            check (hub_type in ('main_hub','warehouse','depot','partner_hub')),
    address             text,
    location            geography(Point,4326),
    is_active           boolean not null default true,
    created_at          timestamptz not null default now()
);

-- No FK constraint on tenants.home_hub_id -> hubs.id: adding it in the same
-- transaction as CREATE TABLE hubs (which has a geography column) trips a
-- known PostGIS/Postgres interaction (error 55006, "pending trigger
-- events"). Not enforced at the DB level for this phase; unused by the app.

create index idx_hubs_tenant on hubs(tenant_id);
create index idx_hubs_location on hubs using gist(location);

-- =====================================================================
-- 3. VEHICLES
-- =====================================================================
create table vehicles (
    id                      uuid primary key default gen_random_uuid(),
    tenant_id               uuid not null references tenants(id) on delete cascade,
    home_hub_id             uuid references hubs(id),
    plate_number            text not null,
    vehicle_type            text not null
                                check (vehicle_type in ('van','truck_ramp','forklift_lift','truck_box','motorbike')),
    has_ramp                boolean not null default false,
    capacity_volume_m3      numeric(8,2),
    capacity_weight_kg      numeric(10,2),
    status                  text not null default 'active'
                                check (status in ('active','maintenance','retired')),
    current_odometer_km     numeric(10,1),
    created_at              timestamptz not null default now(),
    unique (tenant_id, plate_number)
);

create index idx_vehicles_tenant on vehicles(tenant_id);

-- =====================================================================
-- 4. ORDERS
-- =====================================================================
create table orders (
    id                              uuid primary key default gen_random_uuid(),
    tenant_id                       uuid not null references tenants(id) on delete cascade,
    order_type                      text not null default 'delivery'
                                        check (order_type in ('delivery','pickup','reverse_pickup')),
    requires_recycling              boolean not null default false,
    requires_installation           boolean not null default false,
    pickup_address                  text,
    pickup_location                 geography(Point,4326),
    dropoff_address                 text,
    dropoff_location                geography(Point,4326),
    package_volume_m3               numeric(8,3),
    package_weight_kg               numeric(8,2),
    preferred_window_start          timestamptz,
    preferred_window_end            timestamptz,
    recipient_name                  text,
    recipient_phone                 text,
    special_notes                   text,
    base_service_time_min           integer not null default 13,
    additional_service_time_min     integer not null default 0,
    total_service_time_min          integer generated always as
                                        (base_service_time_min + additional_service_time_min) stored,
    status                          text not null default 'pending'
                                        check (status in ('pending','assigned','in_route','delivered','failed','canceled')),
    created_at                      timestamptz not null default now(),
    updated_at                      timestamptz not null default now()
);

create index idx_orders_tenant on orders(tenant_id);
create index idx_orders_status on orders(tenant_id, status);
create index idx_orders_pickup_geo on orders using gist(pickup_location);
create index idx_orders_dropoff_geo on orders using gist(dropoff_location);

-- =====================================================================
-- 5. ROUTES & ROUTE STOPS (VRP solver output)
-- =====================================================================
create table routes (
    id                      uuid primary key default gen_random_uuid(),
    tenant_id               uuid not null references tenants(id) on delete cascade,
    vehicle_id              uuid not null references vehicles(id),
    hub_id                  uuid references hubs(id),
    route_date              date not null,
    solver_version          text,
    total_distance_km       numeric(8,2),
    total_duration_min      integer,
    optimized_stops_count   integer not null default 0,
    status                  text not null default 'planned'
                                check (status in ('planned','dispatched','in_progress','completed','canceled')),
    created_at              timestamptz not null default now()
);

create index idx_routes_tenant on routes(tenant_id);
create index idx_routes_vehicle_date on routes(vehicle_id, route_date);

create table route_stops (
    id                      uuid primary key default gen_random_uuid(),
    tenant_id               uuid not null references tenants(id) on delete cascade,
    route_id                uuid not null references routes(id) on delete cascade,
    order_id                uuid references orders(id),
    sequence_number         integer not null,
    stop_type               text not null default 'delivery'
                                check (stop_type in ('pickup','delivery','hub_return')),
    planned_arrival_time    timestamptz,
    actual_arrival_time     timestamptz,
    location                geography(Point,4326),
    service_time_min        integer,
    status                  text not null default 'pending'
                                check (status in ('pending','arrived','completed','failed','skipped')),
    created_at              timestamptz not null default now(),
    unique (route_id, sequence_number)
);

create index idx_route_stops_tenant on route_stops(tenant_id);
create index idx_route_stops_route on route_stops(route_id);
create index idx_route_stops_order on route_stops(order_id);
create index idx_route_stops_location on route_stops using gist(location);

-- =====================================================================
-- SEED: single tenant + hub so the thin slice has something to point at
-- =====================================================================
insert into tenants (id, name, city, address)
values ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'Athens', 'TBD')
on conflict (id) do nothing;

-- =====================================================================
-- END THIN SLICE SCHEMA
-- =====================================================================
