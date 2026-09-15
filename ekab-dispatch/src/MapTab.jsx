import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { UNIT_STATUSES } from './data/units'

const STATUS_HEX = {
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  sky: '#0ea5e9',
}

function unitIcon(status) {
  const color = STATUS_HEX[UNIT_STATUSES[status].color]
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export default function MapTab({ units }) {
  const center = [37.9755, 23.7348]

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-b border-slate-200 text-xs text-slate-600">
        <span className="font-medium text-slate-500">Υπόμνημα:</span>
        {Object.entries(UNIT_STATUSES).map(([key, meta]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full border border-white shadow"
              style={{ background: STATUS_HEX[meta.color] }}
            />
            {meta.label}
          </span>
        ))}
      </div>
      <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: '560px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {units.map((unit) => (
          <Marker key={unit.id} position={[unit.lat, unit.lng]} icon={unitIcon(unit.status)}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{unit.id}</p>
                <p>{unit.vehicleType}</p>
                <p className="text-slate-500">{UNIT_STATUSES[unit.status].label}</p>
                <p className="text-slate-500">Βάση: {unit.base}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
