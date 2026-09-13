export interface Hub {
  id: string;
  tenant_id: string;
  name: string;
  hub_type: string;
  address: string | null;
  location: string | null;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  home_hub_id: string | null;
  plate_number: string;
  vehicle_type: string;
  has_ramp: boolean;
  capacity_volume_m3: number | null;
  capacity_weight_kg: number | null;
  status: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  order_type: string;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  package_volume_m3: number | null;
  package_weight_kg: number | null;
  preferred_window_start: string | null;
  preferred_window_end: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  special_notes: string | null;
  total_service_time_min: number;
  status: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Payload sent to the Python/FastAPI VRP solver.
export interface SolveRequest {
  hub: { id: string; location: GeoPoint };
  route_date: string; // YYYY-MM-DD
  vehicles: Array<{
    id: string;
    capacity_volume_m3: number | null;
    capacity_weight_kg: number | null;
  }>;
  orders: Array<{
    id: string;
    location: GeoPoint;
    volume_m3: number | null;
    weight_kg: number | null;
    service_time_min: number;
    window_start: string | null;
    window_end: string | null;
  }>;
}

// Response returned by the VRP solver.
export interface SolveResponse {
  solver_version: string;
  routes: Array<{
    vehicle_id: string;
    total_distance_km: number;
    total_duration_min: number;
    stops: Array<{
      order_id: string;
      sequence_number: number;
      planned_arrival_time: string | null;
      location: GeoPoint;
      service_time_min: number;
    }>;
  }>;
  unassigned_order_ids: string[];
}
