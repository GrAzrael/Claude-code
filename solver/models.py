from typing import Optional

from pydantic import BaseModel


class GeoPoint(BaseModel):
    lat: float
    lng: float


class HubIn(BaseModel):
    id: str
    location: GeoPoint


class VehicleIn(BaseModel):
    id: str
    capacity_volume_m3: Optional[float] = None
    capacity_weight_kg: Optional[float] = None


class OrderIn(BaseModel):
    id: str
    location: GeoPoint
    volume_m3: Optional[float] = None
    weight_kg: Optional[float] = None
    service_time_min: int = 0
    window_start: Optional[str] = None  # ISO timestamp
    window_end: Optional[str] = None  # ISO timestamp


class SolveRequest(BaseModel):
    hub: HubIn
    vehicles: list[VehicleIn]
    orders: list[OrderIn]
    route_date: Optional[str] = None  # YYYY-MM-DD, used to render planned_arrival_time


class RouteStopOut(BaseModel):
    order_id: str
    sequence_number: int
    planned_arrival_time: Optional[str]
    location: GeoPoint
    service_time_min: int


class RouteOut(BaseModel):
    vehicle_id: str
    total_distance_km: float
    total_duration_min: int
    stops: list[RouteStopOut]


class SolveResponse(BaseModel):
    solver_version: str
    routes: list[RouteOut]
    unassigned_order_ids: list[str]
