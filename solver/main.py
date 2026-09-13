import os
from datetime import date, datetime

from fastapi import FastAPI, HTTPException

from models import GeoPoint, SolveRequest, SolveResponse, RouteOut, RouteStopOut
from osrm_client import OsrmError, get_distance_duration_matrix
from vrp import VrpInput, solve_vrp, DEFAULT_DEPOT_WINDOW

SOLVER_VERSION = "or-tools-thin-slice-v1"
SOLVER_TIME_LIMIT_SECONDS = int(os.environ.get("SOLVER_TIME_LIMIT_SECONDS", "10"))

# Greece standard offset used to render planned_arrival_time. Ignores DST
# (EEST is +03:00 in summer) — fine for a thin slice, revisit before
# relying on this for real scheduling.
GREECE_UTC_OFFSET = "+02:00"

app = FastAPI(title="TMS Thin Slice VRP Solver")


@app.get("/health")
def health():
    return {"status": "ok"}


def _minutes_since_midnight(iso_timestamp: str) -> int:
    parsed = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
    return parsed.hour * 60 + parsed.minute


def _minutes_to_iso(route_date: str, minutes: int) -> str:
    minutes = max(0, min(minutes, 24 * 60 - 1))
    hh, mm = divmod(minutes, 60)
    return f"{route_date}T{hh:02d}:{mm:02d}:00{GREECE_UTC_OFFSET}"


@app.post("/solve", response_model=SolveResponse)
async def solve(request: SolveRequest) -> SolveResponse:
    if not request.orders:
        raise HTTPException(422, "No orders to optimize")
    if not request.vehicles:
        raise HTTPException(422, "No vehicles available")

    route_date = request.route_date or date.today().isoformat()

    points: list[GeoPoint] = [request.hub.location] + [o.location for o in request.orders]

    try:
        distance_matrix, duration_matrix = await get_distance_duration_matrix(points)
    except OsrmError as err:
        raise HTTPException(502, f"OSRM error: {err}") from err

    demands_volume = [0.0] + [o.volume_m3 or 0.0 for o in request.orders]
    demands_weight = [0.0] + [o.weight_kg or 0.0 for o in request.orders]
    service_times = [0] + [o.service_time_min for o in request.orders]

    time_windows: list[tuple[int, int]] = [DEFAULT_DEPOT_WINDOW]
    for order in request.orders:
        start = _minutes_since_midnight(order.window_start) if order.window_start else DEFAULT_DEPOT_WINDOW[0]
        end = _minutes_since_midnight(order.window_end) if order.window_end else DEFAULT_DEPOT_WINDOW[1]
        if end <= start:
            end = DEFAULT_DEPOT_WINDOW[1]
        time_windows.append((start, end))

    vrp_input = VrpInput(
        distance_matrix_m=distance_matrix,
        duration_matrix_s=duration_matrix,
        demands_volume_m3=demands_volume,
        demands_weight_kg=demands_weight,
        service_times_min=service_times,
        time_windows_min=time_windows,
        vehicle_capacity_volume_m3=[v.capacity_volume_m3 for v in request.vehicles],
        vehicle_capacity_weight_kg=[v.capacity_weight_kg for v in request.vehicles],
    )

    try:
        solution = solve_vrp(vrp_input, time_limit_seconds=SOLVER_TIME_LIMIT_SECONDS)
    except RuntimeError as err:
        raise HTTPException(422, str(err)) from err

    routes_out: list[RouteOut] = []
    for route in solution.routes:
        stops_out: list[RouteStopOut] = []
        for seq, (node, arrival) in enumerate(zip(route.node_sequence, route.arrival_min), start=1):
            order = request.orders[node - 1]  # node 0 is the depot
            stops_out.append(
                RouteStopOut(
                    order_id=order.id,
                    sequence_number=seq,
                    planned_arrival_time=_minutes_to_iso(route_date, arrival),
                    location=order.location,
                    service_time_min=order.service_time_min,
                )
            )
        routes_out.append(
            RouteOut(
                vehicle_id=request.vehicles[route.vehicle_index].id,
                total_distance_km=round(route.total_distance_m / 1000.0, 2),
                total_duration_min=route.total_duration_min,
                stops=stops_out,
            )
        )

    unassigned_order_ids = [request.orders[node - 1].id for node in solution.unassigned_nodes]

    return SolveResponse(
        solver_version=SOLVER_VERSION,
        routes=routes_out,
        unassigned_order_ids=unassigned_order_ids,
    )
