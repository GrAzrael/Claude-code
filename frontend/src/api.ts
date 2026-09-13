const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface Hub {
  id: string;
  name: string;
  hub_type: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  capacity_volume_m3: number | null;
  capacity_weight_kg: number | null;
  status: string;
}

export interface OrderRecord {
  id: string;
  order_type: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  package_volume_m3: number | null;
  package_weight_kg: number | null;
  recipient_name: string | null;
  status: string;
  created_at: string;
}

export interface RouteStop {
  id: string;
  order_id: string | null;
  sequence_number: number;
  lat: number | null;
  lng: number | null;
  planned_arrival_time: string | null;
  status: string;
}

export interface RouteRecord {
  id: string;
  vehicle_id: string;
  hub_id: string;
  route_date: string;
  total_distance_km: number | null;
  total_duration_min: number | null;
  optimized_stops_count: number;
  status: string;
  vehicles: { plate_number: string; vehicle_type: string } | null;
  stops: RouteStop[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(typeof body.error === "string" ? body.error : JSON.stringify(body.error ?? body));
  }
  return response.json() as Promise<T>;
}

export const api = {
  getHubs: () => request<Hub[]>("/api/hubs"),
  createHub: (input: { name: string; hub_type: string; address: string }) =>
    request<{ id: string }>("/api/hubs", { method: "POST", body: JSON.stringify(input) }),

  getVehicles: () => request<Vehicle[]>("/api/vehicles"),
  createVehicle: (input: {
    plate_number: string;
    vehicle_type: string;
    capacity_volume_m3?: number | null;
    capacity_weight_kg?: number | null;
  }) => request<{ id: string }>("/api/vehicles", { method: "POST", body: JSON.stringify(input) }),

  getOrders: (status?: string) =>
    request<OrderRecord[]>(`/api/orders${status ? `?status=${status}` : ""}`),
  createOrder: (input: Record<string, unknown>) =>
    request<{ id: string }>("/api/orders", { method: "POST", body: JSON.stringify(input) }),
  uploadOrdersCsv: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/api/orders/csv`, { method: "POST", body: formData });
    const body = await response.json();
    if (!response.ok && response.status !== 201) {
      throw new Error(typeof body.error === "string" ? body.error : JSON.stringify(body));
    }
    return body as { created_count: number; failed_count: number; failed: Array<{ row: number; error: string }> };
  },

  optimize: (input: { hub_id: string; route_date: string }) =>
    request<{
      route_ids: string[];
      assigned_order_count: number;
      unassigned_order_ids: string[];
      skipped_ungeocoded_order_ids: string[];
    }>("/api/routes/optimize", { method: "POST", body: JSON.stringify(input) }),

  getRoutes: (date?: string) => request<RouteRecord[]>(`/api/routes${date ? `?date=${date}` : ""}`),
};
