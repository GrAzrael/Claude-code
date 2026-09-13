import { useCallback, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { api } from "./api";
import type { Hub, OrderRecord, RouteRecord } from "./api";
import { OrderForm } from "./components/OrderForm";
import { CsvUpload } from "./components/CsvUpload";
import { OrdersTable } from "./components/OrdersTable";
import { OptimizePanel } from "./components/OptimizePanel";
import { RouteMap } from "./components/RouteMap";

export default function App() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      const [hubsData, ordersData, routesData] = await Promise.all([
        api.getHubs(),
        api.getOrders(),
        api.getRoutes(),
      ]);
      setHubs(hubsData);
      setOrders(ordersData);
      setRoutes(routesData);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="app">
      <header>
        <h1>TMS Thin Slice — Dispatcher</h1>
      </header>
      {loadError && <p className="error">Could not reach backend: {loadError}</p>}
      <div className="grid">
        <div className="column">
          <OrderForm onCreated={refreshAll} />
          <CsvUpload onUploaded={refreshAll} />
          <OptimizePanel hubs={hubs} onOptimized={refreshAll} />
          <OrdersTable orders={orders} />
        </div>
        <div className="column">
          <RouteMap hubs={hubs} routes={routes} />
        </div>
      </div>
    </div>
  );
}
