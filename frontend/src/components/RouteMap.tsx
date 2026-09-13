import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Hub, RouteRecord } from "../api";

// react-leaflet's bundled marker icon paths break under Vite's asset
// pipeline unless re-pointed at the bundled image URLs explicitly.
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const ROUTE_COLORS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c"];

export function RouteMap({ hubs, routes }: { hubs: Hub[]; routes: RouteRecord[] }) {
  const activeHub = hubs.find((h) => h.lat != null && h.lng != null);
  const center: [number, number] = activeHub ? [activeHub.lat as number, activeHub.lng as number] : [37.9838, 23.7275];

  return (
    <div className="panel map-panel">
      <h2>Routes on map</h2>
      <MapContainer center={center} zoom={11} style={{ height: "480px", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hubs
          .filter((h) => h.lat != null && h.lng != null)
          .map((hub) => (
            <Marker key={hub.id} position={[hub.lat as number, hub.lng as number]}>
              <Popup>Hub: {hub.name}</Popup>
            </Marker>
          ))}
        {routes.map((route, index) => {
          const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
          const positions = route.stops
            .filter((s) => s.lat != null && s.lng != null)
            .sort((a, b) => a.sequence_number - b.sequence_number)
            .map((s) => [s.lat as number, s.lng as number] as [number, number]);

          if (activeHub) {
            positions.unshift([activeHub.lat as number, activeHub.lng as number]);
          }

          return (
            <div key={route.id}>
              <Polyline positions={positions} pathOptions={{ color }} />
              {route.stops.map((stop) =>
                stop.lat != null && stop.lng != null ? (
                  <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                    <Popup>
                      {route.vehicles?.plate_number ?? route.vehicle_id} — stop #{stop.sequence_number}
                      <br />
                      ETA: {stop.planned_arrival_time ?? "—"}
                    </Popup>
                  </Marker>
                ) : null
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
