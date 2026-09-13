import { useState } from "react";
import type { Hub } from "../api";
import { api } from "../api";

export function OptimizePanel({ hubs, onOptimized }: { hubs: Hub[]; onOptimized: () => void }) {
  const [hubId, setHubId] = useState(hubs[0]?.id ?? "");
  const [routeDate, setRouteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleOptimize() {
    if (!hubId) {
      setResult("Select a hub first.");
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const res = await api.optimize({ hub_id: hubId, route_date: routeDate });
      setResult(
        `Created ${res.route_ids.length} route(s), ${res.assigned_order_count} order(s) assigned` +
          (res.unassigned_order_ids.length > 0 ? `, ${res.unassigned_order_ids.length} unassigned` : "")
      );
      onOptimized();
    } catch (err) {
      setResult(`Optimize failed: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="panel">
      <h2>Optimize routes</h2>
      <label>
        Hub
        <select value={hubId} onChange={(e) => setHubId(e.target.value)}>
          {hubs.map((hub) => (
            <option key={hub.id} value={hub.id}>
              {hub.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Route date
        <input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} />
      </label>
      <button onClick={handleOptimize} disabled={running || hubs.length === 0}>
        {running ? "Optimizing..." : "Run VRP solver"}
      </button>
      {hubs.length === 0 && <p className="hint">No hubs yet — create one first.</p>}
      {result && <p>{result}</p>}
    </div>
  );
}
