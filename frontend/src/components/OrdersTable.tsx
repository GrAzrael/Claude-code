import type { OrderRecord } from "../api";

export function OrdersTable({ orders }: { orders: OrderRecord[] }) {
  return (
    <div className="panel">
      <h2>Orders ({orders.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Dropoff</th>
            <th>Recipient</th>
            <th>Volume</th>
            <th>Weight</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.dropoff_address ?? "—"}</td>
              <td>{order.recipient_name ?? "—"}</td>
              <td>{order.package_volume_m3 ?? "—"}</td>
              <td>{order.package_weight_kg ?? "—"}</td>
              <td>{order.status}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={5}>No orders yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
