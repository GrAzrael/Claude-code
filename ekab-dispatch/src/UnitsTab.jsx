import { Ambulance, Radio, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UNIT_STATUSES } from './data/units'

const STATUS_CLASSES = {
  emerald: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  amber: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  red: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  sky: { badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
}

function StatusBadge({ status }) {
  const meta = UNIT_STATUSES[status]
  const classes = STATUS_CLASSES[meta.color]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {meta.label}
    </span>
  )
}

export default function UnitsTab({ units }) {
  const [filter, setFilter] = useState('all')

  const counts = useMemo(() => {
    const base = { all: units.length }
    for (const key of Object.keys(UNIT_STATUSES)) {
      base[key] = units.filter((u) => u.status === key).length
    }
    return base
  }, [units])

  const visibleUnits = filter === 'all' ? units : units.filter((u) => u.status === filter)

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
            filter === 'all'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Όλες ({counts.all})
        </button>
        {Object.entries(UNIT_STATUSES).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              filter === key
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {meta.label} ({counts[key]})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleUnits.map((unit) => (
          <div key={unit.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Ambulance size={18} className="text-red-600" />
                {unit.id}
              </div>
              <StatusBadge status={unit.status} />
            </div>
            <p className="text-sm text-slate-500 mb-3">{unit.vehicleType}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
              <Radio size={14} />
              Βάση: {unit.base}
            </div>
            <div className="flex items-start gap-1.5 text-xs text-slate-500">
              <Users size={14} className="mt-0.5 shrink-0" />
              {unit.crew.join(', ')}
            </div>
          </div>
        ))}
        {visibleUnits.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-400 py-8">
            Δεν υπάρχουν μονάδες σε αυτή την κατάσταση.
          </p>
        )}
      </div>
    </div>
  )
}
