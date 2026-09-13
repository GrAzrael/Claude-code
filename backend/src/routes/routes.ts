import { Router } from "express";
import { z } from "zod";
import { supabase } from "../services/supabase.js";
import { solveRoutes } from "../services/solverClient.js";
import { config } from "../config.js";
import type { SolveRequest } from "../types/index.js";

export const routesRouter = Router();

const optimizeSchema = z.object({
  hub_id: z.string().uuid(),
  route_date: z.string().min(1), // YYYY-MM-DD
  order_ids: z.array(z.string().uuid()).optional(),
});

routesRouter.post("/optimize", async (req, res) => {
  const parsed = optimizeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { hub_id, route_date, order_ids } = parsed.data;

  const { data: hub, error: hubError } = await supabase
    .from("hubs_view")
    .select("*")
    .eq("id", hub_id)
    .eq("tenant_id", config.defaultTenantId)
    .single();
  if (hubError || !hub) {
    return res.status(404).json({ error: `Hub not found: ${hub_id}` });
  }
  if (hub.lat == null || hub.lng == null) {
    return res.status(422).json({ error: "Hub has no geocoded location" });
  }

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("tenant_id", config.defaultTenantId)
    .eq("status", "active");
  if (vehiclesError) return res.status(500).json({ error: vehiclesError.message });
  if (!vehicles || vehicles.length === 0) {
    return res.status(422).json({ error: "No active vehicles available" });
  }

  let orderQuery = supabase
    .from("orders_view")
    .select("*")
    .eq("tenant_id", config.defaultTenantId)
    .eq("status", "pending");
  if (order_ids && order_ids.length > 0) {
    orderQuery = orderQuery.in("id", order_ids);
  }
  const { data: orders, error: ordersError } = await orderQuery;
  if (ordersError) return res.status(500).json({ error: ordersError.message });
  if (!orders || orders.length === 0) {
    return res.status(422).json({ error: "No pending orders to optimize" });
  }

  const geocodedOrders = orders.filter((o) => o.dropoff_lat != null && o.dropoff_lng != null);
  const skippedOrders = orders.filter((o) => o.dropoff_lat == null || o.dropoff_lng == null);

  const solveRequest: SolveRequest = {
    hub: { id: hub.id, location: { lat: hub.lat, lng: hub.lng } },
    route_date,
    vehicles: vehicles.map((v) => ({
      id: v.id,
      capacity_volume_m3: v.capacity_volume_m3,
      capacity_weight_kg: v.capacity_weight_kg,
    })),
    orders: geocodedOrders.map((o) => ({
      id: o.id,
      location: { lat: o.dropoff_lat as number, lng: o.dropoff_lng as number },
      volume_m3: o.package_volume_m3,
      weight_kg: o.package_weight_kg,
      service_time_min: o.total_service_time_min,
      window_start: o.preferred_window_start,
      window_end: o.preferred_window_end,
    })),
  };

  let solution;
  try {
    solution = await solveRoutes(solveRequest);
  } catch (err) {
    return res.status(502).json({ error: `Solver call failed: ${(err as Error).message}` });
  }

  const createdRouteIds: string[] = [];

  for (const route of solution.routes) {
    if (route.stops.length === 0) continue;

    const { data: routeRow, error: routeError } = await supabase
      .from("routes")
      .insert({
        tenant_id: config.defaultTenantId,
        vehicle_id: route.vehicle_id,
        hub_id: hub.id,
        route_date,
        solver_version: solution.solver_version,
        total_distance_km: route.total_distance_km,
        total_duration_min: route.total_duration_min,
        optimized_stops_count: route.stops.length,
      })
      .select("id")
      .single();

    if (routeError || !routeRow) {
      return res.status(500).json({ error: routeError?.message ?? "Failed to create route" });
    }
    createdRouteIds.push(routeRow.id);

    for (const stop of route.stops) {
      const { error: stopError } = await supabase.rpc("create_route_stop", {
        p_tenant_id: config.defaultTenantId,
        p_route_id: routeRow.id,
        p_order_id: stop.order_id,
        p_sequence_number: stop.sequence_number,
        p_stop_type: "delivery",
        p_planned_arrival_time: stop.planned_arrival_time,
        p_lat: stop.location.lat,
        p_lng: stop.location.lng,
        p_service_time_min: stop.service_time_min,
      });
      if (stopError) {
        return res.status(500).json({ error: stopError.message });
      }

      await supabase.from("orders").update({ status: "assigned" }).eq("id", stop.order_id);
    }
  }

  res.status(201).json({
    route_ids: createdRouteIds,
    assigned_order_count: solveRequest.orders.length - solution.unassigned_order_ids.length,
    unassigned_order_ids: solution.unassigned_order_ids,
    skipped_ungeocoded_order_ids: skippedOrders.map((o) => o.id),
  });
});

routesRouter.get("/", async (req, res) => {
  const routeDate = typeof req.query.date === "string" ? req.query.date : undefined;

  let routeQuery = supabase
    .from("routes")
    .select("*, vehicles(plate_number, vehicle_type)")
    .eq("tenant_id", config.defaultTenantId)
    .order("created_at", { ascending: false });
  if (routeDate) routeQuery = routeQuery.eq("route_date", routeDate);

  const { data: routes, error: routesError } = await routeQuery;
  if (routesError) return res.status(500).json({ error: routesError.message });
  if (!routes || routes.length === 0) return res.json([]);

  const routeIds = routes.map((r) => r.id);
  const { data: stops, error: stopsError } = await supabase
    .from("route_stops_view")
    .select("*")
    .in("route_id", routeIds)
    .order("sequence_number", { ascending: true });
  if (stopsError) return res.status(500).json({ error: stopsError.message });

  const stopsByRoute = new Map<string, typeof stops>();
  for (const stop of stops ?? []) {
    const list = stopsByRoute.get(stop.route_id) ?? [];
    list.push(stop);
    stopsByRoute.set(stop.route_id, list);
  }

  res.json(
    routes.map((route) => ({
      ...route,
      stops: stopsByRoute.get(route.id) ?? [],
    }))
  );
});
